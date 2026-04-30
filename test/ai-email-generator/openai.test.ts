import { describe, expect, it, vi, beforeEach } from "vitest";

const createMock = vi.fn();

vi.mock("openai", () => {
  return {
    default: class OpenAI {
      chat = { completions: { create: createMock } };
      constructor() {}
    },
  };
});

import { generateEmail } from "@/lib/ai-email/openai";
import { refineEmail } from "@/lib/ai-email/openai";

describe("openai wrapper", () => {
  beforeEach(() => {
    createMock.mockReset();
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_MODEL = "gpt-4o";
    process.env.OPENAI_MAX_TOKENS = "200";
    process.env.OPENAI_TEMPERATURE = "0.2";
  });

  it("parses structured JSON content", async () => {
    createMock.mockResolvedValue({
      choices: [
        {
          finish_reason: "stop",
          message: { content: JSON.stringify({ subject: "S", preheader: "P", mjml: "<mjml><mj-body /></mjml>" }) },
        },
      ],
    });

    const out = await generateEmail("prompt");
    expect(out.subject).toBe("S");
    expect(createMock).toHaveBeenCalled();
  });

  it("refines with structured JSON content", async () => {
    createMock.mockResolvedValue({
      choices: [
        {
          finish_reason: "stop",
          message: { content: JSON.stringify({ subject: "S", preheader: "P", mjml: "<mjml><mj-body /></mjml>" }) },
        },
      ],
    });

    const out = await refineEmail({
      originalPrompt: "orig",
      subject: "S",
      preheader: "P",
      mjml: "<mjml/>",
      instruction: "shorter",
    });
    expect(out.mjml).toContain("<mjml");
  });

  it("throws on finish_reason=length", async () => {
    createMock.mockResolvedValue({
      choices: [
        {
          finish_reason: "length",
          message: { content: JSON.stringify({ subject: "S", preheader: "P", mjml: "<mjml><mj-body /></mjml>" }) },
        },
      ],
    });

    await expect(generateEmail("prompt")).rejects.toThrow(/truncated/i);
  });

  it("retries once on truncation and succeeds", async () => {
    createMock
      .mockResolvedValueOnce({
        choices: [
          {
            finish_reason: "length",
            message: { content: JSON.stringify({ subject: "S", preheader: "P", mjml: "<mjml><mj-body /></mjml>" }) },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [
          {
            finish_reason: "stop",
            message: { content: JSON.stringify({ subject: "S2", preheader: "P2", mjml: "<mjml><mj-body /></mjml>" }) },
          },
        ],
      });

    const out = await generateEmail("prompt");
    expect(out.subject).toBe("S2");
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("throws when api key is missing", async () => {
    delete process.env.OPENAI_API_KEY;
    vi.resetModules();
    const { generateEmail: freshGenerateEmail } = await import("@/lib/ai-email/openai");
    await expect(freshGenerateEmail("prompt")).rejects.toThrow(/OPENAI_API_KEY/i);
  });

  it("throws first error when both attempts fail", async () => {
    createMock.mockRejectedValue(new Error("boom"));
    await expect(generateEmail("prompt")).rejects.toThrow("boom");
  });

  it("refineEmail retries once on truncation and succeeds", async () => {
    createMock
      .mockResolvedValueOnce({
        choices: [
          {
            finish_reason: "length",
            message: { content: JSON.stringify({ subject: "S", preheader: "P", mjml: "<mjml><mj-body /></mjml>" }) },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [
          {
            finish_reason: "stop",
            message: { content: JSON.stringify({ subject: "RS", preheader: "RP", mjml: "<mjml><mj-body /></mjml>" }) },
          },
        ],
      });

    const out = await refineEmail({
      originalPrompt: "orig",
      subject: "S",
      preheader: "P",
      mjml: "<mjml/>",
      instruction: "shorter",
    });
    expect(out.subject).toBe("RS");
  });

  it("uses default model and numeric fallbacks when env is missing/invalid", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    delete process.env.OPENAI_MODEL;
    process.env.OPENAI_MAX_TOKENS = "not-a-number";
    process.env.OPENAI_TEMPERATURE = "also-bad";

    vi.resetModules();
    createMock.mockReset();
    createMock.mockResolvedValue({
      choices: [
        {
          finish_reason: "stop",
          message: { content: JSON.stringify({ subject: "S", preheader: "P", mjml: "<mjml><mj-body /></mjml>" }) },
        },
      ],
    });

    const { generateEmail: freshGenerateEmail } = await import("@/lib/ai-email/openai");
    await freshGenerateEmail("prompt");

    const call = createMock.mock.calls[0]?.[0];
    expect(call.model).toBe("gpt-4o");
    expect(call.max_tokens).toBe(6000);
    expect(call.temperature).toBe(0.2);
  });

  it("throws when OpenAI returns empty content", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.resetModules();
    createMock.mockReset();
    createMock.mockResolvedValue({
      choices: [{ finish_reason: "stop", message: { content: null } }],
    });
    const { generateEmail: freshGenerateEmail } = await import("@/lib/ai-email/openai");
    await expect(freshGenerateEmail("prompt")).rejects.toThrow(/empty content/i);
  });
});

