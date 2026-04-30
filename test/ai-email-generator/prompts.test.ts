import { describe, expect, it } from "vitest";
import { generationUserPrompt, refinementUserPrompt, SYSTEM_PROMPT, SYSTEM_PROMPT_VERSION } from "@/lib/ai-email/prompts";

describe("prompts", () => {
  it("generationUserPrompt includes brief", () => {
    expect(generationUserPrompt("hello")).toContain("hello");
  });

  it("refinementUserPrompt includes fields", () => {
    const out = refinementUserPrompt({
      originalPrompt: "orig",
      subject: "S",
      preheader: "P",
      mjml: "<mjml/>",
      instruction: "shorter",
    });
    expect(out).toContain("orig");
    expect(out).toContain("shorter");
  });

  it("exports system prompt metadata", () => {
    expect(SYSTEM_PROMPT_VERSION).toMatch(/ai-email-system-prompt/i);
    expect(SYSTEM_PROMPT).toContain("MJML");
  });
});

