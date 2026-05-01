import { describe, expect, it, vi, beforeEach } from "vitest";
import { extractSocialUrlsFromHtml, fetchSiteContext, normalizePublicUrl } from "@/lib/ai-email/siteContext";

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

  it("extracts social URLs from hrefs and JSON-LD sameAs", () => {
    const base = new URL("https://acme.test/");
    const html = `
      <a href="/pricing">Pricing</a>
      <a href="https://twitter.com/acmeco">X</a>
      <a href="https://github.com/acmeco/app">GitHub</a>
      <script type="application/ld+json">
        {"@context":"https://schema.org","sameAs":["https://www.linkedin.com/company/acme","https://twitter.com/acmeco"]}
      </script>
    `;
    expect(extractSocialUrlsFromHtml(html, base)).toEqual([
      "https://twitter.com/acmeco",
      "https://github.com/acmeco/app",
      "https://www.linkedin.com/company/acme",
    ]);
  });

  it("accepts YouTube channel, @handle, and watch URLs but not generic paths", () => {
    const base = new URL("https://example.com/");
    const html = `
      <a href="https://youtube.com/feed">feed</a>
      <a href="https://youtube.com/channel/UCabc123">ch</a>
      <a href="https://youtube.com/@MyBrand">h</a>
      <a href="https://youtube.com/watch?v=xyz">w</a>
    `;
    expect(extractSocialUrlsFromHtml(html, base)).toEqual([
      "https://youtube.com/channel/UCabc123",
      "https://youtube.com/@MyBrand",
      "https://youtube.com/watch?v=xyz",
    ]);
  });

  it("fetchSiteContext sets scrapedAccentHex when theme is white but brand colors repeat in HTML", async () => {
    const blueSpans = Array(15)
      .fill(null)
      .map(() => '<span style="color:#048CDD">x</span>')
      .join("");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => `<html><head>
            <meta name="theme-color" content="#ffffff"/>
            ${blueSpans}
          </head><body></body></html>`,
      }),
    );
    const context = await fetchSiteContext("https://acme.test");
    expect(context?.themeColor).toBe("#ffffff");
    expect(context?.scrapedAccentHex).toBe("#048CDD");
  });

  it("fetchSiteContext includes socialUrls when present in HTML", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          `<html><body><a href="https://x.com/acme_ai">Follow</a><a href="mailto:a@b.com">Email</a></body></html>`,
      }),
    );
    const context = await fetchSiteContext("https://acme.test");
    expect(context?.socialUrls).toEqual(["https://x.com/acme_ai"]);
  });
});

