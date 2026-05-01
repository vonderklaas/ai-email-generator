export type SiteContext = {
  url: string;
  title?: string;
  description?: string;
  ogImage?: string;
  themeColor?: string;
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

    return {
      url: url.href,
      title,
      description,
      ogImage,
      themeColor,
    };
  } catch {
    return { url: url.href };
  }
}

