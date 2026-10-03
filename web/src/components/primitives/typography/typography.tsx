import Link from "next/link";
import type { ComponentPropsWithoutRef, ElementType } from "react";

import { cn } from "@/lib/utils";

import { spaceClass, type SpaceProps } from "../layout/space";

/*
 * Typography primitives — reference nova.css §4 and the §21 type helpers.
 * A role, never a one-off size: every text element in the app is a Heading
 * or a Text with a role from these tables.
 */

type As<T extends ElementType> = { as?: T } & Omit<ComponentPropsWithoutRef<T>, "as">;

export type Tone = "muted" | "accent" | "fg" | "inherit" | "soft";
export type Measure = "default" | "wide" | "short" | "mid" | "note" | "long" | "none";

const TONE: Record<Tone, string> = {
  muted: "text-meta",
  accent: "text-brand",
  fg: "text-fg",
  inherit: "text-inherit",
  soft: "text-inherit opacity-72",
};

const MEASURE: Record<Measure, string> = {
  default: "max-w-measure",
  wide: "max-w-measure-wide",
  short: "max-w-ch-34",
  mid: "max-w-ch-46",
  note: "max-w-ch-52",
  long: "max-w-ch-62",
  none: "max-w-none",
};

type Shared = SpaceProps & { tone?: Tone; measure?: Measure; center?: boolean };

function shared({ tone, measure, center, mt, mb }: Shared) {
  return cn(tone && TONE[tone], measure && MEASURE[measure], center && "text-center", spaceClass({ mt, mb }));
}

export type HeadingSize = "lead" | "display" | "h1" | "h2" | "h3" | "h4";

/* .t-lead / .display / .t-h1 … .t-h4 — size, leading and tracking together */
const HEADING: Record<HeadingSize, string> = {
  lead: "text-lead leading-lead tracking-lead",
  display: "text-display leading-display tracking-display",
  h1: "text-h1 leading-h1 tracking-h1",
  h2: "text-h2 leading-h2 tracking-h2",
  h3: "text-h3 leading-h3 tracking-h3",
  h4: "text-h4 leading-h4 tracking-h4",
};

/**
 * A serif heading. `level` is the document outline; `size` is the visual rank.
 * They are independent: an h2 can be set at h3 size.
 */
export function Heading({
  level,
  size,
  className,
  tone,
  measure,
  center,
  mt,
  mb,
  ...props
}: ComponentPropsWithoutRef<"h2"> & Shared & { level: 1 | 2 | 3 | 4; size?: HeadingSize }) {
  const H = `h${level}` as const;
  return (
    <H
      className={cn(
        "m-0 font-serif font-semibold text-balance text-fg",
        HEADING[size ?? (`h${level}` as HeadingSize)],
        shared({ tone, measure, center, mt, mb }),
        className,
      )}
      {...props}
    />
  );
}

export type TextVariant = "body" | "intro" | "small" | "meta" | "caption" | "eyebrow" | "index";

const TEXT: Record<TextVariant, string> = {
  body: "text-body leading-body",
  intro: "max-w-measure text-body-lg leading-160 text-fg-soft", // .lead
  small: "text-body-sm leading-160 text-fg-soft", // .t-body-sm
  meta: "text-caption leading-tight text-meta", // .meta
  caption: "text-caption leading-150 text-meta", // .caption
  eyebrow: "font-sans text-overline leading-120 font-650 tracking-overline uppercase fa:leading-160", // .overline
  index: "font-mono text-index tracking-index uppercase tabular-nums", // .t-index
};

/**
 * Running text.
 *   intro   — body large, the standfirst under a headline (reference `.lead`)
 *   small   — body small (`.t-body-sm`)
 *   meta    — metadata (`.meta`) · caption — figure captions (`.caption`)
 *   eyebrow — the small caps label above a headline (`.overline`)
 *   index   — tabular mono label (`.t-index`)
 */
export function Text<T extends ElementType = "p">({
  as,
  variant = "body",
  serif,
  strong,
  className,
  tone,
  measure,
  center,
  mt,
  mb,
  ...props
}: As<T> & Shared & { variant?: TextVariant; serif?: boolean; strong?: boolean }) {
  const Comp: ElementType = as ?? "p";
  return (
    <Comp
      className={cn(
        "m-0",
        TEXT[variant],
        serif && "font-serif",
        strong && "font-semibold",
        shared({ tone, measure, center, mt, mb }),
        className,
      )}
      {...props}
    />
  );
}

/*
 * The reference's base rule `a:not([class])` (nova.css §2): every link it
 * writes WITHOUT a class — running text, but also nav, footer, breadcrumb and
 * pagination links — is drawn in accent with a 1px underline that thickens on
 * hover. Our links always carry classes, so the base rule cannot reach them;
 * components that reproduce a classless reference link apply this instead.
 *   underline  the decoration only (a component rule sets its own colour)
 *   link       the full look: decoration + accent colour
 */
export const refLink = {
  underline: "underline decoration-1 underline-offset-3 hover:decoration-2",
  link: "text-brand underline decoration-1 underline-offset-3 hover:text-brand-hover hover:decoration-2",
} as const;

/** A link in the reference's classless look (accent + underline). */
export function TextLink({ className, ...props }: ComponentPropsWithoutRef<typeof Link>) {
  return <Link className={cn(refLink.link, className)} {...props} />;
}

/** Inline code / token names, set in the index role. */
export function Code({ className, ...props }: ComponentPropsWithoutRef<"code">) {
  return <code className={cn(TEXT.index, className)} {...props} />;
}

const WORDMARK = {
  md: "text-wordmark",
  compact: "text-wordmark-compact",
  sm: "text-wordmark-sm",
} as const;

/** .wordmark — the serif at 700 with the accent full stop. A link home when `href` is given. */
export function Wordmark({
  href,
  size = "md",
  label,
  className,
  children = "NOVA",
}: {
  href?: string;
  size?: keyof typeof WORDMARK;
  /** Accessible name when the mark is a link. */
  label?: string;
  className?: string;
  children?: string;
}) {
  const cls = cn(
    "inline-flex flex-none items-center gap-2 font-serif font-bold leading-none tracking-wordmark",
    "transition-[font-size] duration-240 ease-out",
    "after:size-1.25 after:translate-y-1.5 after:rounded-full after:bg-brand after:content-['']",
    WORDMARK[size],
    className,
  );
  return href ? (
    <Link className={cls} href={href} aria-label={label} dir="ltr">
      {children}
    </Link>
  ) : (
    <span className={cls} dir="ltr">
      {children}
    </span>
  );
}

/** Visually hidden, still announced (reference `.sr-only`). */
export function VisuallyHidden<T extends ElementType = "span">({ as, ...props }: As<T>) {
  const Comp: ElementType = as ?? "span";
  return <Comp className="sr-only" {...props} />;
}

const BIG_SIZE = {
  md: "text-big leading-none tracking-wordmark",
  xl: "text-big-xl leading-85 tracking-big-xl", // .big-num--xl
  sm: "text-big-sm leading-none tracking-wordmark", // .big-num--sm
} as const;
const BIG_TONE = { accent: "text-brand", muted: "text-muted-soft", warning: "text-warning", error: "text-error" } as const;

/** .big-num — a display numeral: 404, a state code. Colour is a semantic tone. */
export function BigNum({
  size = "md",
  tone = "accent",
  className,
  children,
  ...props
}: Omit<ComponentPropsWithoutRef<"p">, "children"> & {
  size?: keyof typeof BIG_SIZE;
  tone?: keyof typeof BIG_TONE;
  children: React.ReactNode;
}) {
  return (
    <p className={cn("font-serif", BIG_SIZE[size], BIG_TONE[tone], className)} {...props}>
      {children}
    </p>
  );
}
