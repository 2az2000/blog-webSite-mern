/**
 * The comment policy as pure functions, so it can be tested without a
 * database and read in one place.
 *
 * Nothing here deletes a comment: the worst a rule can do is *hold* it for a
 * person to look at. NOVA's comments are "moderated by people, not filters".
 */

/** Shorter than this and a comment waits for a moderator (the site tells readers so). */
export const MIN_PUBLISH_LENGTH = 10;
export const MAX_LENGTH = 2000;
/** More links than this and a comment waits, however long the author has been commenting. */
export const MAX_LINKS = 2;
/** Distinct readers reporting a published comment before it is pulled back for review. */
export const REPORT_HOLD_THRESHOLD = 3;
/** Comments one reader may post in a window, and the window. */
export const POST_LIMIT = 5;
export const POST_WINDOW_MS = 10 * 60_000;
/** How long after posting the author may still edit (once). */
export const EDIT_WINDOW_MS = 24 * 3_600_000;

/** Plain text only: trims, drops control characters and caps blank lines at one. */
export function normalizeBody(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const LINK = /(?:https?:\/\/|www\.)\S+/gi;

export const countLinks = (body: string): number => body.match(LINK)?.length ?? 0;

export type HoldReason = "short" | "links" | "first-link";

export interface Assessment {
  status: "published" | "held";
  reason?: HoldReason;
}

/**
 * Decides whether a new comment is published at once.
 * `hasPublishedBefore`: the author already has a published comment, so a single
 * link from them is believable (a first comment with a link is the classic spam shape).
 */
export function assess(body: string, hasPublishedBefore: boolean): Assessment {
  if (body.length < MIN_PUBLISH_LENGTH) return { status: "held", reason: "short" };
  const links = countLinks(body);
  if (links > MAX_LINKS) return { status: "held", reason: "links" };
  if (links > 0 && !hasPublishedBefore) return { status: "held", reason: "first-link" };
  return { status: "published" };
}

/** Why an edit is refused, or null when the author may still edit. */
export function editBlocked(c: { editCount: number; createdAt: Date; removedBy?: string }, now = Date.now()): "used" | "expired" | "deleted" | null {
  if (c.removedBy === "author") return "deleted";
  if (c.editCount >= 1) return "used";
  if (now - c.createdAt.getTime() > EDIT_WINDOW_MS) return "expired";
  return null;
}

export const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";
