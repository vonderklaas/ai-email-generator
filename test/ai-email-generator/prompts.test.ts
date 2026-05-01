import { describe, expect, it } from "vitest";
import { generationUserPrompt, refinementUserPrompt, SYSTEM_PROMPT, SYSTEM_PROMPT_VERSION } from "@/lib/ai-email/prompts";

describe("prompts", () => {
  it("generationUserPrompt includes brief, current year, and resolved CTA color", () => {
    const out = generationUserPrompt("hello");
    expect(out).toContain("hello");
    expect(out).toContain(`Current calendar year for the copyright line: ${new Date().getFullYear()}`);
    expect(out).toContain("Primary CTA button background-color MUST be exactly this hex");
    expect(out).toContain("#000000");
  });

  it("generationUserPrompt includes brand context when provided", () => {
    const out = generationUserPrompt("hello", {
      companyUrl: "https://acme.test",
      logoUrl: "https://acme.test/logo.png",
      title: "Acme",
      description: "Better onboarding",
      themeColor: "#123456",
    });

    expect(out).toContain("Company website: https://acme.test");
    expect(out).toContain("Company logo URL: https://acme.test/logo.png");
    expect(out).toContain("Brand/theme color (meta): #123456");
    expect(out).toContain("#123456");
  });

  it("generationUserPrompt uses explicit ctaBackgroundColor when set", () => {
    const out = generationUserPrompt("hi", { ctaBackgroundColor: "#FF6600", themeColor: "#FFFFFF" });
    expect(out).toContain(
      "Primary CTA button background-color MUST be exactly this hex on mj-button (replace {{accent_color}} with it): #FF6600",
    );
  });

  it("generationUserPrompt lists social URLs when provided", () => {
    const out = generationUserPrompt("brief", {
      socialUrls: ["https://twitter.com/acme", "https://github.com/acme"],
    });
    expect(out).toContain("Social/profile links");
    expect(out).toContain("https://twitter.com/acme");
    expect(out).toContain("https://github.com/acme");
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
    expect(SYSTEM_PROMPT).toContain("mj-spacer");
    expect(SYSTEM_PROMPT).toContain("All rights reserved");
    expect(SYSTEM_PROMPT).not.toContain("<mj-divider border-color=\"#E2E8F0\" />");
    expect(SYSTEM_PROMPT).toContain('align="center"');
    expect(SYSTEM_PROMPT).not.toContain("You are receiving this email because you have a relationship");
  });
});

