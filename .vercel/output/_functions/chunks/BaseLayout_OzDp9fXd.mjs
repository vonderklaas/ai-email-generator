import { e as createAstro, f as createComponent, h as addAttribute, r as renderTemplate, l as renderHead, n as renderSlot } from './astro/server_Dea09CxC.mjs';
import 'piccolore';
import 'clsx';
/* empty css                         */

const $$Astro = createAstro("https://www.digistorms.ai");
const $$BaseLayout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$BaseLayout;
  const siteUrl = "https://www.digistorms.ai";
  const normalizePath = (path) => path.length > 1 ? path.replace(/\/+$/, "") : path;
  const {
    title,
    description,
    canonical = new URL(normalizePath(Astro2.url.pathname), siteUrl).href,
    ogImage = `${siteUrl}/og/ai-email-generator.webp`,
    ogTitle = title,
    ogDescription = description,
    noindex = false
  } = Astro2.props;
  return renderTemplate`<html lang="en"> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="theme-color" content="#2563EB"><title>${title}</title><meta name="description"${addAttribute(description, "content")}><link rel="canonical"${addAttribute(canonical, "href")}>${noindex && renderTemplate`<meta name="robots" content="noindex, follow">`}<meta property="og:site_name" content="DigiStorms"><meta property="og:type" content="website"><meta property="og:title"${addAttribute(ogTitle, "content")}><meta property="og:description"${addAttribute(ogDescription, "content")}><meta property="og:url"${addAttribute(canonical, "content")}><meta property="og:image"${addAttribute(ogImage, "content")}><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title"${addAttribute(ogTitle, "content")}><meta name="twitter:description"${addAttribute(ogDescription, "content")}><meta name="twitter:image"${addAttribute(ogImage, "content")}>${renderHead()}</head> <body> ${renderSlot($$result, $$slots["default"])} </body></html>`;
}, "/Users/vonderklaas/Repositories/ai-email-generator/src/layouts/BaseLayout.astro", void 0);

export { $$BaseLayout as $ };
