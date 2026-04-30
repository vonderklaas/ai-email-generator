import { f as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_Dea09CxC.mjs';
import 'piccolore';
import { $ as $$BaseLayout } from '../chunks/BaseLayout_OzDp9fXd.mjs';
export { renderers } from '../renderers.mjs';

const prerender = false;
const $$Index = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "AI Email Generator for SaaS \u2014 DigiStorms", "description": "Generate ready-to-ship SaaS emails with AI, then refine them in chat." }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<main class="min-h-screen bg-background-warm px-6 py-20"> <section class="mx-auto max-w-3xl rounded-3xl bg-white p-10 text-center shadow-soft"> <p class="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-primary">DigiStorms free tool</p> <h1 class="font-serif text-5xl leading-tight text-slate-950">AI emails for SaaS, free</h1> <p class="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
Prompt your first draft, refine it in chat, and export production-ready HTML or MJML.
</p> <a href="/ai-email-generator" class="mt-8 inline-flex min-h-12 items-center rounded-full bg-primary px-6 font-semibold text-white transition hover:bg-blue-700">
Open the generator
</a> </section> </main> ` })}`;
}, "/Users/vonderklaas/Repositories/ai-email-generator/src/pages/index.astro", void 0);

const $$file = "/Users/vonderklaas/Repositories/ai-email-generator/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
