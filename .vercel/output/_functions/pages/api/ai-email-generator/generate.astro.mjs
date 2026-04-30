import { g as generateRequestSchema, e as errorResponse, a as getClientIp, c as checkRateLimit, b as generateEmail, d as compileMjml, j as jsonResponse } from '../../../chunks/http_BBYatej2.mjs';
export { renderers } from '../../../renderers.mjs';

const prerender = false;
const POST = async ({ request }) => {
  const parsed = generateRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("invalid_request", "Prompt must be between 10 and 2000 characters.", 400);
  }
  const ip = getClientIp(request);
  const limit = checkRateLimit("generate", ip);
  if (!limit.allowed) {
    return errorResponse("rate_limit_exceeded", "Rate limit exceeded.", 429, {
      type: limit.type,
      resetAt: limit.resetAt,
      usage: { remaining: limit.remaining }
    });
  }
  try {
    const output = await generateEmail(parsed.data.prompt);
    const { html } = compileMjml(output.mjml);
    return jsonResponse({
      ...output,
      html,
      usage: { remaining: limit.remaining }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed.";
    const status = message.includes("OPENAI_API_KEY") ? 503 : 500;
    return errorResponse(
      status === 503 ? "upstream_unavailable" : "generation_failed",
      status === 503 ? "OpenAI is not configured." : "Could not generate a valid email. Please try again.",
      status
    );
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
