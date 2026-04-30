import { describe, expect, it } from "vitest";
import { repairMjml } from "@/lib/ai-email/mjmlRepair";

describe("repairMjml", () => {
  it("strips markdown fences", () => {
    const input = "```mjml\n<mjml><mj-body></mj-body></mjml>\n```";
    const out = repairMjml(input);
    expect(out.mjml).toContain("<mjml>");
    expect(out.mjml).not.toContain("```");
    expect(out.repaired).toBe(true);
  });

  it("repairs dangling and unquoted href", () => {
    const input = `<mjml><mj-body><mj-button href=>Click</mj-button><mj-button href=https://a.com>Go</mj-button></mj-body></mjml>`;
    const out = repairMjml(input);
    expect(out.mjml).toContain('href="https://example.com"');
    expect(out.mjml).toContain('href="https://a.com"');
  });

  it("adds missing mj-body and closing tags", () => {
    const input = "<mjml><mj-section><mj-column><mj-text>Hello";
    const out = repairMjml(input);
    expect(out.mjml).toContain("<mj-body>");
    expect(out.mjml).toContain("</mjml>");
    // best-effort closure for truncation
    expect(out.mjml).toContain("</mj-text>");
  });
});

