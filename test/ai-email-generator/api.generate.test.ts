import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/ai-email/openai", () => ({
  generateEmail: vi.fn(async () => ({
    subject: "Welcome",
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

import { POST } from "@/pages/api/ai-email-generator/generate";
import { checkRateLimit } from "@/lib/ai-email/rateLimit";
import { generateEmail } from "@/lib/ai-email/openai";
import { compileMjmlSafe } from "@/lib/ai-email/mjml";

function ctx(request: Request): Parameters<typeof POST>[0] {
  return { request } as unknown as Parameters<typeof POST>[0];
}

describe("/api/ai-email-generator/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid prompt", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "short" }),
    });

    const response = await POST(ctx(request));
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("invalid_request");
  });

  it("returns 200 with subject/preheader/mjml/html", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "Welcome email for a SaaS product." }),
    });

    const response = await POST(ctx(request));
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.subject).toBe("Welcome");
    expect(json.html).toContain("<html>");
  });

  it("applies resolved CTA color to MJML before compile", async () => {
    vi.mocked(generateEmail).mockResolvedValueOnce({
      subject: "Welcome",
      preheader: "Preheader",
      mjml:
        '<mjml><mj-body><mj-section><mj-column><mj-button background-color="#ffffff" color="#FFFFFF" href="https://example.com">Go</mj-button></mj-column></mj-section></mj-body></mjml>',
    });

    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "Welcome email for a SaaS product." }),
    });

    await POST(ctx(request));
    const passedMjml = vi.mocked(compileMjmlSafe).mock.calls.at(-1)?.[0] as string;
    expect(passedMjml).toContain('background-color="#000000"');
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(checkRateLimit).mockReturnValueOnce({
      allowed: false,
      type: "hourly",
      resetAt: new Date("2026-01-01T01:00:00Z").toISOString(),
      remaining: { generatesToday: 0, generatesThisHour: 0, refinesToday: 30 },
    });

    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "Welcome email for a SaaS product." }),
    });

    const response = await POST(ctx(request));
    expect(response.status).toBe(429);
    const json = await response.json();
    expect(json.error).toBe("rate_limit_exceeded");
  });

  it("returns 503 when OpenAI key is missing", async () => {
    vi.mocked(generateEmail).mockImplementationOnce(async () => {
      throw new Error("Missing OPENAI_API_KEY");
    });

    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "Welcome email for a SaaS product." }),
    });

    const response = await POST(ctx(request));
    expect(response.status).toBe(503);
    const json = await response.json();
    expect(json.error).toBe("upstream_unavailable");
  });

  it("returns 503 on DNS ENOTFOUND connection error", async () => {
    vi.mocked(generateEmail).mockImplementationOnce(async () => {
      throw new Error("Connection error", { cause: new Error("getaddrinfo ENOTFOUND api.openai.com") });
    });

    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "Welcome email for a SaaS product." }),
    });

    const response = await POST(ctx(request));
    expect(response.status).toBe(503);
  });

  it("returns 500 on generic generation failure", async () => {
    vi.mocked(generateEmail).mockImplementationOnce(async () => {
      throw new Error("boom");
    });

    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "Welcome email for a SaaS product." }),
    });

    const response = await POST(ctx(request));
    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toBe("generation_failed");
  });

  it("returns html:null and compileError when MJML compile fails", async () => {
    vi.mocked(compileMjmlSafe).mockResolvedValueOnce({ html: null, warnings: [], error: "bad mjml" });
    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "Welcome email for a SaaS product." }),
    });

    const response = await POST(ctx(request));
    const json = await response.json();
    expect(json.html).toBe(null);
    expect(json.compileError).toBe("bad mjml");
  });
});

