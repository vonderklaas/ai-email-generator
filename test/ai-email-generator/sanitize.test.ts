import { describe, expect, it } from "vitest";
import { sanitizeCompiledHtml } from "@/lib/ai-email/sanitize";

describe("sanitizeCompiledHtml", () => {
  it("removes script tags, iframe tags, event handlers, and javascript URLs", () => {
    const html = `<div onclick="alert(1)"><a href="javascript:alert(1)">Click</a><script>alert(1)</script><iframe src="x"></iframe><form><input /></form></div>`;

    const sanitized = sanitizeCompiledHtml(html);

    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("<iframe");
    expect(sanitized).not.toContain("<form");
    expect(sanitized).not.toContain("onclick");
    expect(sanitized).not.toContain("javascript:");
  });
});
