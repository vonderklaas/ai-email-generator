import { describe, expect, it, vi, beforeEach } from "vitest";
import { fetchSiteContext, normalizePublicUrl } from "@/lib/ai-email/siteContext";

describe("siteContext", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects private and invalid URLs", () => {
    expect(normalizePublicUrl("http://localhost:4321")).toBe(null);
    expect(normalizePublicUrl("http://192.168.1.1")).toBe(null);
    expect(normalizePublicUrl("not a url")).toBe(null);
    expect(normalizePublicUrl("ftp://example.com")).toBe(null);
    expect(normalizePublicUrl("https://example.com")?.href).toBe("https://example.com/");
  });

  it("fetches title, description, theme color, and image", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => `
          <html>
            <head>
              <title>Fallback Title</title>
              <meta property="og:title" content="Acme AI">
              <meta name="description" content="AI ops for founders">
              <meta name="theme-color" content="#123456">
              <meta property="og:image" content="/og.png">
            </head>
          </html>
        `,
      }),
    );

    const context = await fetchSiteContext("https://acme.test");
    expect(context?.title).toBe("Acme AI");
    expect(context?.description).toBe("AI ops for founders");
    expect(context?.themeColor).toBe("#123456");
    expect(context?.ogImage).toBe("https://acme.test/og.png");
  });

  it("falls back to URL only when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("blocked")));
    await expect(fetchSiteContext("https://acme.test")).resolves.toEqual({ url: "https://acme.test/" });
  });

  it("returns null for invalid URL and URL only for non-ok response", async () => {
    await expect(fetchSiteContext("http://localhost")).resolves.toBe(null);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    await expect(fetchSiteContext("https://acme.test")).resolves.toEqual({ url: "https://acme.test/" });
  });
});

