import React from "react";
import { DRAFT_STORAGE_KEY } from "./ai-email/storage";
import { Button } from "@/components/ui/button";

type State = {
  error: Error | null;
};

export class AIEmailGeneratorErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[AIEmailGenerator] render crash", error, info);
  }

  private handleReset = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render(): React.ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <main className="min-h-screen bg-background-warm px-6 py-20">
        <section className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-soft">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-red-600">
            Something went wrong
          </p>
          <h1 className="font-serif text-4xl text-slate-950">The generator could not load</h1>
          <p className="mt-4 text-slate-600">
            This is usually caused by stale saved draft data. Clear the draft and reload to start fresh.
          </p>
          <Button className="mt-6" onClick={this.handleReset}>
            Clear draft and reload
          </Button>
          <details className="mt-6 text-left text-xs text-slate-500">
            <summary className="cursor-pointer">Error details</summary>
            <pre className="mt-3 max-h-48 overflow-auto rounded-xl bg-slate-50 p-4 whitespace-pre-wrap">
              {this.state.error.name}: {this.state.error.message}
            </pre>
          </details>
        </section>
      </main>
    );
  }
}
