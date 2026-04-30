import mjml2html from "mjml";
import { sanitizeCompiledHtml } from "./sanitize";
import { repairMjml } from "./mjmlRepair";

export type CompileResult = {
  html: string;
  warnings: string[];
};

export async function compileMjml(mjml: string): Promise<CompileResult> {
  try {
    const attempt = repairMjml(mjml);
    const result = await mjml2html(attempt.mjml, {
      validationLevel: "soft",
      keepComments: false,
    });

    const sanitizedHtml = sanitizeCompiledHtml(result.html ?? "");
    // Some valid MJML can compile to a small HTML payload (especially during iteration).
    // Treat only truly-empty output as fatal.
    if (!sanitizedHtml || sanitizedHtml.trim().length === 0) {
      /* c8 ignore next 12 */
      if (import.meta.env.DEV) {
        console.error("[MJML] empty HTML output", {
          repaired: attempt.repaired,
          mjmlLength: attempt.mjml.length,
          mjmlPreview: attempt.mjml.slice(0, 1200),
          mjmlErrors: result.errors,
          mjmlErrorCount: Array.isArray(result.errors) ? result.errors.length : null,
          htmlPreview: (result.html ?? "").slice(0, 300),
        });
      }
      throw new Error("MJML compiled to empty HTML.");
    }

    return {
      html: sanitizedHtml,
      warnings: result.errors?.map((error) => error.formattedMessage || error.message) ?? [],
    };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "MJML compilation failed.", {
      cause: error,
    });
  }
}

export type CompileFailure = {
  html: null;
  warnings: string[];
  error: string;
};

export async function compileMjmlSafe(mjml: string): Promise<CompileResult | CompileFailure> {
  try {
    return await compileMjml(mjml);
  } catch (error) {
    const message = error instanceof Error ? error.message : "MJML compilation failed.";
    return {
      html: null,
      warnings: [],
      error: message,
    };
  }
}
