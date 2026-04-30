import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmailPreview } from "@/components/react/ai-email/EmailPreview";

describe("EmailPreview", () => {
  it("switches modes via buttons and shows preview unavailable when html is null", () => {
    const onModeChange = vi.fn();
    render(
      <EmailPreview
        email={{ subject: "S", preheader: "P", mjml: "<mjml/>", html: null }}
        mode="rendered"
        onModeChange={onModeChange}
      />,
    );

    expect(screen.getByText(/preview unavailable/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /html/i }));
    expect(onModeChange).toHaveBeenCalledWith("html");
  });

  it("renders iframe when html exists", () => {
    render(
      <EmailPreview
        email={{ subject: "S", preheader: "P", mjml: "<mjml/>", html: "<html><body>ok</body></html>" }}
        mode="rendered"
        onModeChange={() => {}}
      />,
    );

    expect(screen.getByTitle(/email preview/i)).toBeInTheDocument();
  });

  it("renders HTML and MJML source modes", () => {
    const email = { subject: "S", preheader: "P", mjml: "<mjml/>", html: "<html><body>ok</body></html>" as string | null };
    const { rerender } = render(<EmailPreview email={email} mode="html" onModeChange={() => {}} />);
    expect(screen.getByText(/<html>/i)).toBeInTheDocument();

    rerender(<EmailPreview email={email} mode="mjml" onModeChange={() => {}} />);
    expect(screen.getByText(/<mjml\/>/i)).toBeInTheDocument();
  });

  it("does not show compile actions when onCompilePreview is not provided", () => {
    render(
      <EmailPreview
        email={{ subject: "S", preheader: "P", mjml: "<mjml/>", html: null }}
        mode="rendered"
        onModeChange={() => {}}
      />,
    );
    expect(screen.queryByRole("button", { name: /try compiling preview/i })).not.toBeInTheDocument();
  });

  it("shows compile actions when onCompilePreview is provided", () => {
    const onModeChange = vi.fn();
    const onCompilePreview = vi.fn();
    render(
      <EmailPreview
        email={{ subject: "S", preheader: "P", mjml: "<mjml/>", html: null }}
        mode="rendered"
        onModeChange={onModeChange}
        onCompilePreview={onCompilePreview}
        compilingPreview={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /view mjml/i }));
    expect(onModeChange).toHaveBeenCalledWith("mjml");
    fireEvent.click(screen.getByRole("button", { name: /try compiling preview/i }));
    expect(onCompilePreview).toHaveBeenCalled();
  });
});

