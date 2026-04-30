import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatPanel } from "@/components/react/ai-email/ChatPanel";

describe("ChatPanel", () => {
  it("submits on button click and enter key", () => {
    const onSend = vi.fn();
    const onReset = vi.fn();
    render(<ChatPanel messages={[]} refining={false} onSend={onSend} onReset={onReset} />);

    const box = screen.getByRole("textbox");
    fireEvent.change(box, { target: { value: "Make it shorter" } });
    fireEvent.click(screen.getByRole("button", { name: /send refinement/i }));
    expect(onSend).toHaveBeenCalledWith("Make it shorter");

    fireEvent.change(box, { target: { value: "More urgent CTA" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onSend).toHaveBeenCalledWith("More urgent CTA");
  });

  it("reset is disabled with no messages", () => {
    render(<ChatPanel messages={[]} refining={false} onSend={() => {}} onReset={() => {}} />);
    expect(screen.getByRole("button", { name: /reset/i })).toBeDisabled();
  });
});

