import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExportActions } from "@/components/react/ai-email/ExportActions";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    message: vi.fn(),
  },
}));

describe("ExportActions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // clipboard mock
    (navigator as unknown as { clipboard?: { writeText: (text: string) => Promise<void> } }).clipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
    };
    // download mocks
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  });

  it("copies MJML and HTML when available", async () => {
    const onError = vi.fn();
    render(
      <ExportActions
        email={{ subject: "Subject", preheader: "P", mjml: "<mjml/>", html: "<html/>" }}
        onError={onError}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /copy mjml/i }));
    expect(
      (navigator as unknown as { clipboard: { writeText: (text: string) => Promise<void> } }).clipboard.writeText,
    ).toHaveBeenCalledWith("<mjml/>");

    fireEvent.click(screen.getByRole("button", { name: /copy html/i }));
    expect(
      (navigator as unknown as { clipboard: { writeText: (text: string) => Promise<void> } }).clipboard.writeText,
    ).toHaveBeenCalledWith("<html/>");
    expect(onError).not.toHaveBeenCalled();
  });

  it("calls onError when clipboard write fails", async () => {
    (navigator as unknown as { clipboard?: { writeText: (text: string) => Promise<void> } }).clipboard = {
      writeText: vi.fn().mockRejectedValue(new Error("nope")),
    };
    const onError = vi.fn();
    render(
      <ExportActions
        email={{ subject: "Subject", preheader: "P", mjml: "<mjml/>", html: "<html/>" }}
        onError={onError}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /copy html/i }));
    await waitFor(() => expect(onError).toHaveBeenCalled());
  });

  it("disables HTML actions when html is null", () => {
    const onError = vi.fn();
    render(
      <ExportActions
        email={{ subject: "Subject", preheader: "P", mjml: "<mjml/>", html: null }}
        onError={onError}
      />,
    );

    expect(screen.getByRole("button", { name: /copy html/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /download html/i })).toBeDisabled();
  });

  it("downloads files", () => {
    const onError = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(
      <ExportActions
        email={{ subject: "My Subject", preheader: "P", mjml: "<mjml/>", html: "<html/>" }}
        onError={onError}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /download mjml/i }));
    fireEvent.click(screen.getByRole("button", { name: /download html/i }));
    expect(clickSpy).toHaveBeenCalled();
  });

  it("falls back to execCommand copy when clipboard is unavailable", async () => {
    delete (navigator as unknown as { clipboard?: unknown }).clipboard;
    Object.defineProperty(document, "execCommand", { value: vi.fn().mockReturnValue(true), configurable: true });
    const execSpy = document.execCommand as unknown as ReturnType<typeof vi.fn>;
    const onError = vi.fn();

    render(
      <ExportActions
        email={{ subject: "Subject", preheader: "P", mjml: "<mjml/>", html: "<html/>" }}
        onError={onError}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /copy mjml/i }));
    expect(execSpy).toHaveBeenCalledWith("copy");
    expect(onError).not.toHaveBeenCalled();
  });

  it("calls onError when copy fallback fails", async () => {
    delete (navigator as unknown as { clipboard?: unknown }).clipboard;
    Object.defineProperty(document, "execCommand", { value: vi.fn().mockReturnValue(false), configurable: true });
    const onError = vi.fn();

    render(
      <ExportActions
        email={{ subject: "Subject", preheader: "P", mjml: "<mjml/>", html: "<html/>" }}
        onError={onError}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /copy mjml/i }));
    await waitFor(() => expect(onError).toHaveBeenCalled());
  });
});

