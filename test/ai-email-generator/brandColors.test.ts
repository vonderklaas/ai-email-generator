import { describe, expect, it } from "vitest";
import {
  applyResolvedCtaColorToMjml,
  coercePrimaryCtaIfIllegible,
  isTooLightForWhiteButton,
  parseHexColor,
  pickDominantBrandHexFromHtml,
  relativeLuminance,
  resolveCtaBackgroundColor,
} from "@/lib/ai-email/brandColors";

describe("brandColors", () => {
  it("resolveCtaBackgroundColor falls back to black when missing or too light", () => {
    expect(resolveCtaBackgroundColor(undefined)).toBe("#000000");
    expect(resolveCtaBackgroundColor("")).toBe("#000000");
    expect(resolveCtaBackgroundColor("#FFFFFF")).toBe("#000000");
    expect(resolveCtaBackgroundColor("#fff")).toBe("#000000");
    expect(resolveCtaBackgroundColor("not-a-hex")).toBe("#000000");
  });

  it("resolveCtaBackgroundColor uses scraped accent when meta theme is white", () => {
    expect(resolveCtaBackgroundColor("#ffffff", "#048CDD")).toBe("#048CDD");
    expect(resolveCtaBackgroundColor("#FFFFFF", "#048cdd")).toBe("#048CDD");
  });

  it("resolveCtaBackgroundColor ignores scraped accent when it is too light", () => {
    expect(resolveCtaBackgroundColor("#ffffff", "#F5FBFF")).toBe("#000000");
  });

  it("resolveCtaBackgroundColor prefers usable meta over scraped", () => {
    expect(resolveCtaBackgroundColor("#2563EB", "#048CDD")).toBe("#2563EB");
  });

  it("resolveCtaBackgroundColor keeps sufficiently dark colors", () => {
    expect(resolveCtaBackgroundColor("#123456")).toBe("#123456");
    expect(resolveCtaBackgroundColor("#2563EB")).toBe("#2563EB");
  });

  it("pickDominantBrandHexFromHtml picks saturated brand blue over navy when both repeat", () => {
    const html = `
      <style>.x{color:#ffffff}</style>
      ${Array(20).fill("color:#243B4A").join(";")}
      ${Array(12).fill("fill:#048CDD").join(" ")}
      ${Array(12).fill("border-color:#048CDD").join(" ")}
    `;
    expect(pickDominantBrandHexFromHtml(html)).toBe("#048CDD");
  });

  it("pickDominantBrandHexFromHtml tie-breaks equal chroma by occurrence count", () => {
    const html = `${Array(12).fill("a:#FF0000").join(" ")} ${Array(10).fill("b:#00FF00").join(" ")}`;
    expect(pickDominantBrandHexFromHtml(html)).toBe("#FF0000");
  });

  it("pickDominantBrandHexFromHtml uses muted navy when no vibrant candidate", () => {
    const html = Array(25).fill("color:#243B4A").join(" ");
    expect(pickDominantBrandHexFromHtml(html)).toBe("#243B4A");
  });

  it("pickDominantBrandHexFromHtml returns top hex when counts are too low for filters", () => {
    expect(pickDominantBrandHexFromHtml("#243B4A")).toBe("#243B4A");
  });

  it("pickDominantBrandHexFromHtml returns undefined when no usable hex", () => {
    expect(pickDominantBrandHexFromHtml('<meta content="#ffffff"/>')).toBeUndefined();
  });

  it("parseHexColor and luminance behave for edge hexes", () => {
    expect(parseHexColor("#f00")).toEqual([255, 0, 0]);
    expect(parseHexColor("#00FF00")).toEqual([0, 255, 0]);
    expect(relativeLuminance([255, 255, 255])).toBeGreaterThan(0.9);
    expect(isTooLightForWhiteButton([255, 255, 255])).toBe(true);
    expect(isTooLightForWhiteButton([37, 99, 235])).toBe(false);
  });

  it("applyResolvedCtaColorToMjml sets first mj-button background", () => {
    const mjml =
      '<mjml><mj-body><mj-button background-color="#ffffff" href="https://x.com">Go</mj-button></mj-body></mjml>';
    expect(applyResolvedCtaColorToMjml(mjml, "#2563EB")).toContain('background-color="#2563EB"');
  });

  it("applyResolvedCtaColorToMjml inserts background when missing", () => {
    const mjml = '<mjml><mj-body><mj-button href="https://x.com">Go</mj-button></mj-body></mjml>';
    expect(applyResolvedCtaColorToMjml(mjml, "#111111")).toContain('background-color="#111111"');
  });

  it("coercePrimaryCtaIfIllegible inserts black when background-color is missing", () => {
    const mjml = '<mjml><mj-body><mj-button href="https://x.com">Go</mj-button></mj-body></mjml>';
    expect(coercePrimaryCtaIfIllegible(mjml)).toContain('background-color="#000000"');
  });

  it("coercePrimaryCtaIfIllegible replaces white with black", () => {
    const mjml =
      '<mjml><mj-body><mj-button background-color="#ffffff" href="https://x.com">Go</mj-button></mj-body></mjml>';
    expect(coercePrimaryCtaIfIllegible(mjml)).toContain('background-color="#000000"');
  });

  it("coercePrimaryCtaIfIllegible leaves dark buttons unchanged", () => {
    const mjml =
      '<mjml><mj-body><mj-button background-color="#2563EB" href="https://x.com">Go</mj-button></mj-body></mjml>';
    expect(coercePrimaryCtaIfIllegible(mjml)).toContain('background-color="#2563EB"');
  });
});
