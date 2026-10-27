import { CONSENT_SCHEMA, POLICY_VERSION } from "@/config/legal";

/*
 * The visitor's cookie choice, kept in this browser only (there is no account to
 * attach it to, and nothing for a server to do with it). Essential items need no
 * consent; the one optional category, `preferences` (remembered theme, recent
 * searches), is stored only after the visitor allows it, and erased when they
 * take that back. No React here, so the theme boot code and hooks can use it.
 */

export const CONSENT_KEY = "nova:consent";

/** Items that exist only with the visitor's consent. */
export const PREFERENCE_KEYS = ["nova:theme", "nova:recent-searches"] as const;

export type Consent = {
  /** Shape of the choices; a different number means the visitor is asked again. */
  schema: number;
  preferences: boolean;
  /** When they chose, and which text was in force. */
  at: string;
  policy: string;
};

export function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Consent>;
    if (parsed.schema !== CONSENT_SCHEMA || typeof parsed.preferences !== "boolean") return null;
    return parsed as Consent;
  } catch {
    return null;
  }
}

/** May preference items be written right now? Not until the visitor has said yes. */
export const preferencesAllowed = (): boolean => readConsent()?.preferences === true;

/** Records the choice. Choosing "essential only" also erases whatever preference items were already stored. */
export function writeConsent(preferences: boolean): Consent {
  const consent: Consent = { schema: CONSENT_SCHEMA, preferences, at: new Date().toISOString(), policy: POLICY_VERSION };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    if (!preferences) for (const key of PREFERENCE_KEYS) localStorage.removeItem(key);
  } catch {
    // storage blocked: the choice holds for this page only, and nothing optional is stored anyway
  }
  return consent;
}
