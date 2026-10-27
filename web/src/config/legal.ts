/**
 * Legal texts in force. `POLICY_VERSION` is the date of the Privacy notice, Terms and
 * Cookie policy shown on the site; the API stamps the same value on each consent it
 * records (backend/src/config/legal.ts: keep the two equal). Bump both when the texts
 * change in a way readers must be told about.
 */
export const POLICY_VERSION = "2026-10-26";

/** The shape of the cookie choices (not the text): raise it to ask everyone again when the categories change. */
export const CONSENT_SCHEMA = 1;
