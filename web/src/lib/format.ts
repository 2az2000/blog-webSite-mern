import { contentTimeZone, localeMeta, type Locale } from "@/i18n/config";

/*
 * All formatting goes through Intl with an explicit locale and time zone, so
 * the server and the browser always produce the same string (no hydration
 * mismatch) and Persian output uses Persian digits and the Solar Hijri
 * calendar without any extra library.
 */

const cache = new Map<string, Intl.DateTimeFormat | Intl.NumberFormat>();

function memo<T extends Intl.DateTimeFormat | Intl.NumberFormat>(key: string, make: () => T): T {
  let f = cache.get(key) as T | undefined;
  if (!f) {
    f = make();
    cache.set(key, f);
  }
  return f;
}

/** "2026-09-12" → "۲۱ شهریور ۱۴۰۵" (fa) · "12 Sept 2026" (en) */
export function formatDate(isoDate: string, locale: Locale): string {
  const f = memo(
    `date:${locale}`,
    () =>
      new Intl.DateTimeFormat(localeMeta[locale].intl, {
        year: "numeric",
        month: locale === "fa" ? "long" : "short",
        day: "numeric",
        timeZone: contentTimeZone,
      }),
  );
  // Noon UTC keeps the calendar day stable in every zone from UTC−12 to UTC+11.
  return f.format(new Date(`${isoDate}T12:00:00Z`));
}

/** 14 → "۱۴" */
export function formatNumber(value: number, locale: Locale): string {
  return memo(`num:${locale}`, () => new Intl.NumberFormat(localeMeta[locale].intl)).format(value);
}

/** 84200 → "۸۴ هزار" (fa) · "84K" (en) — the reference's fmtNum. */
export function formatCompact(value: number, locale: Locale): string {
  const digits = value >= 10_000 ? 0 : 1;
  return memo(
    `compact:${locale}:${digits}`,
    () =>
      new Intl.NumberFormat(localeMeta[locale].intl, {
        notation: "compact",
        maximumFractionDigits: digits,
      }),
  )
    .format(value)
    .replace(/k$/, "K");
}

/** 3 → "۰۳" — section indices and ranks are always two digits. */
export function formatIndex(value: number, locale: Locale): string {
  return memo(
    `index:${locale}`,
    () => new Intl.NumberFormat(localeMeta[locale].intl, { minimumIntegerDigits: 2, useGrouping: false }),
  ).format(value);
}
