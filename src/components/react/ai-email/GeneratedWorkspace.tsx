import type { AIEmailState, CurrentEmail, PreviewMode } from "./types";
import { ChatPanel } from "./ChatPanel";
import { EmailPreview } from "./EmailPreview";
import { ExportActions } from "./ExportActions";
import { Button } from "@/components/ui/button";

type Props = {
  state: AIEmailState;
  onPreviewModeChange: (mode: PreviewMode) => void;
  onRefine: (message: string) => void;
  onResetChat: () => void;
  onNewEmail: () => void;
  onExportError: (message: string) => void;
  onCompilePreview: () => void;
  compilingPreview: boolean;
};

export function GeneratedWorkspace({
  state,
  onPreviewModeChange,
  onRefine,
  onResetChat,
  onNewEmail,
  onExportError,
  onCompilePreview,
  compilingPreview,
}: Props) {
  const email = state.currentEmail as CurrentEmail;

  return (
    <main className="min-h-screen bg-background-warm px-4 py-6">
      <div className="mx-auto mb-6 flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">AI Email Generator</p>
          <h1 className="mt-1 font-serif text-4xl text-slate-950">Your draft is ready</h1>
        </div>
        <Button variant="outline" onClick={onNewEmail}>
          New email
        </Button>
      </div>

      {state.error && (
        <div className="mx-auto mb-6 max-w-7xl rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>{state.error.title}</strong> {state.error.message}
        </div>
      )}

      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <ChatPanel
            messages={state.messages}
            refining={state.refining}
            onSend={onRefine}
            onReset={onResetChat}
          />
          <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-soft">
            <h2 className="mb-3 font-semibold text-slate-950">Export</h2>
            <ExportActions email={email} onError={onExportError} />
          </section>
        </div>

        <div className="min-w-0">
          <EmailPreview
            email={email}
            mode={state.previewMode}
            onModeChange={onPreviewModeChange}
            onCompilePreview={onCompilePreview}
            compilingPreview={compilingPreview}
          />
        </div>
      </div>
    </main>
  );
}
