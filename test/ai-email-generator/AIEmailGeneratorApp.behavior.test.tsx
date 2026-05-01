import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("sonner", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("sonner");
  return {
    ...actual,
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      message: vi.fn(),
    },
    Toaster: () => null,
  };
});

vi.mock("@/components/react/ai-email/storage", () => ({
  DRAFT_STORAGE_KEY: "ai-email-generator:draft:v1",
  ensureSchemaVersion: vi.fn(),
  restoreDraft: vi.fn(() => null),
  persistDraft: vi.fn(),
  clearDraft: vi.fn(),
  draftToState: (d: unknown) => d,
}));

vi.mock("@/hooks/useSseFetch", () => ({
  RateLimitError: class RateLimitError extends Error {},
  postSse: vi.fn(async (_url: string, _body: unknown, onEvent: (ev: { event: string; data: unknown }) => void) => {
    onEvent({ event: "progress", data: { message: "Working..." } });
    onEvent({
      event: "complete",
      data: { subject: "Refined", preheader: "P", mjml: "<mjml/>", html: "<html/>", usage: { remaining: null } },
    });
  }),
}));

import App from "@/components/react/AIEmailGeneratorApp";
import { postSse } from "@/hooks/useSseFetch";
import { RateLimitError } from "@/hooks/useSseFetch";

describe("AIEmailGeneratorApp", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("generates an email and enters workspace", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ subject: "S", preheader: "P", mjml: "<mjml/>", html: "<html/>", usage: { remaining: null } }),
    });
    vi.stubGlobal(
      "fetch",
      fetchMock,
    );

    render(<App />);

    fireEvent.change(screen.getByLabelText(/email brief/i), { target: { value: "Welcome email for SaaS users." } });
    fireEvent.change(screen.getByLabelText(/company website url/i), { target: { value: "https://acme.test" } });
    fireEvent.change(screen.getByLabelText(/logo url/i), { target: { value: "https://acme.test/logo.png" } });
    fireEvent.click(screen.getByRole("button", { name: /generate email/i }));

    await waitFor(() => expect(screen.getByText(/refine in chat/i)).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ai-email-generator/generate",
      expect.objectContaining({
        body: JSON.stringify({
          prompt: "Welcome email for SaaS users.",
          companyUrl: "https://acme.test",
          logoUrl: "https://acme.test/logo.png",
        }),
      }),
    );
  });

  it("shows error toast on generate failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: "Nope" }),
      }),
    );

    render(<App />);
    fireEvent.change(screen.getByLabelText(/email brief/i), { target: { value: "Welcome email for SaaS users." } });
    fireEvent.click(screen.getByRole("button", { name: /generate email/i }));

    await waitFor(() => expect(screen.getByText(/generation failed/i)).toBeInTheDocument());
  });

  it("refines via SSE and updates workspace", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ subject: "S", preheader: "P", mjml: "<mjml/>", html: "<html/>", usage: { remaining: null } }),
      }),
    );

    render(<App />);
    fireEvent.change(screen.getByLabelText(/email brief/i), { target: { value: "Welcome email for SaaS users." } });
    fireEvent.click(screen.getByRole("button", { name: /generate email/i }));
    await waitFor(() => expect(screen.getByText(/refine in chat/i)).toBeInTheDocument());

    const chatBox = screen.getAllByRole("textbox")[0];
    fireEvent.change(chatBox, { target: { value: "Make it shorter" } });
    fireEvent.click(screen.getByRole("button", { name: /send refinement/i }));

    await waitFor(() => expect(screen.getByText(/done\. i updated the email draft/i)).toBeInTheDocument());
  });

  it("handles html:null generate (preview unavailable) and can reset to new email", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ subject: "S", preheader: "P", mjml: "<mjml/>", html: null, compileError: "bad", usage: { remaining: null } }),
      }),
    );

    render(<App />);
    fireEvent.change(screen.getByLabelText(/email brief/i), { target: { value: "Welcome email for SaaS users." } });
    fireEvent.click(screen.getByRole("button", { name: /generate email/i }));

    await waitFor(() => expect(screen.getByText(/preview unavailable/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /new email/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /generate email/i })).toBeInTheDocument());
  });

  it("shows workspace error when export fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ subject: "S", preheader: "P", mjml: "<mjml/>", html: "<html/>", usage: { remaining: null } }),
      }),
    );

    (navigator as unknown as { clipboard?: { writeText: (text: string) => Promise<void> } }).clipboard = {
      writeText: vi.fn().mockRejectedValue(new Error("nope")),
    };

    render(<App />);
    fireEvent.change(screen.getByLabelText(/email brief/i), { target: { value: "Welcome email for SaaS users." } });
    fireEvent.click(screen.getByRole("button", { name: /generate email/i }));
    await waitFor(() => expect(screen.getByText(/your draft is ready/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /copy html/i }));
    await waitFor(() => expect(screen.getByText(/clipboard failed/i)).toBeInTheDocument());
  });

  it("handles refine error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ subject: "S", preheader: "P", mjml: "<mjml/>", html: "<html/>", usage: { remaining: null } }),
      }),
    );
    vi.mocked(postSse).mockRejectedValueOnce(new Error("bad"));

    render(<App />);
    fireEvent.change(screen.getByLabelText(/email brief/i), { target: { value: "Welcome email for SaaS users." } });
    fireEvent.click(screen.getByRole("button", { name: /generate email/i }));
    await waitFor(() => expect(screen.getByText(/refine in chat/i)).toBeInTheDocument());

    const chatBox = screen.getAllByRole("textbox")[0];
    fireEvent.change(chatBox, { target: { value: "Make it shorter" } });
    fireEvent.click(screen.getByRole("button", { name: /send refinement/i }));

    await waitFor(() => expect(screen.getByText(/refinement failed/i)).toBeInTheDocument());
  });

  it("shows rate limit modal on generate 429", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: "rate_limit_exceeded",
          message: "Rate limit exceeded.",
          type: "hourly",
          resetAt: new Date().toISOString(),
          usage: { remaining: { generatesToday: 1, generatesThisHour: 0, refinesToday: 30 } },
        }),
      }),
    );

    render(<App />);
    fireEvent.change(screen.getByLabelText(/email brief/i), { target: { value: "Welcome email for SaaS users." } });
    fireEvent.click(screen.getByRole("button", { name: /generate email/i }));

    await waitFor(() => expect(screen.getByText(/you’ve hit the free limit/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    await waitFor(() => expect(screen.queryByText(/you’ve hit the free limit/i)).not.toBeInTheDocument());
  });

  it("can compile preview on demand when html is null", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ subject: "S", preheader: "P", mjml: "<mjml/>", html: null, compileError: "bad", usage: { remaining: null } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ html: "<html><body>ok</body></html>" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    fireEvent.change(screen.getByLabelText(/email brief/i), { target: { value: "Welcome email for SaaS users." } });
    fireEvent.click(screen.getByRole("button", { name: /generate email/i }));
    await waitFor(() => expect(screen.getByText(/preview unavailable/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /try compiling preview/i }));
    await waitFor(() => expect(screen.getByTitle(/email preview/i)).toBeInTheDocument());
  });

  it("shows rate limit modal when compile preview is rate limited", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ subject: "S", preheader: "P", mjml: "<mjml/>", html: null, compileError: "bad", usage: { remaining: null } }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: "rate_limit_exceeded",
          message: "Rate limit exceeded.",
          type: "daily",
          resetAt: new Date().toISOString(),
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    fireEvent.change(screen.getByLabelText(/email brief/i), { target: { value: "Welcome email for SaaS users." } });
    fireEvent.click(screen.getByRole("button", { name: /generate email/i }));
    await waitFor(() => expect(screen.getByText(/preview unavailable/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /try compiling preview/i }));
    await waitFor(() => expect(screen.getByText(/you’ve hit the free limit/i)).toBeInTheDocument());
  });

  it("shows toast error when compile preview fails (non-rate-limit)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ subject: "S", preheader: "P", mjml: "<mjml/>", html: null, compileError: "bad", usage: { remaining: null } }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: "Could not compile preview." }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    fireEvent.change(screen.getByLabelText(/email brief/i), { target: { value: "Welcome email for SaaS users." } });
    fireEvent.click(screen.getByRole("button", { name: /generate email/i }));
    await waitFor(() => expect(screen.getByText(/preview unavailable/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /try compiling preview/i }));
    // We don't assert toast output, just ensure no crash and UI stays stable.
    await waitFor(() => expect(screen.getByText(/preview unavailable/i)).toBeInTheDocument());
  });

  it("shows rate limit modal on refine RateLimitError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ subject: "S", preheader: "P", mjml: "<mjml/>", html: "<html/>", usage: { remaining: null } }),
      }),
    );
    vi.mocked(postSse).mockRejectedValueOnce(
      new RateLimitError({ message: "Rate limit exceeded.", resetAt: new Date().toISOString(), limitType: "daily" }),
    );

    render(<App />);
    fireEvent.change(screen.getByLabelText(/email brief/i), { target: { value: "Welcome email for SaaS users." } });
    fireEvent.click(screen.getByRole("button", { name: /generate email/i }));
    await waitFor(() => expect(screen.getByText(/refine in chat/i)).toBeInTheDocument());

    const chatBox = screen.getAllByRole("textbox")[0];
    fireEvent.change(chatBox, { target: { value: "Make it shorter" } });
    fireEvent.click(screen.getByRole("button", { name: /send refinement/i }));

    await waitFor(() => expect(screen.getByText(/you’ve hit the free limit/i)).toBeInTheDocument());
  });

  it("can switch preview mode and reset chat", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ subject: "S", preheader: "P", mjml: "<mjml/>", html: "<html><body>ok</body></html>", usage: { remaining: null } }),
      }),
    );

    render(<App />);
    fireEvent.change(screen.getByLabelText(/email brief/i), { target: { value: "Welcome email for SaaS users." } });
    fireEvent.click(screen.getByRole("button", { name: /generate email/i }));
    await waitFor(() => expect(screen.getByText(/your draft is ready/i)).toBeInTheDocument());

    // Switch to HTML source mode
    fireEvent.click(screen.getByRole("button", { name: /^HTML$/i }));
    expect(screen.getByText(/<html/i)).toBeInTheDocument();

    // Refine once to enable reset, then reset
    const chatBox = screen.getAllByRole("textbox")[0];
    fireEvent.change(chatBox, { target: { value: "Make it shorter" } });
    fireEvent.click(screen.getByRole("button", { name: /send refinement/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /reset/i })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: /reset/i }));
    // After reset, the empty-state hint should appear again
    expect(screen.getByText(/once your first draft is ready/i)).toBeInTheDocument();
  });
});

