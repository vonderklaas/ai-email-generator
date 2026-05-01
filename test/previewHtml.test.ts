import { describe, expect, it } from "vitest";
import { injectPreviewBaseTargetBlank } from "@/lib/previewHtml";

describe("injectPreviewBaseTargetBlank", () => {
  it("injects base after existing head", () => {
    const html = "<html><head><meta charset=\"utf-8\"/></head><body>x</body></html>";
    const out = injectPreviewBaseTargetBlank(html);
    expect(out).toContain("<head>");
    expect(out).toContain('<base target="_blank" rel="noopener noreferrer">');
    expect(out.indexOf("<head>")).toBeLessThan(out.indexOf("<base"));
  });

  it("inserts head after html when head is missing", () => {
    const html = "<html><body>ok</body></html>";
    const out = injectPreviewBaseTargetBlank(html);
    expect(out).toMatch(/<html[^>]*><head><base target="_blank"/);
  });

  it("wraps fragments without html tag", () => {
    expect(injectPreviewBaseTargetBlank("<p>hi</p>")).toContain("<base target=\"_blank\"");
  });
});
