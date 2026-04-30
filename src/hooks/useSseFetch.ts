export type StreamEvent = {
  event: string;
  data: unknown;
};

export class RateLimitError extends Error {
  readonly resetAt: string;
  readonly limitType: "daily" | "hourly";
  readonly remaining?: unknown;

  constructor(args: { message: string; resetAt: string; limitType: "daily" | "hourly"; remaining?: unknown }) {
    super(args.message);
    this.name = "RateLimitError";
    this.resetAt = args.resetAt;
    this.limitType = args.limitType;
    this.remaining = args.remaining;
  }
}

function parseEventBlock(block: string): StreamEvent | null {
  const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const eventLine = lines.find((line) => line.startsWith("event:"));
  const dataLines = lines.filter((line) => line.startsWith("data:"));
  const event = eventLine?.replace(/^event:\s*/, "") ?? "message";
  const rawData = dataLines.map((line) => line.replace(/^data:\s*/, "")).join("\n");

  try {
    return { event, data: rawData ? JSON.parse(rawData) : null };
  } catch {
    return { event, data: rawData };
  }
}

function tryParseSseError(text: string): StreamEvent | null {
  const blocks = text.split("\n\n").map((b) => b.trim()).filter(Boolean);
  for (const block of blocks) {
    const event = parseEventBlock(block);
    if (event && event.event === "error") return event;
  }
  return null;
}

export async function postSse(
  url: string,
  body: unknown,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("text/event-stream")) {
      const text = await response.text().catch(() => "");
      const sse = tryParseSseError(text);
      const data = sse?.data;
      if (data && typeof data === "object" && "error" in data && (data as { error?: unknown }).error === "rate_limit_exceeded") {
        const typed = data as { message?: string; resetAt?: string; type?: "daily" | "hourly"; usage?: { remaining?: unknown } };
        if (typed.resetAt && typed.type) {
          throw new RateLimitError({
            message: typed.message ?? "Rate limit exceeded.",
            resetAt: typed.resetAt,
            limitType: typed.type,
            remaining: typed.usage?.remaining,
          });
        }
      }
      if (data && typeof data === "object" && "message" in data) {
        throw new Error(String((data as { message?: unknown }).message ?? `Request failed with ${response.status}`));
      }
      throw new Error(`Request failed with ${response.status}`);
    }

    const payload = await response.json().catch(() => null);
    if (payload?.error === "rate_limit_exceeded" && payload?.resetAt && payload?.type) {
      throw new RateLimitError({
        message: payload.message ?? "Rate limit exceeded.",
        resetAt: payload.resetAt,
        limitType: payload.type,
        remaining: payload.usage?.remaining,
      });
    }
    throw new Error(payload?.message ?? payload?.error ?? `Request failed with ${response.status}`);
  }

  if (!response.body) {
    throw new Error("Streaming response was empty.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";

    for (const block of blocks) {
      const event = parseEventBlock(block);
      if (event) onEvent(event);
    }
  }

  if (buffer.trim()) {
    const event = parseEventBlock(buffer);
    if (event) onEvent(event);
  }
}
