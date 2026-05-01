import { z } from "zod";
import type { AIEmailState, ChatMessage, CurrentEmail } from "./types";

export const DRAFT_STORAGE_KEY = "ai-email-generator:draft:v1";
export const DRAFT_SCHEMA_VERSION = 1;

const currentEmailSchema = z.object({
  subject: z.string(),
  preheader: z.string(),
  mjml: z.string(),
  html: z.string().nullable(),
});

const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  createdAt: z.string(),
  status: z.enum(["streaming", "complete", "error"]).optional(),
});

const draftSchema = z.object({
  version: z.literal(DRAFT_SCHEMA_VERSION),
  prompt: z.string(),
  companyUrl: z.string().optional().default(""),
  logoUrl: z.string().optional().default(""),
  originalPrompt: z.string(),
  currentEmail: currentEmailSchema.nullable(),
  messages: z.array(chatMessageSchema),
});

export type PersistedDraft = z.infer<typeof draftSchema>;

export function ensureSchemaVersion(storage: Storage = window.localStorage): void {
  const raw = storage.getItem(DRAFT_STORAGE_KEY);
  if (!raw) return;

  try {
    draftSchema.parse(JSON.parse(raw));
  } catch {
    storage.removeItem(DRAFT_STORAGE_KEY);
  }
}

export function restoreDraft(storage: Storage = window.localStorage): PersistedDraft | null {
  const raw = storage.getItem(DRAFT_STORAGE_KEY);
  if (!raw) return null;

  try {
    return draftSchema.parse(JSON.parse(raw));
  } catch {
    storage.removeItem(DRAFT_STORAGE_KEY);
    return null;
  }
}

export function persistDraft(
  state: Pick<AIEmailState, "prompt" | "companyUrl" | "logoUrl" | "originalPrompt" | "currentEmail" | "messages">,
  storage: Storage = window.localStorage,
): void {
  if (!state.currentEmail) return;

  const payload: PersistedDraft = {
    version: DRAFT_SCHEMA_VERSION,
    prompt: state.prompt,
    companyUrl: state.companyUrl,
    logoUrl: state.logoUrl,
    originalPrompt: state.originalPrompt,
    currentEmail: state.currentEmail,
    messages: state.messages.map((message) => ({
      ...message,
      status: message.status === "streaming" ? "complete" : message.status,
    })),
  };

  try {
    storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage is a convenience cache. Quota/private-mode failures must not break the tool.
  }
}

export function clearDraft(storage: Storage = window.localStorage): void {
  try {
    storage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function draftToState(draft: PersistedDraft): {
  prompt: string;
  companyUrl: string;
  logoUrl: string;
  originalPrompt: string;
  currentEmail: CurrentEmail | null;
  messages: ChatMessage[];
} {
  return {
    prompt: draft.prompt,
    companyUrl: draft.companyUrl,
    logoUrl: draft.logoUrl,
    originalPrompt: draft.originalPrompt,
    currentEmail: draft.currentEmail,
    messages: draft.messages,
  };
}
