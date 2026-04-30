import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AIEmailGeneratorApp from "@/components/react/AIEmailGeneratorApp";

describe("AIEmailGeneratorApp flow", () => {
  it("generates an email and shows preview/export UI", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        subject: "Welcome aboard",
        preheader: "Invite your first teammate.",
        mjml: "<mjml><mj-body><mj-section><mj-column><mj-text>Hello</mj-text></mj-column></mj-section></mj-body></mjml>",
        html: "<html><body><h1>Hello</h1></body></html>".repeat(5),
        usage: { remaining: { generatesToday: 4, generatesThisHour: 2, refinesToday: 30 } },
      }),
    }));

    render(<AIEmailGeneratorApp />);
    await user.type(screen.getByRole("textbox"), "Welcome email for a SaaS wiki app");
    await user.click(screen.getByRole("button", { name: /generate email/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /your draft is ready/i })).toBeInTheDocument();
    });

    expect(screen.getByText("Welcome aboard")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy html/i })).toBeInTheDocument();
    expect(screen.getByTitle("Email preview")).toBeInTheDocument();
  });
});
