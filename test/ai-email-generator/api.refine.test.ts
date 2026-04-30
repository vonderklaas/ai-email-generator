import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/ai-email/openai", () => ({
  refineEmail: vi.fn(async () => ({
    subject: "Updated",
    preheader: "Preheader",
    mjml: "<mjml><mj-body /></mjml>",
  })),
}));

vi.mock("@/lib/ai-email/mjml", () => ({
  compileMjmlSafe: vi.fn(async () => ({
    html: "<html><body>ok</body></html>",
    warnings: [],
  })),
}));

vi.mock("@/lib/ai-email/rateLimit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai-email/rateLimit")>("@/lib/ai-email/rateLimit");
  return {
    ...actual,
    getClientIp: vi.fn(() => "203.0.113.10"),
    checkRateLimit: vi.fn(() => ({ allowed: true, remaining: { generatesToday: 4, generatesThisHour: 2, refinesToday: 30 } })),
  };
});

import { POST } from "@/pages/api/ai-email-generator/refine";
import { checkRateLimit } from "@/lib/ai-email/rateLimit";
import { refineEmail } from "@/lib/ai-email/openai";
import { compileMjmlSafe } from "@/lib/ai-email/mjml";

function ctx(request: Request): Parameters<typeof POST>[0] {
  return { request } as unknown as Parameters<typeof POST>[0];
}

async function readAllText(body: ReadableStream<Uint8Array> | null) {
  if (!body) return "";
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let out = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  return out;
}

describe("/api/ai-email-generator/refine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 invalid_request (SSE)", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nope: true }),
    });
    const response = await POST(ctx(request));
    expect(response.status).toBe(400);
    const text = await readAllText(response.body);
    expect(text).toContain("event: error");
    expect(text).toContain("invalid_request");
  });

  it("returns 429 rate_limit_exceeded (SSE)", async () => {
    vi.mocked(checkRateLimit).mockReturnValueOnce({
      allowed: false,
      type: "daily",
      resetAt: new Date("2026-01-02T00:00:00Z").toISOString(),
      remaining: { generatesToday: 5, generatesThisHour: 3, refinesToday: 0 },
    });

    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        originalPrompt: "Welcome email for SaaS",
        currentEmail: { subject: "S", preheader: "P", mjml: "<mjml><mj-body /></mjml>" },
        messages: [],
        newMessage: "Make it shorter",
      }),
    });

    const response = await POST(ctx(request));
    expect(response.status).toBe(429);
    const text = await readAllText(response.body);
    expect(text).toContain("rate_limit_exceeded");
    expect(text).toContain("event: error");
  });

  it("streams started/progress/complete", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        originalPrompt: "Welcome email for SaaS",
        currentEmail: { subject: "S", preheader: "P", mjml: "<mjml><mj-body /></mjml>" },
        messages: [],
        newMessage: "Make it shorter",
      }),
    });

    const response = await POST(ctx(request));
    expect(response.status).toBe(200);
    const text = await readAllText(response.body);
    expect(text).toContain("event: started");
    expect(text).toContain("event: complete");
    expect(text).toContain("\"subject\":\"Updated\"");
  });

  it("includes compileError in complete payload when compile fails", async () => {
    vi.mocked(compileMjmlSafe).mockResolvedValueOnce({ html: null, warnings: [], error: "bad mjml" });
    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        originalPrompt: "Welcome email for SaaS",
        currentEmail: { subject: "S", preheader: "P", mjml: "<mjml><mj-body /></mjml>" },
        messages: [],
        newMessage: "Make it shorter",
      }),
    });

    const response = await POST(ctx(request));
    const text = await readAllText(response.body);
    expect(text).toContain("compileError");
  });

  it("streams error when upstream fails", async () => {
    vi.mocked(refineEmail).mockImplementationOnce(async () => {
      throw new Error("Connection error");
    });

    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        originalPrompt: "Welcome email for SaaS",
        currentEmail: { subject: "S", preheader: "P", mjml: "<mjml><mj-body /></mjml>" },
        messages: [],
        newMessage: "Make it shorter",
      }),
    });

    const response = await POST(ctx(request));
    expect(response.status).toBe(200);
    const text = await readAllText(response.body);
    expect(text).toContain("event: error");
  });

  it("streams error with DNS message when cause is ENOTFOUND", async () => {
    vi.mocked(refineEmail).mockImplementationOnce(async () => {
      throw new Error("boom", { cause: new Error("getaddrinfo ENOTFOUND api.openai.com") });
    });

    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        originalPrompt: "Welcome email for SaaS",
        currentEmail: { subject: "S", preheader: "P", mjml: "<mjml><mj-body /></mjml>" },
        messages: [],
        newMessage: "Make it shorter",
      }),
    });

    const response = await POST(ctx(request));
    const text = await readAllText(response.body);
    expect(text).toContain("network/DNS");
  });
});

