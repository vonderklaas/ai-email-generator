import type { AIEmailState, AppError, ChatMessage, CurrentEmail, PreviewMode, RateLimitBlock, RateLimitState } from "./types";

export const initialState: AIEmailState = {
  prompt: "",
  originalPrompt: "",
  generating: false,
  refining: false,
  messages: [],
  currentEmail: null,
  error: null,
  rateLimit: null,
  rateLimitBlock: null,
  previewMode: "rendered",
};

export type AIEmailAction =
  | { type: "restore"; payload: Partial<AIEmailState> }
  | { type: "setPrompt"; prompt: string }
  | { type: "setPreviewMode"; previewMode: PreviewMode }
  | { type: "startGenerate" }
  | { type: "generateSuccess"; email: CurrentEmail; originalPrompt: string; rateLimit: RateLimitState }
  | { type: "generateError"; error: AppError }
  | { type: "rateLimitBlocked"; payload: RateLimitBlock }
  | { type: "clearRateLimit" }
  | { type: "updateEmailHtml"; html: string | null }
  | { type: "startRefine"; userMessage: ChatMessage; assistantMessage: ChatMessage }
  | { type: "refineProgress"; assistantId: string; content: string }
  | { type: "refineSuccess"; assistantId: string; email: CurrentEmail; content: string; rateLimit: RateLimitState }
  | { type: "refineError"; assistantId?: string; error: AppError }
  | { type: "resetChat" }
  | { type: "resetAll" }
  | { type: "clearError" };

export function aiEmailReducer(state: AIEmailState, action: AIEmailAction): AIEmailState {
  switch (action.type) {
    case "restore":
      return { ...state, ...action.payload, generating: false, refining: false, error: null, rateLimitBlock: null };
    case "setPrompt":
      return { ...state, prompt: action.prompt, error: null, rateLimitBlock: null };
    case "setPreviewMode":
      return { ...state, previewMode: action.previewMode };
    case "startGenerate":
      return { ...state, generating: true, error: null, rateLimitBlock: null };
    case "generateSuccess":
      return {
        ...state,
        generating: false,
        originalPrompt: action.originalPrompt,
        currentEmail: action.email,
        rateLimit: action.rateLimit,
        rateLimitBlock: null,
        messages: [
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Your first draft is ready. Ask for tweaks like “make it shorter”, “sharpen the CTA”, or “add a P.S.”",
            createdAt: new Date().toISOString(),
            status: "complete",
          },
        ],
      };
    case "generateError":
      return { ...state, generating: false, error: action.error };
    case "rateLimitBlocked":
      return { ...state, generating: false, refining: false, rateLimitBlock: action.payload };
    case "clearRateLimit":
      return { ...state, rateLimitBlock: null };
    case "updateEmailHtml":
      return state.currentEmail ? { ...state, currentEmail: { ...state.currentEmail, html: action.html } } : state;
    case "startRefine":
      return {
        ...state,
        refining: true,
        error: null,
        rateLimitBlock: null,
        messages: [...state.messages, action.userMessage, action.assistantMessage],
      };
    case "refineProgress":
      return {
        ...state,
        messages: state.messages.map((message) =>
          message.id === action.assistantId
            ? { ...message, content: action.content, status: "streaming" }
            : message,
        ),
      };
    case "refineSuccess":
      return {
        ...state,
        refining: false,
        currentEmail: action.email,
        rateLimit: action.rateLimit,
        rateLimitBlock: null,
        messages: state.messages.map((message) =>
          message.id === action.assistantId
            ? { ...message, content: action.content, status: "complete" }
            : message,
        ),
      };
    case "refineError":
      return {
        ...state,
        refining: false,
        error: action.error,
        messages: action.assistantId
          ? state.messages.map((message) =>
              message.id === action.assistantId
                ? { ...message, content: action.error.message, status: "error" }
                : message,
            )
          : state.messages,
      };
    case "resetChat":
      return { ...state, messages: [], error: null };
    case "resetAll":
      return initialState;
    case "clearError":
      return { ...state, error: null };
    default:
      return state;
  }
}
