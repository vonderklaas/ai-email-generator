import type { APIRoute } from "astro";
import { compileMjmlSafe } from "@/lib/ai-email/mjml";
import { sseEvent } from "@/lib/ai-email/http";
import { refineEmail } from "@/lib/ai-email/openai";
import { checkRateLimit, getClientIp } from "@/lib/ai-email/rateLimit";
import { refineRequestSchema } from "@/lib/ai-email/schemas";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const parsed = refineRequestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return new Response(
      sseEvent("error", { error: "invalid_request", message: "Refinement request is invalid." }),
      {
        status: 400,
        headers: { "Content-Type": "text/event-stream; charset=utf-8" },
      },
    );
  }

  const ip = getClientIp(request);
  const limit = checkRateLimit("refine", ip);
  if (!limit.allowed) {
    return new Response(
      sseEvent("error", {
        error: "rate_limit_exceeded",
        message: "Rate limit exceeded.",
        type: limit.type,
        resetAt: limit.resetAt,
        usage: { remaining: limit.remaining },
      }),
      {
        status: 429,
        headers: { "Content-Type": "text/event-stream; charset=utf-8" },
      },
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => controller.enqueue(encoder.encode(sseEvent(event, data)));

      try {
        send("started", { message: "Refinement started" });
        send("progress", { message: "Reading the current MJML and your instruction..." });

        const output = await refineEmail({
          originalPrompt: parsed.data.originalPrompt,
          subject: parsed.data.currentEmail.subject,
          preheader: parsed.data.currentEmail.preheader,
          mjml: parsed.data.currentEmail.mjml,
          instruction: parsed.data.newMessage,
        });

        send("progress", { message: "Compiling the updated MJML preview..." });
        const compiled = await compileMjmlSafe(output.mjml);

        send("complete", {
          ...output,
          html: compiled.html,
          /* c8 ignore next */
          warnings: import.meta.env.DEV ? compiled.warnings : undefined,
          compileError: "error" in compiled ? compiled.error : undefined,
          usage: { remaining: limit.remaining },
        });
      } catch (error) {
        console.error("[/api/ai-email-generator/refine] failed:", error);

        const message =
          error instanceof Error
            ? error.message
            : "Could not refine this email. Please try again.";
        const isConnectionError =
          message.toLowerCase().includes("connection error") ||
          (error instanceof Error && (error as unknown as { cause?: unknown }).cause instanceof Error &&
            ((error as unknown as { cause?: Error }).cause?.message ?? "").toLowerCase().includes("enotfound"));

        send("error", {
          error: "generation_failed",
          message: isConnectionError
            ? "Could not reach OpenAI (network/DNS). Check internet, VPN, or DNS settings."
            : (/* c8 ignore next */ import.meta.env.DEV ? message : "Could not refine this email. Please try again."),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
};
