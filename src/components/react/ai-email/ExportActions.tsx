import { Download, Copy } from "lucide-react";
import type { CurrentEmail } from "./types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  email: CurrentEmail;
  onError: (message: string) => void;
};

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!copied) throw new Error("Clipboard copy failed.");
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ExportActions({ email, onError }: Props) {
  const safeSubject = email.subject.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "email";

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Button
        variant="outline"
        disabled={!email.html}
        onClick={() =>
          email.html
            ? copyText(email.html)
                .then(() => toast.success("HTML copied."))
                .catch(() => onError("Could not copy HTML. Select the HTML source view and copy manually."))
            : undefined
        }
      >
        <Copy className="h-4 w-4" /> Copy HTML
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          copyText(email.mjml)
            .then(() => toast.success("MJML copied."))
            .catch(() => onError("Could not copy MJML. Select the MJML source view and copy manually."))
        }
      >
        <Copy className="h-4 w-4" /> Copy MJML
      </Button>
      <Button
        variant="secondary"
        disabled={!email.html}
        onClick={() => {
          if (!email.html) return;
          downloadFile(`${safeSubject}.html`, email.html, "text/html");
          toast.message("Downloading HTML…");
        }}
      >
        <Download className="h-4 w-4" /> Download HTML
      </Button>
      <Button
        variant="secondary"
        onClick={() => {
          downloadFile(`${safeSubject}.mjml`, email.mjml, "text/plain");
          toast.message("Downloading MJML…");
        }}
      >
        <Download className="h-4 w-4" /> Download MJML
      </Button>
    </div>
  );
}
