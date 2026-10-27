/**
 * The editorial rules, kept pure so they can be tested without a database:
 * which status may follow which, who may do what, and how a title becomes a slug.
 */
import type { ArticleStatus } from "../../models/article.model.js";
import type { Role } from "../../models/user.model.js";

/**
 * draft → scheduled / published · scheduled → draft / published (or a new time) ·
 * published → archived / draft (unpublish) · archived → draft / published
 */
const NEXT: Record<ArticleStatus, readonly ArticleStatus[]> = {
  draft: ["scheduled", "published"],
  scheduled: ["scheduled", "draft", "published"],
  published: ["archived", "draft"],
  archived: ["draft", "published"],
};

export const canTransition = (from: ArticleStatus, to: ArticleStatus): boolean => NEXT[from].includes(to);

/** Staff who decide what goes live. Writers only draft. */
export const isEditorial = (role: Role | string): boolean => role === "editor" || role === "admin";

export const canWrite = (role: Role | string): boolean => role === "writer" || isEditorial(role);

/** Writers touch only their own drafts; editors and admins touch anything. */
export function canEditArticle(
  actor: { id: string; role: Role | string },
  article: { createdBy?: { toString(): string } | null; status: ArticleStatus },
): boolean {
  if (isEditorial(actor.role)) return true;
  return actor.role === "writer" && article.status === "draft" && article.createdBy?.toString() === actor.id;
}

export function canViewArticle(
  actor: { id: string; role: Role | string },
  article: { createdBy?: { toString(): string } | null },
): boolean {
  return isEditorial(actor.role) || article.createdBy?.toString() === actor.id;
}

/**
 * Pictures in the body that nobody described. A figure or full-width break needs
 * alt text unless it is marked decorative; checked when an article goes live
 * (a draft may be unfinished). Returns the dotted paths, e.g. `body.3.alt`.
 */
export function blocksMissingAlt(body: readonly unknown[]): string[] {
  const missing: string[] = [];
  body.forEach((raw, i) => {
    const b = raw as { type?: string; alt?: unknown; decorative?: unknown };
    if ((b.type === "figure" || b.type === "break") && b.decorative !== true && (typeof b.alt !== "string" || b.alt.trim() === "")) {
      missing.push(`body.${i}.alt`);
    }
  });
  return missing;
}

/** Latin titles only: a non-Latin title yields "" and the editor must supply a slug. */
export function slugify(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** The first of `base`, `base-2`, `base-3` … not in `taken`. */
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/**
 * The page copy a new article starts with, so the editor opens on a complete
 * (if empty) form and a first save changes nothing it did not touch.
 */
export function defaultDetail(kind: string, section: string): Record<string, unknown> {
  if (kind === "longread") {
    return { eyebrow: "", heroAlt: "", bylineRole: "", reporterBio: "", filedUnder: [], relatedSection: section, related: [] };
  }
  return { label: "", heroAlt: "", heroCaption: "", heroCredit: "", dropcap: true };
}
