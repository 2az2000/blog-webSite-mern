import { contentTimeZone, localeMeta, type Locale } from "@/i18n/config";

/*
 * All formatting goes through Intl with an explicit locale and time zone, so
 * the server and the browser always produce the same string (no hydration
 * mismatch) and Persian output uses Persian digits and the Solar Hijri
 * calendar without any extra library.
 */

const cache = new Map<string, Intl.DateTimeFormat | Intl.NumberFormat | Intl.RelativeTimeFormat>();

function memo<T extends Intl.DateTimeFormat | Intl.NumberFormat | Intl.RelativeTimeFormat>(key: string, make: () => T): T {
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

/** "2026-09-12T14:03:00Z" → "12 Sept 2026, 14:03" (UTC, so server and browser agree) */
export function formatDateTime(iso: string, locale: Locale): string {
  const f = memo(
    `datetime:${locale}`,
    () =>
      new Intl.DateTimeFormat(localeMeta[locale].intl, {
        year: "numeric",
        month: locale === "fa" ? "long" : "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone: contentTimeZone,
      }),
  );
  return f.format(new Date(iso));
}

/**
 * "5 minutes ago" / "۵ دقیقه پیش" — for a moment that has just happened, never for a calendar day
 * (use formatDate for those). Depends on the clock, so render it only after hydration.
 */
export function formatRelative(iso: string, locale: Locale, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const f = memo(`rel:${locale}`, () => new Intl.RelativeTimeFormat(localeMeta[locale].intl, { numeric: "auto" }));
  const abs = Math.abs(seconds);
  if (abs < 60) return f.format(0, "second");
  if (abs < 3600) return f.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return f.format(Math.round(seconds / 3600), "hour");
  if (abs < 30 * 86_400) return f.format(Math.round(seconds / 86_400), "day");
  return formatDate(iso.slice(0, 10), locale);
}

/** "Saturday" / "شنبه" */
export function formatWeekday(date: Date, locale: Locale): string {
  return memo(
    `weekday:${locale}`,
    () => new Intl.DateTimeFormat(localeMeta[locale].intl, { weekday: "long", timeZone: contentTimeZone }),
  ).format(date);
}

/** "September 12, 2026" — the masthead's date, month in full. */
export function formatLongDate(date: Date, locale: Locale): string {
  return memo(
    `longdate:${locale}`,
    () => new Intl.DateTimeFormat(localeMeta[locale].intl, { year: "numeric", month: "long", day: "numeric", timeZone: contentTimeZone }),
  ).format(date);
}
