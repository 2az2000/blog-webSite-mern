import Link from "next/link";
import type { ReactNode } from "react";

import { refLink } from "@/components/primitives";
import type { Locale } from "@/i18n/config";
import { localeMeta } from "@/i18n/config";
import { dictionaries } from "@/i18n/dictionaries";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/* Breadcrumbs and pagination — reference nova.css §11, §13 and §20. */

export type Crumb = { label: ReactNode; href?: string };

/* The reference recolours breadcrumbs inside the inverted heroes
   (.category-hero .breadcrumbs); that is the `photo` tone. */
const CRUMBS = {
  default: { list: "text-meta", link: "hover:text-brand", current: "text-fg", sep: "before:text-muted-soft" },
  photo: { list: "text-paper/75", link: "hover:text-white", current: "text-paper", sep: "before:text-paper/45" },
} as const;

/** .breadcrumbs — the last crumb is the current page and is not a link. */
export function Breadcrumbs({
  items,
  label,
  tone = "default",
  className,
}: {
  items: Crumb[];
  label: string;
  tone?: keyof typeof CRUMBS;
  className?: string;
}) {
  const t = CRUMBS[tone];
  return (
    <nav aria-label={label} className={className}>
      <ol className={cn("flex flex-wrap items-center gap-2 py-4 text-caption", t.list)}>
        {items.map((c, i) => (
          <li
            key={i}
            className={cn("flex list-none items-center gap-2", i > 0 && ["before:content-['/']", t.sep])}
          >
            {c.href && i < items.length - 1 ? (
              // classless in the reference: accent + underline; hover per .breadcrumbs a:hover
              <Link href={c.href} className={cn(refLink.link, "hover:underline-offset-3", t.link)}>
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className={t.current}>
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Page numbers with an ellipsis window: 1 … 4 5 6 … 12 (on page 1: 1 2 3 … 12, as the reference) */
function pageWindow(current: number, total: number): (number | "gap")[] {
  const pages = new Set([1, total, current - 1, current, current + 1, ...(current === 1 ? [3] : [])]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? (["gap", p] as const) : [p]));
}

/* .pagination a, .pagination span */
const ITEM = [
  "inline-grid h-11 min-w-11 place-items-center rounded-md border border-transparent px-2",
  "text-label text-meta tabular-nums transition-all duration-180 ease-in-out",
];
/* classless reference links keep the base underline */
const PAGE_LINK = [ITEM, refLink.underline, "hover:border-strong hover:text-fg"];
const CURRENT = "aria-[current=page]:bg-fg aria-[current=page]:font-650 aria-[current=page]:text-bg";
const DISABLED = "pointer-events-none opacity-40";

/** .pagination — the reference marks direction with text arrows. */
export function Pagination({
  current,
  total,
  hrefFor,
  locale,
  className,
}: {
  current: number;
  total: number;
  hrefFor: (page: number) => string;
  locale: Locale;
  className?: string;
}) {
  const t = dictionaries[locale].a11y;
  if (total <= 1) return null;
  const rtl = localeMeta[locale].dir === "rtl";
  const prev = rtl ? "→" : "←";
  const next = rtl ? "←" : "→";
  return (
    <nav className={cn("flex items-center justify-center gap-1 py-8", className)} aria-label={t.pagination}>
      {current > 1 ? (
        <Link href={hrefFor(current - 1)} aria-label={t.previousPage} className={cn(PAGE_LINK)}>
          {prev}
        </Link>
      ) : (
        <span aria-hidden="true" className={cn(ITEM, DISABLED)}>
          {prev}
        </span>
      )}
      {pageWindow(current, total).map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className={cn(ITEM)}>
            …
          </span>
        ) : (
          <Link
            key={p}
            href={hrefFor(p)}
            aria-current={p === current ? "page" : undefined}
            className={cn(PAGE_LINK, CURRENT)}
          >
            {formatNumber(p, locale)}
          </Link>
        ),
      )}
      {current < total ? (
        <Link href={hrefFor(current + 1)} aria-label={t.nextPage} className={cn(PAGE_LINK)}>
          {next}
        </Link>
      ) : (
        <span aria-hidden="true" className={cn(ITEM, DISABLED)}>
          {next}
        </span>
      )}
    </nav>
  );
}
