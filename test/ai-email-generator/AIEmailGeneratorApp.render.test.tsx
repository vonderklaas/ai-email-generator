import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import AIEmailGeneratorApp from "@/components/react/AIEmailGeneratorApp";

describe("AIEmailGeneratorApp", () => {
  it("renders the landing prompt with disabled generate button when empty", () => {
    render(<AIEmailGeneratorApp />);

    expect(screen.getByRole("heading", { name: /generate saas emails/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generate email/i })).toBeDisabled();
    expect(screen.getByPlaceholderText(/company website url/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/logo url/i)).toBeInTheDocument();
  });

  it("enables generate after a valid prompt", async () => {
    const user = userEvent.setup();
    render(<AIEmailGeneratorApp />);

    await user.type(screen.getByLabelText(/email brief/i), "Welcome email for a SaaS product");

    expect(screen.getByRole("button", { name: /generate email/i })).toBeEnabled();
  });
});
