export const locales = ["en", "fa"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

type LocaleMeta = {
  /** Writing direction for <html dir>. */
  dir: "rtl" | "ltr";
  /** BCP 47 tag handed to Intl. `fa-IR` formats dates in the Solar Hijri calendar. */
  intl: string;
  /** Name of the language in that language. */
  label: string;
};

export const localeMeta: Record<Locale, LocaleMeta> = {
  fa: { dir: "rtl", intl: "fa-IR", label: "فارسی" },
  en: { dir: "ltr", intl: "en-US", label: "English" },
};

/** Dates are stored as calendar days; format them in one fixed zone so server and client agree. */
export const contentTimeZone = "UTC";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
