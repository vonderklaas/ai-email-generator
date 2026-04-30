import { r as refineRequestSchema, s as sseEvent, a as getClientIp, c as checkRateLimit, f as refineEmail, d as compileMjml } from '../../../chunks/http_BBYatej2.mjs';
export { renderers } from '../../../renderers.mjs';

const prerender = false;
const POST = async ({ request }) => {
  const parsed = refineRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return new Response(
      sseEvent("error", { error: "invalid_request", message: "Refinement request is invalid." }),
      {
        status: 400,
        headers: { "Content-Type": "text/event-stream; charset=utf-8" }
      }
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
        usage: { remaining: limit.remaining }
      }),
      {
        status: 429,
        headers: { "Content-Type": "text/event-stream; charset=utf-8" }
      }
    );
  }
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event, data) => controller.enqueue(encoder.encode(sseEvent(event, data)));
      try {
        send("started", { message: "Refinement started" });
        send("progress", { message: "Reading the current MJML and your instruction..." });
        const output = await refineEmail({
          originalPrompt: parsed.data.originalPrompt,
          subject: parsed.data.currentEmail.subject,
          preheader: parsed.data.currentEmail.preheader,
          mjml: parsed.data.currentEmail.mjml,
          instruction: parsed.data.newMessage
        });
        send("progress", { message: "Compiling the updated MJML preview..." });
        const { html } = compileMjml(output.mjml);
        send("complete", {
          ...output,
          html,
          usage: { remaining: limit.remaining }
        });
      } catch {
        send("error", {
          error: "generation_failed",
          message: "Could not refine this email. Please try again."
        });
      } finally {
        controller.close();
      }
    }
  });
  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
