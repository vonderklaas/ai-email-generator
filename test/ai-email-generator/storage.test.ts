import { describe, expect, it } from "vitest";
import { clearDraft, DRAFT_STORAGE_KEY, ensureSchemaVersion, persistDraft, restoreDraft } from "@/components/react/ai-email/storage";

describe("draft storage", () => {
  it("persists and restores a valid draft", () => {
    persistDraft({
      prompt: "Welcome email for a SaaS product",
      companyUrl: "https://example.com",
      logoUrl: "https://example.com/logo.png",
      originalPrompt: "Welcome email for a SaaS product",
      currentEmail: {
        subject: "Welcome aboard",
        preheader: "Invite your team to get started.",
        mjml: "<mjml><mj-body><mj-section><mj-column><mj-text>Hello</mj-text></mj-column></mj-section></mj-body></mjml>",
        html: "<html><body>Hello</body></html>".repeat(5),
      },
      messages: [],
    });

    const restored = restoreDraft();
    expect(restored?.currentEmail?.subject).toBe("Welcome aboard");
    expect(restored?.companyUrl).toBe("https://example.com");
  });

  it("clears malformed draft data", () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, "{bad json");

    expect(restoreDraft()).toBeNull();
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });

  it("clears wrong schema versions", () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ version: 0 }));

    ensureSchemaVersion();

    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });

  it("clears draft on demand", () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, "draft");
    clearDraft();
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });
});
