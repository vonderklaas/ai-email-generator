import OpenAI from "openai";
import { SYSTEM_PROMPT, generationUserPrompt, refinementUserPrompt } from "./prompts";
import { emailOutputSchema, openAIJsonSchema, type EmailOutput } from "./schemas";

let client: OpenAI | null = null;

function readEnv(name: string): string | undefined {
  // Astro SSR runs in Node, where process.env is the source of truth.
  // import.meta.env is also available, but can differ between runtimes.
  const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return process.env[name] || metaEnv?.[name];
}

function getClient() {
  if (client) return client;
  const apiKey = readEnv("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  client = new OpenAI({ apiKey });
  return client;
}

function getModel() {
  return readEnv("OPENAI_MODEL") || "gpt-4o";
}

function readNumberEnv(name: string): number | undefined {
  const raw = readEnv(name);
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function parseContent(content: string | null): EmailOutput {
  if (!content) throw new Error("OpenAI returned empty content.");
  return emailOutputSchema.parse(JSON.parse(content));
}

async function createStructuredEmail(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  opts: { maxTokens?: number } = {},
) {
  const completion = await getClient().chat.completions.create({
    model: getModel(),
    // Truncation is our #1 failure mode. If the model hits a length stop,
    // we retry with a higher cap.
    max_tokens: opts.maxTokens ?? readNumberEnv("OPENAI_MAX_TOKENS") ?? 6000,
    temperature: readNumberEnv("OPENAI_TEMPERATURE") ?? 0.2,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ],
    response_format: {
      type: "json_schema",
      json_schema: openAIJsonSchema,
    },
  });

  const choice = completion.choices[0];
  const finish = choice?.finish_reason;

  /* c8 ignore next 4 */
  if (import.meta.env.DEV) {
    console.log("[OpenAI] finish_reason:", finish);
  }

  if (finish === "length") {
    throw new Error("OpenAI output was truncated (finish_reason=length).");
  }

  return parseContent(choice?.message?.content ?? null);
}

export async function generateEmail(prompt: string): Promise<EmailOutput> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "user", content: generationUserPrompt(prompt) },
  ];
  return withOneRetry(
    () => createStructuredEmail(messages),
    () => createStructuredEmail(messages, { maxTokens: 9000 }),
  );
}

export async function refineEmail(args: {
  originalPrompt: string;
  subject: string;
  preheader: string;
  mjml: string;
  instruction: string;
}): Promise<EmailOutput> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "user", content: refinementUserPrompt(args) },
  ];
  return withOneRetry(
    () => createStructuredEmail(messages),
    () => createStructuredEmail(messages, { maxTokens: 9000 }),
  );
}

async function withOneRetry<T>(first: () => Promise<T>, second: () => Promise<T>): Promise<T> {
  try {
    return await first();
  } catch (firstError) {
    try {
      // Retry once. The second attempt uses a higher output cap to avoid
      // truncation if the first attempt hit finish_reason=length.
      return await second();
    } catch {
      throw firstError;
    }
  }
}
