import { describe, expect, it } from "vitest";
import { aiEmailReducer, initialState } from "@/components/react/ai-email/state";

describe("aiEmailReducer", () => {
  it("sets prompt", () => {
    const next = aiEmailReducer(initialState, { type: "setPrompt", prompt: "hello world" });
    expect(next.prompt).toBe("hello world");
  });

  it("sets company and logo URLs", () => {
    const withCompany = aiEmailReducer(initialState, { type: "setCompanyUrl", companyUrl: "https://acme.test" });
    const withLogo = aiEmailReducer(withCompany, { type: "setLogoUrl", logoUrl: "https://acme.test/logo.png" });
    expect(withLogo.companyUrl).toBe("https://acme.test");
    expect(withLogo.logoUrl).toBe("https://acme.test/logo.png");
  });

  it("transitions through generate success and seeds assistant message", () => {
    const started = aiEmailReducer(initialState, { type: "startGenerate" });
    expect(started.generating).toBe(true);

    const success = aiEmailReducer(started, {
      type: "generateSuccess",
      originalPrompt: "prompt",
      email: { subject: "S", preheader: "P", mjml: "<mjml/>", html: "<html/>" },
      rateLimit: null,
    });
    expect(success.generating).toBe(false);
    expect(success.currentEmail?.subject).toBe("S");
    expect(success.messages.length).toBeGreaterThan(0);
    expect(success.messages[0]?.role).toBe("assistant");
  });

  it("handles refine progress and success", () => {
    const base = {
      ...initialState,
      currentEmail: { subject: "S", preheader: "P", mjml: "<mjml/>", html: "<html/>" },
      messages: [],
    };

    const userMessage = {
      id: "u1",
      role: "user" as const,
      content: "Make it shorter",
      createdAt: new Date().toISOString(),
      status: "complete" as const,
    };
    const assistantMessage = {
      id: "a1",
      role: "assistant" as const,
      content: "",
      createdAt: new Date().toISOString(),
      status: "streaming" as const,
    };

    const started = aiEmailReducer(base, { type: "startRefine", userMessage, assistantMessage });
    expect(started.refining).toBe(true);
    expect(started.messages).toHaveLength(2);

    const progress = aiEmailReducer(started, { type: "refineProgress", assistantId: "a1", content: "Working..." });
    expect(progress.messages.find((m) => m.id === "a1")?.status).toBe("streaming");

    const done = aiEmailReducer(progress, {
      type: "refineSuccess",
      assistantId: "a1",
      content: "Done",
      email: { subject: "S2", preheader: "P2", mjml: "<mjml/>", html: "<html/>" },
      rateLimit: null,
    });
    expect(done.refining).toBe(false);
    expect(done.currentEmail?.subject).toBe("S2");
    expect(done.messages.find((m) => m.id === "a1")?.status).toBe("complete");
  });

  it("handles resetAll", () => {
    const base = { ...initialState, prompt: "x", currentEmail: { subject: "S", preheader: "P", mjml: "m", html: null } };
    const next = aiEmailReducer(base, { type: "resetAll" });
    expect(next).toEqual(initialState);
  });

  it("covers restore, preview mode, chat reset, and errors", () => {
    const restored = aiEmailReducer(initialState, {
      type: "restore",
      payload: {
        ...initialState,
        prompt: "p",
        currentEmail: { subject: "S", preheader: "P", mjml: "<mjml/>", html: null },
        messages: [
          { id: "1", role: "user", content: "Hi", createdAt: new Date().toISOString(), status: "complete" },
        ],
      },
    });
    expect(restored.prompt).toBe("p");

    const mode = aiEmailReducer(restored, { type: "setPreviewMode", previewMode: "mjml" });
    expect(mode.previewMode).toBe("mjml");

    const chatReset = aiEmailReducer(mode, { type: "resetChat" });
    expect(chatReset.messages).toHaveLength(0);

    const genErr = aiEmailReducer(chatReset, {
      type: "generateError",
      error: { title: "t", message: "m", retryable: true },
    });
    expect(genErr.error?.title).toBe("t");

    const refineErr = aiEmailReducer(
      { ...genErr, messages: [{ id: "a", role: "assistant", content: "x", createdAt: new Date().toISOString(), status: "streaming" }] },
      {
        type: "refineError",
        assistantId: "a",
        error: { title: "t2", message: "m2", retryable: true },
      },
    );
    expect(refineErr.messages[0]?.status).toBe("error");
  });

  it("covers rate limit actions and preview html update", () => {
    const blocked = aiEmailReducer(initialState, {
      type: "rateLimitBlocked",
      payload: { action: "generate", type: "hourly", resetAt: new Date().toISOString(), remaining: null },
    });
    expect(blocked.rateLimitBlock?.action).toBe("generate");

    const cleared = aiEmailReducer(blocked, { type: "clearRateLimit" });
    expect(cleared.rateLimitBlock).toBe(null);

    const withEmail = { ...initialState, currentEmail: { subject: "S", preheader: "P", mjml: "<mjml/>", html: null } };
    const updated = aiEmailReducer(withEmail, { type: "updateEmailHtml", html: "<html/>" });
    expect(updated.currentEmail?.html).toBe("<html/>");
  });
});

