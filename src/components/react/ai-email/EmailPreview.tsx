import { useState } from "react";
import type { CurrentEmail, PreviewMode } from "./types";
import { HighlightedCode } from "./HighlightedCode";
import { Button } from "@/components/ui/button";

type Props = {
  email: CurrentEmail;
  mode: PreviewMode;
  onModeChange: (mode: PreviewMode) => void;
  onCompilePreview?: () => void;
  compilingPreview?: boolean;
};

const MODES: Array<{ id: PreviewMode; label: string }> = [
  { id: "rendered", label: "Preview" },
  { id: "html", label: "HTML" },
  { id: "mjml", label: "MJML" },
];

export function EmailPreview({ email, mode, onModeChange, onCompilePreview, compilingPreview }: Props) {
  const [iframeHeight, setIframeHeight] = useState(320);

  const resizeIframe = (iframe: HTMLIFrameElement | null) => {
    if (!iframe?.contentDocument) return;
    const { body, documentElement } = iframe.contentDocument;

    const height = Math.max(
      documentElement.scrollHeight,
      body.scrollHeight,
      documentElement.offsetHeight,
      body.offsetHeight,
    );

    if (height > 0) {
      setIframeHeight(Math.min(Math.max(height, 280), 900));
    }
  };

  const handleIframeLoad = (iframe: HTMLIFrameElement) => {
    resizeIframe(iframe);
    iframe.contentWindow?.requestAnimationFrame(() => resizeIframe(iframe));
    window.setTimeout(() => resizeIframe(iframe), 250);
  };

  return (
    <section className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-soft lg:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Subject</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">{email.subject}</h2>
          <p className="mt-2 text-sm text-slate-500">{email.preheader}</p>
        </div>
        <div className="flex rounded-full bg-slate-100 p-1">
          {MODES.map((item) => (
            <Button
              key={item.id}
              size="sm"
              variant={mode === item.id ? "default" : "ghost"}
              onClick={() => onModeChange(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {mode === "rendered" ? (
        <div className="overflow-auto rounded-2xl bg-slate-100 p-4">
          {email.html ? (
            <iframe
              key={email.html}
              title="Email preview"
              sandbox="allow-same-origin"
              srcDoc={email.html}
              onLoad={(event) => handleIframeLoad(event.currentTarget)}
              style={{ height: iframeHeight }}
              className="mx-auto w-full max-w-[640px] rounded-xl border border-slate-200 bg-white"
            />
          ) : (
            <div className="mx-auto flex h-[420px] w-full max-w-[640px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-8 text-center">
              <div>
                <p className="text-sm font-semibold text-slate-900">Preview unavailable</p>
                <p className="mt-2 text-sm text-slate-500">
                  MJML did not compile into HTML. You can still copy or download the MJML source.
                </p>
                {onCompilePreview && (
                  <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
                    <Button variant="outline" size="sm" onClick={() => onModeChange("mjml")}>
                      View MJML
                    </Button>
                    <Button size="sm" onClick={onCompilePreview} disabled={compilingPreview}>
                      {compilingPreview ? "Compiling…" : "Try compiling preview"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="max-h-[640px] overflow-auto rounded-2xl bg-slate-950">
          <pre className="min-w-0 max-w-full overflow-x-auto p-5 text-xs leading-6 text-slate-100">
            <code className="whitespace-pre">
              <HighlightedCode code={mode === "html" ? (email.html ?? "") : email.mjml} />
            </code>
          </pre>
        </div>
      )}
    </section>
  );
}
