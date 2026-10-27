/**
 * The Dispatch's rules as pure functions: who an issue is for, and the
 * stateless links that let anyone manage or leave without an account.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env.js";
import type { Frequency, IssueKind } from "../../models/newsletter.model.js";

/**
 * Frequency → which issues arrive.
 *   both    Tuesday and Friday (the default)
 *   weekly  Friday only — "the week in one issue"
 *   monthly the monthly long-read digest only
 */
const RECEIVES: Record<Frequency, readonly IssueKind[]> = {
  both: ["tuesday", "friday"],
  weekly: ["friday"],
  monthly: ["monthly"],
};

/** Frequencies that receive an issue of this kind. */
export const frequenciesFor = (kind: IssueKind): Frequency[] =>
  (Object.keys(RECEIVES) as Frequency[]).filter((f) => RECEIVES[f].includes(kind));

/** The topic keys an issue covers: the desk of each story, and `longreads` for a long read. */
export function topicsOfIssue(stories: { section: string; kind: string }[]): Set<string> {
  const keys = new Set<string>();
  for (const s of stories) {
    keys.add(s.section);
    if (s.kind === "longread") keys.add("longreads");
  }
  return keys;
}

/** A subscriber with no topics wants everything; otherwise the issue must touch one of theirs. */
export const issueFitsTopics = (subscriberTopics: readonly string[], issueTopics: ReadonlySet<string>): boolean =>
  subscriberTopics.length === 0 || subscriberTopics.some((t) => issueTopics.has(t));

/* — Links that need no login ———————————————————————————————— */

const key = () => `${env.refreshTokenSecret}:newsletter`;

/**
 * `<subscriber id>.<signature>`. Anyone holding the link may manage or leave that
 * one subscription — that is the point of a link in an e-mail — and cannot
 * derive another subscriber's link. Nothing is stored, so it never expires.
 */
export function manageToken(subscriberId: string): string {
  return `${subscriberId}.${createHmac("sha256", key()).update(subscriberId).digest("hex").slice(0, 32)}`;
}

/** The subscriber id a genuine link names, or null. */
export function readManageToken(token: string): string | null {
  const [id, sig, extra] = token.split(".");
  if (!id || !sig || extra !== undefined || !/^[a-f0-9]{24}$/.test(id)) return null;
  const expected = manageToken(id).split(".")[1]!;
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? id : null;
}

/** How long a confirmation link stays good. */
export const CONFIRM_TTL_MS = 7 * 24 * 3_600_000;
/** A second sign-up for a pending address does not send another e-mail within this window. */
export const CONFIRM_RESEND_AFTER_MS = 2 * 60_000;
