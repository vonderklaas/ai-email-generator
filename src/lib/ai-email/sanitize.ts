// Keep sanitization minimal because we already render inside a sandboxed iframe
// (no scripts/forms allowed). Overly-aggressive stripping can accidentally
// remove legitimate MJML output and produce an empty preview.
const UNSAFE_TAGS = /<\s*\/?\s*(script|iframe|object|embed|form)\b[^>]*>/gi;
const EVENT_HANDLER_ATTRS = /\s+on[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi;
const JAVASCRIPT_URLS = /\s+(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi;

export function sanitizeCompiledHtml(html: string): string {
  return html
    .replace(UNSAFE_TAGS, "")
    .replace(EVENT_HANDLER_ATTRS, "")
    .replace(JAVASCRIPT_URLS, "");
}
