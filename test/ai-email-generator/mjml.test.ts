import { describe, expect, it, vi, beforeEach } from "vitest";

const { mjml2htmlMock } = vi.hoisted(() => ({
  mjml2htmlMock: vi.fn(),
}));

vi.mock("mjml", () => ({ default: mjml2htmlMock }));

vi.mock("@/lib/ai-email/sanitize", () => ({
  sanitizeCompiledHtml: (html: string) => html,
}));

import { compileMjmlSafe, compileMjml } from "@/lib/ai-email/mjml";

describe("compileMjmlSafe", () => {
  beforeEach(() => {
    mjml2htmlMock.mockReset();
  });

  it("returns html on success", async () => {
    mjml2htmlMock.mockResolvedValue({ html: "<html>ok</html>", errors: [] });
    const out = await compileMjmlSafe("<mjml><mj-body /></mjml>");
    expect(out.html).toContain("ok");
  });

  it("returns html:null with error when output empty", async () => {
    mjml2htmlMock.mockResolvedValue({ html: "   ", errors: [] });
    const out = await compileMjmlSafe("<mjml><mj-body /></mjml>");
    expect(out.html).toBe(null);
    expect((out as unknown as { error: string }).error).toMatch(/empty html/i);
  });

  it("returns html:null when mjml2html throws", async () => {
    mjml2htmlMock.mockRejectedValue(new Error("boom"));
    const out = await compileMjmlSafe("<mjml><mj-body /></mjml>");
    expect(out.html).toBe(null);
    expect((out as unknown as { error: string }).error).toMatch(/boom/i);
  });

  it("maps mjml errors into warnings", async () => {
    mjml2htmlMock.mockResolvedValue({
      html: "<html>ok</html>",
      errors: [{ formattedMessage: "warn1" }, { message: "warn2" }],
    });
    const out = await compileMjml("<mjml><mj-body /></mjml>");
    expect(out.warnings).toEqual(["warn1", "warn2"]);
  });
});

