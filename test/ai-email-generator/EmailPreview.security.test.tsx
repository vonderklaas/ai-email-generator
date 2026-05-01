import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmailPreview } from "@/components/react/ai-email/EmailPreview";
import { injectPreviewBaseTargetBlank } from "@/lib/previewHtml";

const email = {
  subject: "Welcome aboard",
  preheader: "Invite your team today.",
  mjml: "<mjml><mj-body /></mjml>",
  html: "<html><body><h1>Hello</h1></body></html>",
};

describe("EmailPreview security", () => {
  it("renders generated HTML through a sandboxed srcDoc iframe", () => {
    render(<EmailPreview email={email} mode="rendered" onModeChange={vi.fn()} />);

    const iframe = screen.getByTitle("Email preview");

    expect(iframe).toHaveAttribute("srcDoc", injectPreviewBaseTargetBlank(email.html));
    expect(iframe).toHaveAttribute(
      "sandbox",
      "allow-same-origin allow-popups allow-popups-to-escape-sandbox",
    );
    expect(iframe.getAttribute("sandbox")).not.toContain("allow-scripts");
    expect(iframe.getAttribute("sandbox")).not.toContain("allow-forms");
  });
});
