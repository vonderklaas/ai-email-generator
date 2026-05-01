/**
 * In-app iframe preview: default links to open in a new top-level tab instead of navigating the iframe.
 */
export function injectPreviewBaseTargetBlank(html: string): string {
  if (!html.trim()) return html;
  const base = '<base target="_blank" rel="noopener noreferrer">';
  if (/<head\b[^>]*>/i.test(html)) {
    return html.replace(/<head\b[^>]*>/i, (open) => `${open}${base}`);
  }
  if (/<html\b[^>]*>/i.test(html)) {
    return html.replace(/<html\b[^>]*>/i, (open) => `${open}<head>${base}</head>`);
  }
  return `<!DOCTYPE html><html><head>${base}<meta charset="utf-8"></head><body>${html}</body></html>`;
}
