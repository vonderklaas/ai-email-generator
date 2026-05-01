/**
 * Best-effort MJML repair for common model failure modes.
 * Keep this conservative: only fix cases that are almost certainly invalid.
 */
export function repairMjml(mjml: string): { mjml: string; repaired: boolean } {
  let repaired = false;
  let next = mjml;

  const original = next;

  // Strip common markdown fences if the model wraps MJML in ``` blocks.
  // This breaks mjml parsing and often yields empty output with no errors.
  if (next.includes("```")) {
    const stripped = next
      .replace(/```[a-zA-Z]*\n?/g, "")
      .replace(/```/g, "")
      .trim();
    if (stripped !== next) {
      next = stripped;
      repaired = true;
    }
  }

  // Fix dangling href= (missing attribute value).
  // If we see `href=` not followed by a quote or non-whitespace value, set a safe placeholder.
  const danglingHref = /href=\s*(?=(\s|>|\/?>|$))/g;
  if (danglingHref.test(next)) {
    next = next.replace(danglingHref, 'href="https://example.com"');
    repaired = true;
  }

  // Fix unquoted href values (href=https://...) by quoting them.
  const unquotedHref = /href=(https?:\/\/[^\s">]+)/g;
  if (unquotedHref.test(next)) {
    next = next.replace(unquotedHref, 'href="$1"');
    repaired = true;
  }

  // Fix truncated quoted href values (e.g. href="https://ex) by replacing the entire href attribute.
  // Common model failure mode: output stops mid-URL, leaving an unterminated quote.
  // This regex matches href="... until end-of-string when the closing quote is missing.
  const danglingQuotedHrefAtEof = /href="[^"\n\r]*$/m;
  if (danglingQuotedHrefAtEof.test(next)) {
    next = next.replace(danglingQuotedHrefAtEof, 'href="https://example.com"');
    repaired = true;
  }

  // Also handle href="... followed by a newline but still missing the closing quote.
  const danglingQuotedHrefAtNewline = /href="[^"\n\r]*\n/m;
  if (danglingQuotedHrefAtNewline.test(next)) {
    next = next.replace(danglingQuotedHrefAtNewline, 'href="https://example.com"\n');
    repaired = true;
  }

  // Ensure MJML has a closing </mjml>. If missing, add it.
  if (next.includes("<mjml") && !next.includes("</mjml>")) {
    next = `${next}\n</mjml>\n`;
    repaired = true;
  }

  // Ensure mj-body exists. If missing, wrap content.
  if (next.includes("<mjml") && !next.includes("<mj-body")) {
    next = next.replace(/<mjml[^>]*>/, (m) => `${m}\n<mj-body>`);
    next = next.replace(/<\/mjml>/, "</mj-body>\n</mjml>");
    repaired = true;
  }

  // Best-effort closure for common truncation: if we have opening mj tags but missing closers, append them.
  // This is intentionally naive, but it rescues many mid-output truncations.
  const requiredClosers = ["</mj-image>", "</mj-button>", "</mj-column>", "</mj-section>", "</mj-body>", "</mjml>"] as const;
  if (next.includes("<mjml") && next.includes("<mj-body")) {
    for (const closer of requiredClosers) {
      if (!next.includes(closer)) {
        next += `\n${closer}`;
        repaired = true;
      }
    }
  }

  // If the output ends abruptly inside an mj-text tag, close it.
  // This is a very common truncation pattern (cut mid-sentence).
  const openTextCount = (next.match(/<mj-text\b/g) ?? []).length;
  const closeTextCount = (next.match(/<\/mj-text>/g) ?? []).length;
  if (openTextCount > closeTextCount) {
    next += "\n</mj-text>";
    repaired = true;
  }

  // If the output looks obviously truncated (ends with whitespace, a partial tag, or an unterminated attribute),
  // force-close the tree even if some closers exist later (defensive in case of duplication).
  const endsSuspiciously = /(<mj-[a-z-]+[^>]*$|href="[^"]*$|\s+$)/m.test(original);
  if (endsSuspiciously && next !== original) {
    repaired = true;
  }

  return { mjml: next, repaired };
}
