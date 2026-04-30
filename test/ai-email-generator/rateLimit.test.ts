import { describe, expect, it } from "vitest";
import { getClientIp } from "@/lib/ai-email/rateLimit";

describe("getClientIp", () => {
  it("uses the first x-forwarded-for IP", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.1, 198.51.100.2" },
    });

    expect(getClientIp(request)).toBe("203.0.113.1");
  });

  it("falls back to x-real-ip", () => {
    const request = new Request("https://example.com", {
      headers: { "x-real-ip": "198.51.100.7" },
    });

    expect(getClientIp(request)).toBe("198.51.100.7");
  });

  it("returns unknown without headers", () => {
    expect(getClientIp(new Request("https://example.com"))).toBe("unknown");
  });
});
