import mjml2html from 'mjml';
import 'openai';
import { z } from 'zod';

const UNSAFE_TAGS = /<\s*\/?\s*(script|iframe|object|embed|form|input|button|textarea|select|option|link|meta)\b[^>]*>/gi;
const EVENT_HANDLER_ATTRS = /\s+on[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi;
const JAVASCRIPT_URLS = /\s+(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi;
function sanitizeCompiledHtml(html) {
  return html.replace(UNSAFE_TAGS, "").replace(EVENT_HANDLER_ATTRS, "").replace(JAVASCRIPT_URLS, "");
}

function compileMjml(mjml) {
  try {
    const result = mjml2html(mjml, {
      validationLevel: "soft",
      keepComments: false
    });
    const sanitizedHtml = sanitizeCompiledHtml(result.html ?? "");
    if (!sanitizedHtml || sanitizedHtml.length < 100) {
      throw new Error("MJML compiled to empty HTML.");
    }
    return {
      html: sanitizedHtml,
      warnings: result.errors?.map((error) => error.formattedMessage || error.message) ?? []
    };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "MJML compilation failed.", {
      cause: error
    });
  }
}

const SYSTEM_PROMPT = `You are a senior SaaS email designer writing production-ready MJML for indie-hacker SaaS founders. Your emails are short, direct, and beautifully typeset. You write like Linear, Vercel, or Resend: minimal, high-quality, confident, never corporate.

Product goal:
- Create one ready-to-ship SaaS email from the user's prompt.
- Output subject, preheader, and full MJML.
- Optimize for copy clarity, one strong CTA, and mobile readability.

MJML constraints:
- Output valid MJML only inside the mjml field.
- Use mjml, mj-body, mj-section, mj-column, mj-text, mj-button, mj-divider, and mj-spacer.
- Do not use raw html, script, iframe, forms, custom style tags, external images, gradients, or emoji-heavy output.
- Use one H1 maximum.
- Use short paragraphs. Avoid dense blocks.
- Use one primary CTA button.
- Font stack: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif.
- Primary text: #0F172A. Muted text: #475569. Accent: #2563EB.
- Email width around 600px. Buttons should be pill-shaped with border-radius 999px.

Writing constraints:
- Be specific to the user's product and audience.
- Avoid placeholders like [name], lorem ipsum, or generic filler unless the prompt explicitly asks for merge tags.
- Avoid fake metrics, fake customer quotes, and unsupported claims.
- Keep the tone calm, useful, and founder-friendly.

Output only the requested JSON schema.`;
function generationUserPrompt(prompt) {
  return `Create a single SaaS email for this brief:

${prompt}`;
}
function refinementUserPrompt(args) {
  return `Refine the current email according to the latest instruction.

Original user prompt:
${args.originalPrompt}

Current subject:
${args.subject}

Current preheader:
${args.preheader}

Current MJML:
${args.mjml}

Latest instruction:
${args.instruction}

Return the full updated email, not a diff.`;
}

const emailOutputSchema = z.object({
  subject: z.string().min(1).max(120),
  preheader: z.string().min(1).max(200),
  mjml: z.string().min(20)
});
emailOutputSchema.extend({
  html: z.string().min(100)
});
const generateRequestSchema = z.object({
  prompt: z.string().trim().min(10).max(2e3)
});
const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4e3)
});
const refineRequestSchema = z.object({
  originalPrompt: z.string().trim().min(10).max(2e3),
  currentEmail: z.object({
    subject: z.string().min(1).max(120),
    preheader: z.string().min(1).max(200),
    mjml: z.string().min(20).max(3e4)
  }),
  messages: z.array(chatMessageSchema).max(20).default([]),
  newMessage: z.string().trim().min(2).max(1e3)
});
const openAIJsonSchema = {
  name: "email_output",
  strict: true,
  schema: {
    type: "object",
    properties: {
      subject: { type: "string", maxLength: 120 },
      preheader: { type: "string", maxLength: 200 },
      mjml: { type: "string" }
    },
    required: ["subject", "preheader", "mjml"],
    additionalProperties: false
  }
};

function getClient() {
  {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
}
function getModel() {
  return "gpt-4o";
}
function parseContent(content) {
  if (!content) throw new Error("OpenAI returned empty content.");
  return emailOutputSchema.parse(JSON.parse(content));
}
async function createStructuredEmail(messages) {
  const completion = await getClient().chat.completions.create({
    model: getModel(),
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages
    ],
    response_format: {
      type: "json_schema",
      json_schema: openAIJsonSchema
    }
  });
  return parseContent(completion.choices[0]?.message?.content ?? null);
}
async function generateEmail(prompt) {
  return withOneRetry(
    () => createStructuredEmail([
      { role: "user", content: generationUserPrompt(prompt) }
    ])
  );
}
async function refineEmail(args) {
  return withOneRetry(
    () => createStructuredEmail([
      { role: "user", content: refinementUserPrompt(args) }
    ])
  );
}
async function withOneRetry(fn) {
  try {
    return await fn();
  } catch (firstError) {
    try {
      return await fn();
    } catch {
      throw firstError;
    }
  }
}

const counters = /* @__PURE__ */ new Map();
const LIMITS = {
  generateDaily: 5,
  generateHourly: 3,
  refineDaily: 30
};
function getClientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
function startOfNextUtcDay(now) {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
}
function startOfNextUtcHour(now) {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() + 1);
}
function getCounter(key, resetAt, nowMs) {
  const existing = counters.get(key);
  if (existing && existing.resetAt > nowMs) return existing;
  const fresh = { count: 0, resetAt };
  counters.set(key, fresh);
  return fresh;
}
function remainingFor(ip, now) {
  const nowMs = now.getTime();
  const dayReset = startOfNextUtcDay(now);
  const hourReset = startOfNextUtcHour(now);
  const genDaily = getCounter(`${ip}:generate:day`, dayReset, nowMs);
  const genHourly = getCounter(`${ip}:generate:hour`, hourReset, nowMs);
  const refineDaily = getCounter(`${ip}:refine:day`, dayReset, nowMs);
  return {
    generatesToday: Math.max(0, LIMITS.generateDaily - genDaily.count),
    generatesThisHour: Math.max(0, LIMITS.generateHourly - genHourly.count),
    refinesToday: Math.max(0, LIMITS.refineDaily - refineDaily.count)
  };
}
function checkRateLimit(action, ip, now = /* @__PURE__ */ new Date()) {
  if (ip === "unknown") {
    return { allowed: true, remaining: remainingFor(ip, now) };
  }
  const nowMs = now.getTime();
  const dayReset = startOfNextUtcDay(now);
  const hourReset = startOfNextUtcHour(now);
  const remaining = remainingFor(ip, now);
  if (action === "generate") {
    const daily = getCounter(`${ip}:generate:day`, dayReset, nowMs);
    const hourly = getCounter(`${ip}:generate:hour`, hourReset, nowMs);
    if (daily.count >= LIMITS.generateDaily) {
      return { allowed: false, type: "daily", resetAt: new Date(dayReset).toISOString(), remaining };
    }
    if (hourly.count >= LIMITS.generateHourly) {
      return { allowed: false, type: "hourly", resetAt: new Date(hourReset).toISOString(), remaining };
    }
    daily.count += 1;
    hourly.count += 1;
    return { allowed: true, remaining: remainingFor(ip, now) };
  }
  const refineDaily = getCounter(`${ip}:refine:day`, dayReset, nowMs);
  if (refineDaily.count >= LIMITS.refineDaily) {
    return { allowed: false, type: "daily", resetAt: new Date(dayReset).toISOString(), remaining };
  }
  refineDaily.count += 1;
  return { allowed: true, remaining: remainingFor(ip, now) };
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}
function errorResponse(error, message, status, extra = {}) {
  return jsonResponse({ error, message, ...extra }, status);
}
function sseEvent(event, data) {
  return `event: ${event}
data: ${JSON.stringify(data)}

`;
}

export { getClientIp as a, generateEmail as b, checkRateLimit as c, compileMjml as d, errorResponse as e, refineEmail as f, generateRequestSchema as g, jsonResponse as j, refineRequestSchema as r, sseEvent as s };
