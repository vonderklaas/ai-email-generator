import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AIEmailGeneratorErrorBoundary } from "@/components/react/AIEmailGeneratorErrorBoundary";

describe("AIEmailGeneratorErrorBoundary", () => {
  beforeEach(() => {
    // JSDOM Location.reload is not reliably spyable in all environments.
  });

  it("renders fallback when child throws and resets draft", () => {
    const removeSpy = vi.spyOn(window.localStorage.__proto__, "removeItem");

    const Boom = () => {
      throw new Error("boom");
    };

    render(
      <AIEmailGeneratorErrorBoundary>
        <Boom />
      </AIEmailGeneratorErrorBoundary>,
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /clear draft and reload/i }));
    expect(removeSpy).toHaveBeenCalled();
  });
});

