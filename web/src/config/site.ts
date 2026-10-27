/** Facts about the publication that the masthead states. Editorial decisions, kept in one place. */

/** The year NOVA says it has been independent since ("Independent since 2019"). */
export const FOUNDED = 2019;

/**
 * The day issue Nº 0 was published. The front page counts issues from here, one
 * a day: the design export's edition of 12 September 2026 is Nº 412.
 */
export const FIRST_ISSUE = "2025-07-27";

/** The issue number of a calendar day (UTC, like every date on the site). */
export function issueNumber(today: Date): number {
  const day = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.max(0, Math.round((day - Date.parse(`${FIRST_ISSUE}T00:00:00Z`)) / 86_400_000));
}
