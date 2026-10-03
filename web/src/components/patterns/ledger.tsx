import Link from "next/link";
import type { ReactNode } from "react";

import { Metabar } from "@/components/patterns/metabar";
import type { Locale } from "@/i18n/config";
import { dictionaries } from "@/i18n/dictionaries";
import { formatCompact, formatIndex, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ArticleView, Trend } from "@/types/content";

/*
 * S2 · Broadsheet ledger — reference nova.css §20 (.ledger) + §22, markup of
 * nova.js NOVA.ledger. Ranking as a printed table: a heavy rule on top,
 * hairlines between, a serif tabular numeral holding the left column and the
 * metric right-aligned so the eye reads down the figures.
 */

const LIST = "m-0 grid list-none gap-0 border-t-2 border-fg p-0";

const ROW = [
  "group/row relative grid items-baseline gap-x-6 gap-y-2 border-b border-border py-4",
  "focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-ring",
  "max-md:grid-cols-lead max-md:gap-x-4 max-md:gap-y-1",
];

const NUM = [
  "min-w-ledger font-serif text-ledger leading-90 font-semibold text-muted-soft tabular-nums max-sm:text-ledger-sm",
  "transition-colors duration-180 ease-in-out",
  "[@media(hover:hover)]:group-hover/row:text-brand group-focus-within/row:text-brand",
];

const TITLE = [
  "font-serif text-h4 leading-h4 font-semibold tracking-h4 text-fg",
  "underline decoration-transparent decoration-1 underline-offset-[0.16em]",
  "transition-[text-decoration-color] duration-180 ease-in-out",
  "after:absolute after:inset-0 after:content-[''] focus-visible:outline-none",
  "[@media(hover:hover)]:group-hover/row:decoration-brand",
];

const METRIC = [
  "text-end font-mono text-caption whitespace-nowrap text-meta tabular-nums",
  "[&_b]:block [&_b]:font-semibold [&_b]:text-fg",
  "max-md:col-start-2 max-md:text-start",
];

/* .ledger__move — direction is labelled in words, never by colour alone */
const MOVE: Record<Trend, string> = {
  up: "text-success before:content-['▲']",
  down: "text-error before:content-['▼']",
  flat: "text-meta before:text-[1em] before:content-['—']",
};

/** One .ledger__row: numeral, body, optional movement and metric columns. */
export function LedgerRow({
  num,
  body,
  move,
  metric,
  board,
}: {
  num: ReactNode;
  body: ReactNode;
  move?: ReactNode;
  metric?: ReactNode;
  board?: boolean;
}) {
  return (
    <li className={cn(ROW, board ? "grid-cols-board" : "grid-cols-sandwich")}>
      <span aria-hidden="true" className={cn(NUM)}>
        {num}
      </span>
      <span className="grid gap-1">{body}</span>
      {move}
      {metric}
    </li>
  );
}

/**
 * .ledger — the container. The reference sets it on ol, ul, div and dl alike;
 * a dl keeps the browser's 1em block margins, so `as="dl"` reproduces them.
 */
export function LedgerList({
  as: Comp = "ol",
  className,
  children,
}: {
  as?: "ol" | "ul" | "div" | "dl";
  className?: string;
  children: ReactNode;
}) {
  return <Comp className={cn(LIST, Comp === "dl" && "my-em", className)}>{children}</Comp>;
}

export function Ledger({
  articles,
  locale,
  start = 1,
  metric = "views",
  showMovement = false,
  className,
}: {
  articles: ArticleView[];
  locale: Locale;
  start?: number;
  metric?: "views" | "comments" | "none";
  /** Adds the direction column (.ledger--board, the trending board). */
  showMovement?: boolean;
  className?: string;
}) {
  const t = dictionaries[locale];
  const label: Record<Trend, string> = { up: t.ledger.rising, down: t.ledger.falling, flat: t.ledger.level };

  return (
    <LedgerList className={className}>
      {articles.map((a, i) => (
        <LedgerRow
          key={a.slug}
          board={showMovement}
          num={formatIndex(start + i, locale)}
          body={
            <>
              <Link className={cn(TITLE)} href={a.href}>
                {a.title}
              </Link>
              <Metabar as="span" by={a.authorRef.name}>
                {a.sectionRef.name}
                {t.card.mins(formatNumber(a.mins, locale))}
              </Metabar>
            </>
          }
          move={
            showMovement && (
              <span
                className={cn(
                  "text-caption font-650 whitespace-nowrap tabular-nums before:me-[0.35em] before:text-[.7em] max-md:col-start-2",
                  MOVE[a.trend],
                )}
              >
                {label[a.trend]}
              </span>
            )
          }
          metric={
            metric !== "none" && (
              <span className={cn(METRIC)}>
                <b>{formatCompact(metric === "views" ? a.views : a.comments, locale)}</b>
                {metric === "views" ? t.ledger.reads : t.ledger.replies}
              </span>
            )
          }
        />
      ))}
    </LedgerList>
  );
}

/** Rows of specification (label · note · value) in the ledger grammar — the /design-system tables. */
export function SpecLedger({
  rows,
  as = "ul",
  className,
}: {
  rows: [label: string, note: string, value?: string][];
  as?: "ul" | "div" | "dl";
  className?: string;
}) {
  return (
    <LedgerList as={as} className={className}>
      {rows.map(([label, note, value]) => (
        <LedgerRow
          key={label}
          num={null}
          body={
            <>
              <span className={cn(TITLE)}>{label}</span>
              <Metabar as="span">{note}</Metabar>
            </>
          }
          metric={<span className={cn(METRIC)}>{value}</span>}
        />
      ))}
    </LedgerList>
  );
}
