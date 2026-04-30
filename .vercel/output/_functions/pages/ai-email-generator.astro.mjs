import { f as createComponent, k as renderComponent, r as renderTemplate } from '../chunks/astro/server_Dea09CxC.mjs';
import 'piccolore';
import { $ as $$BaseLayout } from '../chunks/BaseLayout_OzDp9fXd.mjs';
export { renderers } from '../renderers.mjs';

const prerender = false;
const $$Index = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "Free AI Email Generator for SaaS \u2014 DigiStorms", "description": "Create ready-to-ship SaaS emails with subject lines, preheaders, MJML, HTML, and chat refinement. Free, no login.", "ogImage": "https://www.digistorms.ai/og/ai-email-generator.webp" }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "AIEmailGeneratorApp", null, { "client:only": "react", "client:component-hydration": "only", "client:component-path": "@/components/react/AIEmailGeneratorApp", "client:component-export": "default" })} ` })}`;
}, "/Users/vonderklaas/Repositories/ai-email-generator/src/pages/ai-email-generator/index.astro", void 0);

const $$file = "/Users/vonderklaas/Repositories/ai-email-generator/src/pages/ai-email-generator/index.astro";
const $$url = "/ai-email-generator";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
