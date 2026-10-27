import type { ApiError } from "@/lib/api";
import type { Dictionary } from "@/i18n/dictionaries";

/** The sentence a person should read for a failed save, publish or create. */
export function errorMessage(err: ApiError, t: Dictionary): string {
  if (err.code === "VERSION_CONFLICT") return t.admin.editor.conflict;
  if (err.code === "ARTICLE_INCOMPLETE") return t.admin.editor.incomplete;
  return err.message;
}

/** `path: message` lines from a validation failure's `details`. */
export function errorDetails(err: ApiError): string[] {
  const details = err.details;
  if (!Array.isArray(details)) return [];
  return details.flatMap((d) => {
    if (typeof d !== "object" || d === null) return [];
    const { path, message } = d as { path?: unknown; message?: unknown };
    return typeof message === "string" ? [path ? `${String(path)}: ${message}` : message] : [];
  });
}
