/**
 * Resolve a solid CTA background from scraped theme-color (or similar).
 * Falls back to near-black when missing, invalid, or too light for white label text.
 */
const DEFAULT_CTA = "#000000";

function clamp255(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

/** Parse #rgb or #rrggbb (case-insensitive). */
export function parseHexColor(input: string | undefined | null): [number, number, number] | null {
  if (!input) return null;
  const s = input.trim();
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
  if (!m) return null;
  const h = m[1];
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    return [r, g, b];
  }
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function toHex([r, g, b]: [number, number, number]) {
  const x = (n: number) => clamp255(n).toString(16).padStart(2, "0");
  return `#${x(r)}${x(g)}${x(b)}`.toUpperCase();
}

/** Relative luminance (sRGB), 0–1. */
export function relativeLuminance(rgb: [number, number, number]): number {
  const lin = rgb.map((c) => {
    const v = clamp255(c) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/** True if white (#FFF) text on this background is likely illegible or fails a soft bar. */
export function isTooLightForWhiteButton(rgb: [number, number, number]): boolean {
  const L = relativeLuminance(rgb);
  return L > 0.82;
}

function isNearWhite(rgb: [number, number, number]) {
  return rgb[0] > 245 && rgb[1] > 245 && rgb[2] > 245;
}

function isNearBlack(rgb: [number, number, number]) {
  return relativeLuminance(rgb) < 0.035;
}

function colorChroma(rgb: [number, number, number]) {
  return Math.max(...rgb) - Math.min(...rgb);
}

/**
 * When meta theme-color is white (common for PWAs), infer a solid accent from repeated
 * hex colors in the HTML (inline styles, CSS-in-JS, SVG fills, etc.).
 */
export function pickDominantBrandHexFromHtml(html: string): string | undefined {
  const re = /#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/gi;
  const counts = new Map<string, number>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const rgb = parseHexColor(m[0]);
    if (!rgb) continue;
    if (isNearWhite(rgb)) continue;
    if (isTooLightForWhiteButton(rgb)) continue;
    if (isNearBlack(rgb)) continue;
    const key = toHex(rgb);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (counts.size === 0) return undefined;

  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const maxCount = entries[0][1];
  const minCount = Math.max(2, Math.ceil(maxCount * 0.25));

  const chroma = (hex: string) => colorChroma(parseHexColor(hex)!);
  const lum = (hex: string) => relativeLuminance(parseHexColor(hex)!);

  const vibrant = entries.filter(([h, c]) => c >= minCount && chroma(h) >= 70 && lum(h) >= 0.05 && lum(h) <= 0.75);
  if (vibrant.length) {
    vibrant.sort((a, b) => {
      const d = chroma(b[0]) - chroma(a[0]);
      if (d !== 0) return d;
      return b[1] - a[1];
    });
    return vibrant[0][0];
  }

  const muted = entries.filter(([h, c]) => c >= minCount && chroma(h) >= 22 && lum(h) <= 0.45);
  if (muted.length) {
    muted.sort((a, b) => b[1] - a[1]);
    return muted[0][0];
  }

  return entries[0][0];
}

/**
 * Prefer meta theme-color when it is a usable dark/mid fill; otherwise use a hex inferred
 * from the page HTML; finally near-black.
 */
export function resolveCtaBackgroundColor(themeColor?: string | null, scrapedAccentHex?: string | null): string {
  const metaRgb = parseHexColor(themeColor ?? undefined);
  if (metaRgb && !isTooLightForWhiteButton(metaRgb)) return toHex(metaRgb);

  const htmlRgb = parseHexColor(scrapedAccentHex ?? undefined);
  if (htmlRgb && !isTooLightForWhiteButton(htmlRgb)) return toHex(htmlRgb);

  return DEFAULT_CTA;
}

const MJ_BUTTON_OPEN = /<mj-button\b([^>]*)>/i;

/** Force the first primary CTA button to use the resolved background color. */
export function applyResolvedCtaColorToMjml(mjml: string, hex: string): string {
  return mjml.replace(MJ_BUTTON_OPEN, (_, attrs: string) => {
    const a = String(attrs);
    if (/background-color\s*=\s*["'][^"']*["']/i.test(a)) {
      return `<mj-button${a.replace(/background-color\s*=\s*["'][^"']*["']/i, `background-color="${hex}"`)}>`;
    }
    return `<mj-button background-color="${hex}"${a}>`;
  });
}

/** If the first mj-button background is missing or nearly white, set it to DEFAULT_CTA (refine path). */
export function coercePrimaryCtaIfIllegible(mjml: string): string {
  return mjml.replace(MJ_BUTTON_OPEN, (_, attrs: string) => {
    const a = String(attrs);
    const m = /background-color\s*=\s*["']([^"']+)["']/i.exec(a);
    if (!m) {
      return `<mj-button background-color="${DEFAULT_CTA}"${a}>`;
    }
    const rgb = parseHexColor(m[1].trim());
    if (!rgb || isTooLightForWhiteButton(rgb)) {
      return `<mj-button${a.replace(/background-color\s*=\s*["'][^"']+["']/i, `background-color="${DEFAULT_CTA}"`)}>`;
    }
    return `<mj-button${a}>`;
  });
}
