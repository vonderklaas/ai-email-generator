import { Suspense, useEffect, useReducer, useState } from "react";
import { Toaster, toast } from "sonner";
import { AIEmailGeneratorErrorBoundary } from "./AIEmailGeneratorErrorBoundary";
import { GeneratedWorkspace } from "./ai-email/GeneratedWorkspace";
import { LandingPrompt } from "./ai-email/LandingPrompt";
import { aiEmailReducer, initialState } from "./ai-email/state";
import { RateLimitModal } from "./ai-email/RateLimitModal";
import { clearDraft, draftToState, ensureSchemaVersion, persistDraft, restoreDraft } from "./ai-email/storage";
import type { GenerateResponse, RefineCompleteResponse } from "./ai-email/types";
import { RateLimitError, postSse } from "@/hooks/useSseFetch";

function LoadingShell() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background-warm">
      <div role="status" className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm font-medium text-slate-500">Loading AI email generator...</p>
      </div>
    </main>
  );
}

function parseGenerateError(error: unknown) {
  return {
    title: "Generation failed.",
    message: error instanceof Error ? error.message : "Something went wrong. Please try again.",
    retryable: true,
  };
}

function parseRemainingRateLimit(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.generatesToday !== "number") return null;
  if (typeof v.generatesThisHour !== "number") return null;
  if (typeof v.refinesToday !== "number") return null;
  return {
    generatesToday: v.generatesToday,
    generatesThisHour: v.generatesThisHour,
    refinesToday: v.refinesToday,
  };
}

function AppInner() {
  const [state, dispatch] = useReducer(aiEmailReducer, initialState);
  const [compilingPreview, setCompilingPreview] = useState(false);

  useEffect(() => {
    ensureSchemaVersion();
    const draft = restoreDraft();
    if (draft) {
      dispatch({ type: "restore", payload: draftToState(draft) });
    }
  }, []);

  useEffect(() => {
    persistDraft({
      prompt: state.prompt,
      originalPrompt: state.originalPrompt,
      currentEmail: state.currentEmail,
      messages: state.messages,
    });
  }, [state.prompt, state.originalPrompt, state.currentEmail, state.messages]);

  const generate = async () => {
    dispatch({ type: "startGenerate" });
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch("/api/ai-email-generator/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: state.prompt }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 429 && payload?.resetAt && payload?.type) {
          dispatch({
            type: "rateLimitBlocked",
            payload: {
              action: "generate",
              type: payload.type,
              resetAt: payload.resetAt,
              remaining: parseRemainingRateLimit(payload.usage?.remaining),
            },
          });
          toast.message("Rate limit reached.");
          return;
        }
        throw new Error(payload?.message ?? payload?.error ?? "Server rejected the prompt.");
      }

      const email = payload as GenerateResponse;
      dispatch({
        type: "generateSuccess",
        email,
        originalPrompt: state.prompt,
        rateLimit: email.usage?.remaining ?? null,
      });
      if (email.html) {
        toast.success("Email draft generated.");
      } else {
        toast.message("Draft generated, but preview failed to compile.");
      }
    } catch (error) {
      dispatch({ type: "generateError", error: parseGenerateError(error) });
      toast.error(error instanceof Error ? error.message : "Generation failed.");
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const compilePreview = async () => {
    if (!state.currentEmail) return;
    setCompilingPreview(true);
    try {
      const response = await fetch("/api/ai-email-generator/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mjml: state.currentEmail.mjml }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 429 && payload?.resetAt && payload?.type) {
          dispatch({
            type: "rateLimitBlocked",
            payload: {
              action: "compile",
              type: payload.type,
              resetAt: payload.resetAt,
              remaining: parseRemainingRateLimit(payload.usage?.remaining),
            },
          });
          return;
        }
        throw new Error(payload?.message ?? payload?.error ?? "Could not compile preview.");
      }

      const html = payload?.html ?? null;
      dispatch({ type: "updateEmailHtml", html });
      if (html) toast.success("Preview compiled.");
      else toast.message("Still could not compile the preview. MJML export is still available.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not compile preview.");
    } finally {
      setCompilingPreview(false);
    }
  };

  const refine = async (message: string) => {
    if (!state.currentEmail) return;

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user" as const,
      content: message,
      createdAt: new Date().toISOString(),
      status: "complete" as const,
    };
    const assistantMessage = {
      id: crypto.randomUUID(),
      role: "assistant" as const,
      content: "Refining your email...",
      createdAt: new Date().toISOString(),
      status: "streaming" as const,
    };
    dispatch({ type: "startRefine", userMessage, assistantMessage });

    try {
      await postSse(
        "/api/ai-email-generator/refine",
        {
          originalPrompt: state.originalPrompt || state.prompt,
          currentEmail: {
            subject: state.currentEmail.subject,
            preheader: state.currentEmail.preheader,
            mjml: state.currentEmail.mjml,
          },
          messages: state.messages.map(({ role, content }) => ({ role, content })),
          newMessage: message,
        },
        (event) => {
          if (event.event === "progress" && typeof event.data === "object" && event.data && "message" in event.data) {
            dispatch({
              type: "refineProgress",
              assistantId: assistantMessage.id,
              content: String(event.data.message),
            });
          }
          if (event.event === "complete") {
            const payload = event.data as RefineCompleteResponse;
            dispatch({
              type: "refineSuccess",
              assistantId: assistantMessage.id,
              email: payload,
              content: "Done. I updated the email draft and refreshed the preview.",
              rateLimit: payload.usage?.remaining ?? null,
            });
            if (payload.html) toast.success("Email refined.");
            else toast.message("Refined draft saved, but preview failed to compile.");
          }
        },
      );
    } catch (error) {
      if (error instanceof RateLimitError) {
        dispatch({
          type: "rateLimitBlocked",
          payload: {
            action: "refine",
            type: error.limitType,
            resetAt: error.resetAt,
            remaining: parseRemainingRateLimit(error.remaining),
          },
        });
        toast.message("Rate limit reached.");
        return;
      }
      dispatch({
        type: "refineError",
        assistantId: assistantMessage.id,
        error: {
          title: "Refinement failed.",
          message: error instanceof Error ? error.message : "Could not refine this email.",
          retryable: true,
        },
      });
      toast.error("Refinement failed.");
    }
  };

  const resetAll = () => {
    clearDraft();
    dispatch({ type: "resetAll" });
  };

  return (
    <>
      <Toaster richColors position="top-right" />
      {state.rateLimitBlock && (
        <RateLimitModal
          block={state.rateLimitBlock}
          onClose={() => dispatch({ type: "clearRateLimit" })}
        />
      )}
      {state.currentEmail ? (
        <GeneratedWorkspace
          state={state}
          onPreviewModeChange={(previewMode) => dispatch({ type: "setPreviewMode", previewMode })}
          onRefine={refine}
          onResetChat={() => dispatch({ type: "resetChat" })}
          onNewEmail={resetAll}
          onCompilePreview={compilePreview}
          compilingPreview={compilingPreview}
          onExportError={(message) => {
            dispatch({ type: "generateError", error: { title: "Clipboard failed.", message } });
            toast.error(message);
          }}
        />
      ) : (
        <main className="min-h-screen bg-background-warm">
          {state.error && (
            <div className="mx-auto max-w-3xl px-4 pt-6">
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <strong>{state.error.title}</strong> {state.error.message}
              </div>
            </div>
          )}
          <LandingPrompt
            prompt={state.prompt}
            generating={state.generating}
            onPromptChange={(prompt) => dispatch({ type: "setPrompt", prompt })}
            onGenerate={generate}
          />
        </main>
      )}
    </>
  );
}

export default function AIEmailGeneratorApp() {
  return (
    <AIEmailGeneratorErrorBoundary>
      <Suspense fallback={<LoadingShell />}>
        <AppInner />
      </Suspense>
    </AIEmailGeneratorErrorBoundary>
  );
}
