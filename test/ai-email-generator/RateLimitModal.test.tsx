import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RateLimitModal } from "@/components/react/ai-email/RateLimitModal";

describe("RateLimitModal", () => {
  it("shows countdown and closes on backdrop click", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();

    render(
      <RateLimitModal
        block={{ action: "generate", type: "hourly", resetAt: new Date(Date.now() + 15_000).toISOString(), remaining: null }}
        onClose={onClose}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/hourly limit reached/i)).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("shows expired state and closes via button", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(
      <RateLimitModal
        block={{ action: "refine", type: "daily", resetAt: new Date(Date.now() - 1000).toISOString(), remaining: null }}
        onClose={onClose}
      />,
    );
    expect(screen.getByText(/you can try again now/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("formats minutes in countdown and does not close when clicking inside", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(
      <RateLimitModal
        block={{ action: "compile", type: "daily", resetAt: new Date(Date.now() + 75_000).toISOString(), remaining: null }}
        onClose={onClose}
      />,
    );

    expect(screen.getByText(/1m/i)).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByText(/you’ve hit the free limit/i));
    expect(onClose).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});

