import Image from "next/image";
import Link from "next/link";
import type { ComponentProps, CSSProperties, ReactNode } from "react";

import { Avatar, Cluster, Container, flex, gapClass, Heading, Text, type Space } from "@/components/primitives";
import { cn } from "@/lib/utils";

/* Editorial building blocks shared across pages — reference nova.css §10, §12, §16. */

/* — Stats (.stat-strip, .stat) ------------------------------------------------ */

/**
 * .stat-strip — 4 → 2 columns. `single` stacks the figures (the reference's
 * .cols-1 has no effect on a strip, so its figures overflow: §Deviations).
 * `gap` is the reference .gap-N, which wins at every width.
 */
export function StatStrip({
  className,
  single,
  gap,
  ...props
}: ComponentProps<"div"> & { single?: boolean; gap?: Space }) {
  return (
    <div
      className={cn(
        "grid gap-col",
        single ? "grid-cols-1" : "grid-cols-4 max-lg:grid-cols-2 max-lg:gap-y-8",
        gapClass(gap),
        className,
      )}
      {...props}
    />
  );
}

export function Stat({ value, label }: { value: ReactNode; label: ReactNode }) {
  return (
    <div className="grid gap-1 border-t-2 border-fg pt-3 *:block *:min-w-0">
      <span className="font-serif text-stat leading-none whitespace-nowrap tabular-nums">{value}</span>
      <span className="text-caption text-meta">{label}</span>
    </div>
  );
}

/* — Accordion (.accordion, native <details> as in the reference) -------------- */

export function Accordion({ items, className }: { items: { q: string; a: ReactNode }[]; className?: string }) {
  return (
    <div className={cn("grid", className)}>
      {items.map((item, i) => (
        <details key={item.q} open={i === 0} className="group/acc border-t border-border last-of-type:border-b">
          <summary
            className={cn(
              "flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-6",
              "font-serif text-h4 leading-130 fa:leading-160 [&::-webkit-details-marker]:hidden",
              "after:font-sans after:text-glyph after:text-meta after:content-['+']",
              "after:transition-transform after:duration-180 after:ease-out group-open/acc:after:rotate-45",
            )}
          >
            {item.q}
          </summary>
          <div className="max-w-ch-62 pb-6 text-body-sm text-meta">{item.a}</div>
        </details>
      ))}
    </div>
  );
}

/* — Inverted image hero (.category-hero) ------------------------------------- */

/** Children on the photograph take their photo tone (Breadcrumbs, Text, Metabar, Button). */
export function CategoryHero({
  image,
  width = 2000,
  height = 900,
  children,
}: {
  image: string;
  width?: number;
  height?: number;
  children: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-photo text-paper [&_h1]:text-paper">
      {/* Decorative: the headline carries the meaning. */}
      <Image
        src={image}
        alt=""
        width={width}
        height={height}
        sizes="100vw"
        loading="eager"
        fetchPriority="high"
        className="absolute inset-0 size-full object-cover opacity-38"
      />
      <Container className="relative py-20">{children}</Container>
    </section>
  );
}

/* — Page head (.page-head) ---------------------------------------------------- */

export function PageHead({
  eyebrow,
  kicker,
  title,
  lead,
  leadGap = 24,
  actions,
  children,
  className,
}: {
  eyebrow?: ReactNode;
  /** A line above the headline that is not an eyebrow (the design-system index line); rendered as given. */
  kicker?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  /** Space above the standfirst: most pages 24, the account pages 16. */
  leadGap?: 16 | 24;
  /** Controls set to the right of the headline, bottom-aligned with it. */
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const text = (
    <>
      {eyebrow && (
        <Text variant="eyebrow" tone="accent" mb={16}>
          {eyebrow}
        </Text>
      )}
      {kicker}
      <Heading level={1} size="display" className="max-w-ch-18">
        {title}
      </Heading>
      {lead && (
        <Text variant="intro" mt={leadGap}>
          {lead}
        </Text>
      )}
    </>
  );
  return (
    <header className={cn("mx-auto w-wrap border-b-2 border-fg pt-12 pb-8", className)}>
      {actions ? (
        <Cluster gap={24} align="end" wrap={false}>
          <div className={flex.fill}>{text}</div>
          <Cluster gap={12} className={flex.fixed}>
            {actions}
          </Cluster>
        </Cluster>
      ) : (
        text
      )}
      {children}
    </header>
  );
}

/* — Collection tile (.collection-tile) — writers, topics, collections ---------- */

export function CollectionTile({
  href,
  onClick,
  eyebrow,
  initials,
  title,
  size = "h4",
  lines,
  children,
}: {
  href?: string;
  /** A tile that acts rather than navigates renders as a button. */
  onClick?: () => void;
  eyebrow?: string;
  initials?: string;
  title: string;
  size?: "h3" | "h4";
  lines?: { text: ReactNode; clamp?: boolean; nowrap?: boolean }[];
  children?: ReactNode;
}) {
  const cls = cn(
    "grid gap-3 border border-border bg-surface p-6",
    "[transition:border-color_var(--duration-fast)_var(--ease-in-out),translate_var(--duration-fast)_var(--ease-out)]",
    "hover:-translate-y-0.5 hover:border-fg",
  );
  const body = (
    <>
      {eyebrow && (
        <Text as="span" variant="eyebrow" tone="accent">
          {eyebrow}
        </Text>
      )}
      {initials && <Avatar initials={initials} size="lg" />}
      <span
        className={cn(
          "font-serif",
          size === "h3" ? "text-h3 leading-h3 tracking-h3" : "text-h4 leading-h4 tracking-h4",
        )}
      >
        {title}
      </span>
      {lines?.map((l, i) => (
        <span
          key={i}
          className={cn(
            "text-caption text-meta",
            l.clamp && "line-clamp-2 wrap-anywhere",
            l.nowrap && "whitespace-nowrap",
          )}
        >
          {l.text}
        </span>
      ))}
      {children}
    </>
  );
  if (onClick) {
    return (
      <button type="button" className={cn(cls, "text-start")} onClick={onClick}>
        {body}
      </button>
    );
  }
  return href ? (
    <Link className={cls} href={href}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/* — Data (.chart, .timeline) — long-form and trending -------------------------- */

export function BarChart({
  description,
  max,
  unit,
  rows,
  format = (v) => String(v),
}: {
  /** The whole chart as a sentence — the accessible name of the figure. */
  description: string;
  max: number;
  unit: string;
  rows: { label: string; value: number; muted?: boolean }[];
  format?: (v: number) => string;
}) {
  return (
    // Bar lengths are data: --v / --max are set at runtime, as in the reference.
    <div className="my-8 grid gap-3" role="img" aria-label={description} style={{ "--max": max } as CSSProperties}>
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-bar items-center gap-4 max-md:grid-cols-bar-sm max-md:gap-2">
          <span className="text-caption text-meta tabular-nums">{r.label}</span>
          <div className="h-5 overflow-hidden rounded-md bg-surface-sunk">
            <div
              className={cn("h-full w-[calc(var(--v)/var(--max)*100%)] rounded-md", r.muted ? "bg-muted-soft" : "bg-brand")}
              style={{ "--v": r.value } as CSSProperties}
            />
          </div>
          <span className="text-caption font-650 whitespace-nowrap text-fg tabular-nums">
            {format(r.value)} {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

/** .chart-note — the source line under a chart. */
export function ChartNote({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cn("border-t border-border pt-2 text-caption text-meta", className)}>{children}</p>;
}

export function Timeline({ items }: { items: { year: string; title: string; text: string }[] }) {
  return (
    <div className="my-8 grid gap-0">
      {items.map((it) => (
        <div
          key={it.year + it.title}
          className="relative grid grid-cols-timeline gap-6 border-t border-border py-6 max-md:grid-cols-1 max-md:gap-2"
        >
          <span className="font-serif text-h4 whitespace-nowrap text-brand tabular-nums">{it.year}</span>
          <div>
            <h4 className="mb-1 font-sans text-body-sm font-650">{it.title}</h4>
            <p className="text-body-sm text-meta">{it.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* — Byline (.byline) — monogram + name + one line of context ------------------ */

export function Byline({
  avatar,
  name,
  meta,
  tone = "default",
  className,
}: {
  avatar: ReactNode;
  name: ReactNode;
  meta?: ReactNode;
  /** .lf-hero .byline__name / __meta — over the long-form photograph. */
  tone?: "default" | "lf-hero";
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {avatar}
      <span className="text-caption leading-tight">
        <span className={cn("block font-semibold", tone === "lf-hero" ? "text-paper" : "text-fg")}>{name}</span>
        {meta && <span className={cn("block", tone === "lf-hero" ? "text-paper/72" : "text-meta")}>{meta}</span>}
      </span>
    </div>
  );
}

/* — Reader quote (blockquote.panel with a byline footer) ---------------------- */

export function ReaderQuote({
  quote,
  name,
  meta,
  initials,
  tone,
}: {
  quote: string;
  name: string;
  meta: string;
  initials: string;
  tone?: "opinion";
}) {
  return (
    // A blockquote keeps the browser's own margins, exactly as in the reference.
    <blockquote className="rounded-md border border-border bg-surface p-8 max-md:p-6">
      <Text variant="intro" serif tone="fg">
        {quote}
      </Text>
      <footer className="mt-6">
        <Byline avatar={<Avatar initials={initials} size="sm" tone={tone} />} name={name} meta={meta} />
      </footer>
    </blockquote>
  );
}
