import type { ComponentPropsWithoutRef, ElementType } from "react";

import { cn } from "@/lib/utils";

import { gapClass, spaceClass, type Space, type SpaceProps } from "./space";

/*
 * Layout primitives — reference nova.css §3 (.wrap, .grid12, .section),
 * §9 (.cards-row, .cards-list), §21 (.stack, .row) and the OD primitives.
 * Spacing is a prop on the token scale: layout decisions live in the parent,
 * never as margins sprinkled on children.
 *
 * `className` is for PLACEMENT chosen by the parent (span, order, alignment),
 * never for appearance.
 */

type As<T extends ElementType> = { as?: T } & Omit<ComponentPropsWithoutRef<T>, "as">;

/** .wrap — the 1280px measure with fluid gutters (`narrow` = .wrap--narrow). */
export function Container<T extends ElementType = "div">({
  as,
  narrow,
  className,
  mt,
  mb,
  ...props
}: As<T> & SpaceProps & { narrow?: boolean }) {
  const Comp: ElementType = as ?? "div";
  return <Comp className={cn("mx-auto w-wrap", narrow && "max-w-narrow", spaceClass({ mt, mb }), className)} {...props} />;
}

/**
 * .section — a vertical band. Consecutive bands share one gap
 * (.section + .section), and `tight` is .section--tight.
 */
export function Section<T extends ElementType = "section">({
  as,
  tight,
  className,
  ...props
}: As<T> & { tight?: boolean }) {
  const Comp: ElementType = as ?? "section";
  return (
    <Comp
      data-section=""
      className={cn(tight ? "py-12" : "py-16 max-md:py-12", "[[data-section]+&]:pt-0", className)}
      {...props}
    />
  );
}

/**
 * Vertical rhythm. `flow="grid"` is the reference .stack (grid, default gap 16);
 * `flow="flex"` is .od-stack (a flex column, default gap 8).
 */
export function Stack<T extends ElementType = "div">({
  as,
  flow = "grid",
  gap = flow === "grid" ? 16 : 8,
  className,
  mt,
  mb,
  ...props
}: As<T> & SpaceProps & { gap?: Space; flow?: "grid" | "flex" }) {
  const Comp: ElementType = as ?? "div";
  return (
    <Comp
      className={cn(
        flow === "grid" ? "grid content-start" : "flex flex-col",
        "*:min-w-0",
        gapClass(gap),
        spaceClass({ mt, mb }),
        className,
      )}
      {...props}
    />
  );
}

const ALIGN = { start: "items-start", center: "items-center", end: "items-end", baseline: "items-baseline" } as const;
const JUSTIFY = { start: "", between: "justify-between", center: "justify-center", end: "justify-end" } as const;

/** .row / .od-cluster / .od-row — a horizontal group (wraps unless `wrap={false}`). */
export function Cluster<T extends ElementType = "div">({
  as,
  gap = 16,
  align = "center",
  justify = "start",
  wrap = true,
  className,
  mt,
  mb,
  ...props
}: As<T> &
  SpaceProps & {
    gap?: Space;
    align?: keyof typeof ALIGN;
    justify?: keyof typeof JUSTIFY;
    wrap?: boolean;
  }) {
  const Comp: ElementType = as ?? "div";
  return (
    <Comp
      className={cn(
        "flex *:min-w-0",
        wrap && "flex-wrap",
        ALIGN[align],
        JUSTIFY[justify],
        gapClass(gap),
        spaceClass({ mt, mb }),
        className,
      )}
      {...props}
    />
  );
}

/** Placement for a child of <Cluster>: take the remaining space, or keep its size. */
export const flex = { fill: "min-w-0 flex-1", fixed: "flex-none" } as const;

/** .grid12 — the 12-column editorial grid (`container` = also .wrap). */
export function Grid<T extends ElementType = "div">({
  as,
  rowGap,
  container,
  className,
  ...props
}: As<T> & { rowGap?: Space; container?: boolean }) {
  const Comp: ElementType = as ?? "div";
  return (
    <Comp
      className={cn("grid grid-cols-12 gap-col", gapClass(rowGap, "row"), container && "mx-auto w-wrap", className)}
      {...props}
    />
  );
}

export type Span = 3 | 4 | 5 | 6 | 7 | 8 | 9 | 12;

/* Every span below 12 collapses to the full row at 768px (nova.css §22). */
const SPAN: Record<Span, string> = {
  3: "col-span-3 max-md:col-span-12",
  4: "col-span-4 max-md:col-span-12",
  5: "col-span-5 max-md:col-span-12",
  6: "col-span-6 max-md:col-span-12",
  7: "col-span-7 max-md:col-span-12",
  8: "col-span-8 max-md:col-span-12",
  9: "col-span-9 max-md:col-span-12",
  12: "col-span-12",
};

/** .col-N — a column on <Grid>. */
export function Col<T extends ElementType = "div">({ as, span, className, ...props }: As<T> & { span: Span }) {
  const Comp: ElementType = as ?? "div";
  return <Comp className={cn(SPAN[span], className)} {...props} />;
}

/*
 * .cards-row — N columns, 2 at 1024px, 1 at 768px.
 * The reference only collapses rows without .cols-N (its .cols-N outranks
 * the media query); here every multi-column row collapses the same way.
 * docs/04-fidelity.md §Deviations.
 */
const COLS = {
  1: "grid-cols-1",
  2: "grid-cols-2 max-md:grid-cols-1",
  3: "grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1",
  4: "grid-cols-4 max-lg:grid-cols-2 max-md:grid-cols-1",
} as const;

/** Rows of cards. Default gap is 32 × column gap (32 × 32 at 768px); `gap` sets both. */
export function CardGrid<T extends ElementType = "div">({
  as,
  cols = 3,
  gap,
  className,
  ...props
}: As<T> & { cols?: 1 | 2 | 3 | 4; gap?: Space }) {
  const Comp: ElementType = as ?? "div";
  return (
    <Comp
      className={cn("grid", COLS[cols], gap === undefined ? "gap-x-col gap-y-8 max-md:gap-8" : gapClass(gap), className)}
      {...props}
    />
  );
}

/** .cards-list — cards stacked one above another; each card draws its own rule. */
export function CardList<T extends ElementType = "div">({
  as,
  gap = 0,
  className,
  ...props
}: As<T> & { gap?: Space }) {
  const Comp: ElementType = as ?? "div";
  return <Comp className={cn("grid", gapClass(gap), className)} {...props} />;
}

/** .rule — a hairline (`strong` = the 2px ink rule). */
export function Rule({ strong, className }: { strong?: boolean; className?: string }) {
  return <hr className={cn("m-0 border-0 border-t", strong ? "border-t-2 border-fg" : "border-border", className)} />;
}
