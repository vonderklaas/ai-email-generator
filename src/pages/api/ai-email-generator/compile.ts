import type { APIRoute } from "astro";
import { compileMjmlSafe } from "@/lib/ai-email/mjml";
import { checkRateLimit, getClientIp } from "@/lib/ai-email/rateLimit";
import { compileRequestSchema } from "@/lib/ai-email/schemas";
import { errorResponse, jsonResponse } from "@/lib/ai-email/http";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const parsed = compileRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("invalid_request", "MJML is required.", 400);
  }

  // Treat compile as a "refine-like" action for abuse protection.
  const ip = getClientIp(request);
  const limit = checkRateLimit("refine", ip);
  if (!limit.allowed) {
    return errorResponse("rate_limit_exceeded", "Rate limit exceeded.", 429, {
      type: limit.type,
      resetAt: limit.resetAt,
      usage: { remaining: limit.remaining },
    });
  }

  const compiled = await compileMjmlSafe(parsed.data.mjml);
  return jsonResponse({
    html: compiled.html,
    compileError: "error" in compiled ? compiled.error : undefined,
    usage: { remaining: limit.remaining },
  });
};

