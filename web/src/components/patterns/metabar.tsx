import { Children, type ComponentProps, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/*
 * S3 · The metadata lockup — reference nova.css §20 (.metabar, .card__meta).
 * The first item (`by`) is set in ink; everything after it is muted and
 * separated by a hairline stroke. Figures are tabular so stacked cards align.
 *
 *   <Metabar by="Elena Duarte">{date}{readingTime}</Metabar>
 *
 * The reference recolours the lockup from its surroundings; here that is
 * `tone`, named after the reference context it reproduces.
 */

type Tone = "default" | "invert" | "category-hero" | "lf-hero";

const TONE: Record<Tone, { root: string; by: string; sep: string }> = {
  default: { root: "text-meta", by: "text-fg", sep: "before:bg-strong" },
  // .metabar--invert
  invert: { root: "text-on-ink/72", by: "text-on-ink", sep: "before:bg-on-ink/40" },
  // .category-hero .metabar
  "category-hero": { root: "text-paper/70", by: "text-fg", sep: "before:bg-strong" },
  // .lf-hero .metabar
  "lf-hero": { root: "text-paper/72", by: "text-fg", sep: "before:bg-paper/40" },
};

/** The hairline separator: `.metabar > .dot-sep` / `.card__meta > .dot-sep`. */
export const dotSep = "relative ps-4 before:absolute before:inset-y-[0.15em] before:start-2 before:w-px before:content-['']";

export function Metabar({
  as: Comp = "p",
  by,
  strong,
  tone = "default",
  className,
  children,
  ...props
}: ComponentProps<"p"> & {
  /** The ledger sets its lockup as a span inside the row body. */
  as?: "p" | "span";
  by?: ReactNode;
  /** Larger lockup for article bylines (.metabar--strong). */
  strong?: boolean;
  tone?: Tone;
}) {
  const items = Children.toArray(children);
  const t = TONE[tone];
  return (
    <Comp
      className={cn(
        "flex flex-wrap items-center gap-x-0 gap-y-2 font-sans text-caption leading-tight tabular-nums",
        strong && "text-body-sm",
        t.root,
        className,
      )}
      {...props}
    >
      {by != null && (
        <span
          className={cn(
            "font-semibold whitespace-nowrap normal-nums",
            "[&_a:hover]:text-brand [&_a:hover]:underline [&_a:hover]:underline-offset-3",
            t.by,
          )}
        >
          {by}
        </span>
      )}
      {items.map((item, i) => (
        <span key={i} className={cn("whitespace-nowrap", (i > 0 || by != null) && [dotSep, t.sep])}>
          {item}
        </span>
      ))}
    </Comp>
  );
}
