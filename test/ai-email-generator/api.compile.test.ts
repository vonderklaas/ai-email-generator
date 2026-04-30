import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/ai-email/mjml", () => ({
  compileMjmlSafe: vi.fn(async () => ({ html: "<html>ok</html>", warnings: [] })),
}));

vi.mock("@/lib/ai-email/rateLimit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai-email/rateLimit")>("@/lib/ai-email/rateLimit");
  return {
    ...actual,
    getClientIp: vi.fn(() => "203.0.113.10"),
    checkRateLimit: vi.fn(() => ({ allowed: true, remaining: { generatesToday: 4, generatesThisHour: 2, refinesToday: 30 } })),
  };
});

import { POST } from "@/pages/api/ai-email-generator/compile";
import { checkRateLimit } from "@/lib/ai-email/rateLimit";
import { compileMjmlSafe } from "@/lib/ai-email/mjml";

function ctx(request: Request): Parameters<typeof POST>[0] {
  return { request } as unknown as Parameters<typeof POST>[0];
}

describe("/api/ai-email-generator/compile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 for invalid MJML", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mjml: "short" }),
    });
    const response = await POST(ctx(request));
    expect(response.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(checkRateLimit).mockReturnValueOnce({
      allowed: false,
      type: "daily",
      resetAt: new Date("2026-01-02T00:00:00Z").toISOString(),
      remaining: { generatesToday: 0, generatesThisHour: 0, refinesToday: 0 },
    });

    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mjml: "<mjml><mj-body /></mjml>" }),
    });
    const response = await POST(ctx(request));
    expect(response.status).toBe(429);
    const json = await response.json();
    expect(json.error).toBe("rate_limit_exceeded");
  });

  it("returns html and compileError if compilation fails", async () => {
    vi.mocked(compileMjmlSafe).mockResolvedValueOnce({ html: null, warnings: [], error: "bad" });

    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mjml: "<mjml><mj-body /></mjml>" }),
    });
    const response = await POST(ctx(request));
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.html).toBe(null);
    expect(json.compileError).toBe("bad");
  });

  it("returns html on success", async () => {
    vi.mocked(compileMjmlSafe).mockResolvedValueOnce({ html: "<html>ok</html>", warnings: [] });
    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mjml: "<mjml><mj-body /></mjml>" }),
    });
    const response = await POST(ctx(request));
    const json = await response.json();
    expect(json.html).toContain("ok");
  });
});

