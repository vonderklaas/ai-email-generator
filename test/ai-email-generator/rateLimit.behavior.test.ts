import { describe, expect, it, beforeEach, vi } from "vitest";
import { checkRateLimit, resetRateLimitForTests } from "@/lib/ai-email/rateLimit";

describe("rateLimit behavior", () => {
  beforeEach(() => {
    resetRateLimitForTests();
    vi.unstubAllEnvs();
  });

  it("allows in test mode (no blocking) and still returns remaining", () => {
    const out = checkRateLimit("generate", "203.0.113.1", new Date("2026-01-01T00:00:00Z"));
    expect(out.allowed).toBe(true);
    if (out.allowed) {
      expect(out.remaining.generatesToday).toBeGreaterThan(0);
    }
  });

  it("enforces generate hourly limit when not in test/dev", () => {
    // Force non-test behavior.
    vi.stubEnv("MODE", "production");
    const meta = import.meta as unknown as { env: Record<string, unknown> };
    meta.env.MODE = "production";
    meta.env.DEV = false;

    const now = new Date("2026-01-01T00:10:00Z");
    const ip = "203.0.113.5";

    expect(checkRateLimit("generate", ip, now).allowed).toBe(true);
    expect(checkRateLimit("generate", ip, now).allowed).toBe(true);
    expect(checkRateLimit("generate", ip, now).allowed).toBe(true);

    const blocked = checkRateLimit("generate", ip, now);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.type).toBe("hourly");
      expect(blocked.resetAt).toMatch(/Z$/);
    }
  });

  it("enforces generate daily limit and refine daily limit", () => {
    vi.stubEnv("MODE", "production");
    const meta = import.meta as unknown as { env: Record<string, unknown> };
    meta.env.MODE = "production";
    meta.env.DEV = false;

    const base = new Date("2026-01-01T00:10:00Z");
    const ip = "203.0.113.9";

    // generateDaily=5
    for (let i = 0; i < 5; i++) {
      const now = new Date(base.getTime() + i * 60 * 60 * 1000); // spread across hours to avoid hourly limiter
      expect(checkRateLimit("generate", ip, now).allowed).toBe(true);
    }
    const blockedDaily = checkRateLimit("generate", ip, new Date(base.getTime() + 6 * 60 * 60 * 1000));
    expect(blockedDaily.allowed).toBe(false);
    if (!blockedDaily.allowed) expect(blockedDaily.type).toBe("daily");

    // refineDaily=30 (fast-forward counter by calling 30 times)
    for (let i = 0; i < 30; i++) {
      expect(checkRateLimit("refine", ip, base).allowed).toBe(true);
    }
    const blockedRefine = checkRateLimit("refine", ip, base);
    expect(blockedRefine.allowed).toBe(false);
    if (!blockedRefine.allowed) expect(blockedRefine.type).toBe("daily");
  });
});

