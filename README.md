# AI Email Generator

Free AI email generator for SaaS indie hackers. The app creates a ready-to-ship subject line, preheader, MJML, and compiled HTML from a prompt, then lets users refine the email in chat.

## Product Scope

- Prompt-first generation for one-off SaaS emails.
- Chat refinement for natural-language edits.
- Export HTML and MJML for tools like Loops, Resend, Postmark, and other email workflows.
- No authentication and no saved server-side user data.
- Primitive per-IP rate limiting in code, plus recommended Vercel/OpenAI guardrails.

## Architecture

This is one Astro SSR application:

- `src/pages/ai-email-generator/index.astro` renders the SEO page shell and mounts the React island.
- `src/components/react/ai-email/` contains the client UI, hooks, state, preview, chat, and export components.
- `src/pages/api/ai-email-generator/generate.ts` is the first-draft backend endpoint.
- `src/pages/api/ai-email-generator/refine.ts` is the chat-refinement backend endpoint.
- `src/lib/ai-email/` contains shared server logic for schemas, OpenAI calls, MJML compilation, sanitization, prompts, and rate limiting.

The browser calls same-origin API routes. It never receives `OPENAI_API_KEY` and never calls OpenAI directly.

```txt
React UI -> /api/ai-email-generator/generate -> OpenAI -> MJML compile -> React UI
React UI -> /api/ai-email-generator/refine   -> OpenAI -> MJML compile -> React UI
```

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Required environment variables:

```bash
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o
```

## Scripts

```bash
npm run dev            # local Astro dev server
npm run build          # production build
npm run preview        # preview built site
npm run test           # Vitest
npm run test:coverage  # coverage report
npm run typecheck      # Astro/TypeScript check
npm run lint           # ESLint
```

## Rate Limiting

The MVP includes a primitive module-level in-memory rate limiter:

- 5 generates per day per IP.
- 3 generates per hour per IP.
- 30 refinements per day per IP.

This is deliberately simple and has serverless limitations. It is not durable across cold starts or all Vercel function instances. Before a public launch, add Vercel firewall/rate-limit rules and an OpenAI spend alert. If usage grows, replace `src/lib/ai-email/rateLimit.ts` with Redis/KV-backed counters.

## Security Notes

- OpenAI is called only from server-side API routes.
- Generated HTML is rendered with `srcDoc` in a sandboxed iframe.
- The iframe must not include `allow-scripts` or `allow-forms`.
- MJML output is compiled server-side and sanitized before returning to the client.
- Client-exposed environment variables must use Astro's `PUBLIC_` prefix.

## Quality Loop

Founder-owned quality assets live in `docs/`:

- `docs/ai-email-test-prompts.md`
- `docs/ai-email-quality-rubric.md`
- `docs/architecture.md`

The product is only successful if realistic SaaS prompts produce emails the founder would send with minimal edits.
