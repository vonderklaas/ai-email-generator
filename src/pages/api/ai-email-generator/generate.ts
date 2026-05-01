import type { APIRoute } from "astro";
import { compileMjmlSafe } from "@/lib/ai-email/mjml";
import { generateEmail } from "@/lib/ai-email/openai";
import { checkRateLimit, getClientIp } from "@/lib/ai-email/rateLimit";
import { generateRequestSchema } from "@/lib/ai-email/schemas";
import { fetchSiteContext, normalizePublicUrl } from "@/lib/ai-email/siteContext";
import { errorResponse, jsonResponse } from "@/lib/ai-email/http";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
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
      usage: { remaining: limit.remaining },
    });
  }

  try {
    const siteContext = await fetchSiteContext(parsed.data.companyUrl || undefined);
    const logoUrl = normalizePublicUrl(parsed.data.logoUrl || undefined)?.href ?? siteContext?.ogImage;
    const output = await generateEmail(parsed.data.prompt, {
      companyUrl: siteContext?.url ?? (parsed.data.companyUrl || undefined),
      logoUrl,
      title: siteContext?.title,
      description: siteContext?.description,
      themeColor: siteContext?.themeColor,
    });
    const compiled = await compileMjmlSafe(output.mjml);

    return jsonResponse({
      ...output,
      html: compiled.html,
      /* c8 ignore next */
      warnings: import.meta.env.DEV ? compiled.warnings : undefined,
      compileError: "error" in compiled ? compiled.error : undefined,
      usage: { remaining: limit.remaining },
    });
  } catch (error) {
    console.error("[/api/ai-email-generator/generate] failed:", error);

    const message = error instanceof Error ? error.message : "Generation failed.";
    const isOpenAIKeyMissing = message.includes("OPENAI_API_KEY");
    const isConnectionError =
      message.toLowerCase().includes("connection error") ||
      (error instanceof Error && (error as unknown as { cause?: unknown }).cause instanceof Error &&
        ((error as unknown as { cause?: Error }).cause?.message ?? "").toLowerCase().includes("enotfound"));

    const status = isOpenAIKeyMissing || isConnectionError ? 503 : 500;
    return errorResponse(
      status === 503 ? "upstream_unavailable" : "generation_failed",
      status === 503
        ? (isOpenAIKeyMissing
            ? "OpenAI is not configured."
            : "Could not reach OpenAI (network/DNS). Check internet, VPN, or DNS settings.")
        : (/* c8 ignore next */ import.meta.env.DEV ? message : "Could not generate a valid email. Please try again."),
      status,
    );
  }
};
