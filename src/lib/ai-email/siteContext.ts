import { pickDominantBrandHexFromHtml } from "./brandColors";

export type SiteContext = {
  url: string;
  title?: string;
  description?: string;
  ogImage?: string;
  themeColor?: string;
  /** Accent hex inferred from repeated colors in HTML when theme-color is white/unusable. */
  scrapedAccentHex?: string;
  /** Public profile URLs found in page links or JSON-LD (for footer socials). */
  socialUrls?: string[];
};

const PRIVATE_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

function isPrivateHostname(hostname: string) {
  const lower = hostname.toLowerCase();
  if (PRIVATE_HOSTS.has(lower)) return true;
  if (lower.endsWith(".local")) return true;
  if (/^10\./.test(lower)) return true;
  if (/^192\.168\./.test(lower)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(lower)) return true;
  return false;
}

export function normalizePublicUrl(value: string | undefined): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (isPrivateHostname(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

function pickMeta(html: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  return html.match(re)?.[1]?.trim();
}

function pickTitle(html: string) {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim();
}

function absoluteUrl(value: string | undefined, base: URL) {
  if (!value) return undefined;
  try {
    const url = new URL(value, base);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

const SOCIAL_ROOT_HOSTS = new Set([
  "twitter.com",
  "x.com",
  "linkedin.com",
  "github.com",
  "instagram.com",
  "facebook.com",
  "threads.net",
  "bsky.app",
  "youtube.com",
]);

function rootHostname(hostname: string) {
  return hostname.replace(/^www\./i, "").toLowerCase();
}

function isLikelySocialProfileUrl(url: URL): boolean {
  const root = rootHostname(url.hostname);
  if (!SOCIAL_ROOT_HOSTS.has(root)) return false;
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path === "/" || path.length < 2) return false;
  if (root === "youtube.com") {
    const ok =
      /^\/(channel|c|user)\/[^/]+/i.test(path) ||
      /^\/@[\w.-]+/i.test(path) ||
      /^\/watch\b/i.test(path);
    if (!ok) return false;
  }
  return true;
}

function collectHrefUrls(html: string, base: URL): string[] {
  const out: string[] = [];
  const re = /\bhref\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = m[1]?.trim();
    if (!href || href.startsWith("#") || href.toLowerCase().startsWith("javascript:")) continue;
    const abs = absoluteUrl(href, base);
    if (!abs) continue;
    try {
      const u = new URL(abs);
      if (isLikelySocialProfileUrl(u)) out.push(u.href);
    } catch {
      /* ignore */
    }
  }
  return out;
}

function collectJsonLdSameAs(html: string, base: URL): string[] {
  const out: string[] = [];
  const blockRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(html)) !== null) {
    const raw = m[1]?.trim();
    if (!raw) continue;
    try {
      const data = JSON.parse(raw) as unknown;
      const nodes = Array.isArray(data) ? data : [data];
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const sameAs = (node as { sameAs?: unknown }).sameAs;
        const list = Array.isArray(sameAs) ? sameAs : sameAs != null ? [sameAs] : [];
        for (const item of list) {
          if (typeof item !== "string") continue;
          const abs = absoluteUrl(item, base);
          if (!abs) continue;
          try {
            const u = new URL(abs);
            if (isLikelySocialProfileUrl(u)) out.push(u.href);
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      /* invalid JSON-LD */
    }
  }
  return out;
}

function dedupeSocialUrls(urls: string[], max = 6): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const href of urls) {
    const key = href.split("#")[0]?.toLowerCase() ?? href;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(href);
    if (out.length >= max) break;
  }
  return out;
}

export function extractSocialUrlsFromHtml(html: string, base: URL): string[] {
  return dedupeSocialUrls([...collectHrefUrls(html, base), ...collectJsonLdSameAs(html, base)]);
}

export async function fetchSiteContext(value: string | undefined): Promise<SiteContext | null> {
  const url = normalizePublicUrl(value);
  if (!url) return null;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "DigiStorms AI Email Generator" },
      signal: AbortSignal.timeout(3500),
    });
    if (!response.ok) return { url: url.href };

    const html = (await response.text()).slice(0, 150_000);
    const title = pickMeta(html, "og:title") ?? pickTitle(html);
    const description = pickMeta(html, "description") ?? pickMeta(html, "og:description");
    const themeColor = pickMeta(html, "theme-color");
    const ogImage = absoluteUrl(pickMeta(html, "og:image"), url);
    const socialUrls = extractSocialUrlsFromHtml(html, url);
    const scrapedAccentHex = pickDominantBrandHexFromHtml(html);

    return {
      url: url.href,
      title,
      description,
      ogImage,
      themeColor,
      ...(scrapedAccentHex ? { scrapedAccentHex } : {}),
      ...(socialUrls.length ? { socialUrls } : {}),
    };
  } catch {
    return { url: url.href };
  }
}

