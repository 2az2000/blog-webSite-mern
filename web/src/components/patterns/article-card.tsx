import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { dotSep, Metabar } from "@/components/patterns/metabar";
import { Avatar, Badge, IconPlay } from "@/components/primitives";
import type { Locale } from "@/i18n/config";
import { dictionaries } from "@/i18n/dictionaries";
import { formatCompact, formatDate, formatIndex, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ArticleView } from "@/types/content";

/*
 * Article card system — reference nova.css §9 (+ §18/§19/§20) and the markup
 * of nova.js NOVA.card. Eight variants, one grammar; every variant sits one
 * clear step from its neighbours on the rank ladder, and the image ratio
 * belongs to the variant, never the page.
 *
 *   lead        text-lead       one per page, the dominant story
 *   featured    text-h2         section hero
 *   default     text-h3         the workhorse grid card
 *   horizontal  text-h3         same rank, different composition
 *   minimal     text-h4         text-only rail
 *   opinion     text-h4 italic  author-forward, no image
 *   compact     text-body-sm    thumbnail list, 1:1 media
 *   numbered    text-body-sm    ranked list
 *   (+ video, longread — media treatments of the default / immersive rank)
 */

export type CardVariant =
  | "lead"
  | "featured"
  | "default"
  | "horizontal"
  | "compact"
  | "numbered"
  | "minimal"
  | "opinion"
  | "video"
  | "longread";

type Look = {
  root?: string;
  media?: string;
  ratio?: string;
  img?: string;
  title: string;
  link?: string;
  standfirst?: string;
};

/* Title: .card__title is serif 600, ls-h3, 1.18, balanced, mb-8; the size is
   the h3 element's, which every variant restates so the heading level can
   follow the document outline without changing the rank. */
const TITLE = "mb-2 font-serif font-semibold tracking-h3 text-balance";
/* Persian: the reference's Latin 1.18 clips Naskh (:where(:lang(fa)) .card__title) */
const FA_TITLE = "fa:leading-h3";

const LOOK: Record<CardVariant, Look> = {
  default: { title: `text-h3 leading-118 ${FA_TITLE}` },
  video: { media: "relative", title: `text-h3 leading-118 ${FA_TITLE}` },
  lead: {
    title: "mb-4 text-lead leading-lead tracking-lead",
    standfirst: "mb-6 max-w-ch-46 text-body-lg leading-150 text-fg-soft",
  },
  featured: {
    title: "text-h2 leading-h2 tracking-h2",
    standfirst: "max-w-ch-46 text-body-lg text-fg-soft",
  },
  horizontal: {
    root: "grid grid-cols-split items-start gap-6 max-md:grid-cols-1 max-md:gap-4",
    media: "mb-0",
    title: `text-h3 leading-118 ${FA_TITLE}`,
  },
  compact: {
    root: "grid grid-cols-compact items-start gap-4 max-sm:grid-cols-compact-sm max-sm:gap-3",
    media: "mb-0",
    ratio: "aspect-square",
    title: "mb-1 text-body-sm leading-135 fa:leading-175",
  },
  numbered: {
    root: "grid grid-cols-lead items-start gap-4 border-t border-border py-4",
    title: "text-body-sm leading-135 fa:leading-175",
  },
  minimal: {
    root: "border-t border-border pt-6 pb-4",
    title: `text-h4 leading-118 ${FA_TITLE}`,
  },
  opinion: {
    root: "grid grid-cols-lead items-start gap-4 border-t border-border py-6",
    title: `text-h4 leading-118 italic fa:not-italic ${FA_TITLE}`,
  },
  longread: {
    root: "text-on-ink",
    media: "mb-0 bg-ink",
    ratio: "aspect-20/9",
    img: "opacity-72",
    title: `text-longread leading-118 text-inherit ${FA_TITLE}`,
    // .card--longread:hover .card__title a — replaces the accent underline
    link: "group-hover/card:decoration-paper/75",
    standfirst: "text-paper/82",
  },
};

/* .card__title a — the underline is always drawn, transparent at rest, so a
   two-line headline never reflows on hover. */
const LINK = [
  "underline decoration-transparent decoration-1 underline-offset-[0.16em]",
  "[transition:text-decoration-color_var(--duration-fast)_var(--ease-in-out),color_var(--duration-micro)_var(--ease-in-out)]",
  "after:absolute after:inset-0 after:content-[''] focus-visible:outline-none",
  "group-focus-within/card:decoration-brand",
];
const LINK_HOVER = "[@media(hover:hover)]:group-hover/card:decoration-brand";

/* .card + :focus-within ring; the group drives every hover inside the card */
const ROOT = [
  "group/card relative block",
  "focus-within:rounded-md focus-within:outline-2 focus-within:outline-offset-8 focus-within:outline-ring",
];
/* .card__media + its image: the variant's ratio, the 1.03 hover zoom */
const MEDIA = "mb-4 overflow-hidden bg-skeleton";
const IMG = [
  "block h-auto w-full object-cover transition-[scale] duration-360 ease-out",
  "[@media(hover:hover)_and_(prefers-reduced-motion:no-preference)]:group-hover/card:scale-103",
];

/** The card grammar, for compositions that set a card by hand (the front-page lead). */
export const cardParts = { root: ROOT, media: MEDIA, image: IMG, title: TITLE, link: [LINK, LINK_HOVER] } as const;

/* .card__meta without .metabar (numbered, opinion): no line-height of its own */
const CARD_META = "flex flex-wrap items-center gap-x-0 gap-y-2 text-caption text-meta tabular-nums";

const SIZES: Partial<Record<CardVariant, string>> = {
  lead: "(max-width: 1024px) 100vw, 66vw",
  featured: "(max-width: 768px) 100vw, 50vw",
  horizontal: "(max-width: 768px) 100vw, 40vw",
  compact: "96px",
  longread: "100vw",
};

/** `variant` from the record's kind — the reference autoVariant(). */
export function autoVariant(a: ArticleView): CardVariant {
  if (a.kind === "longread") return "longread";
  if (a.kind === "video") return "video";
  if (a.kind === "opinion") return "opinion";
  return "default";
}

type ArticleCardProps = {
  article: ArticleView;
  variant?: CardVariant;
  locale: Locale;
  /** 1-based position — required by `numbered`. */
  rank?: number;
  showStandfirst?: boolean;
  /** Keep the document outline right: h2 under the page h1, h3 under a section h2. */
  headingLevel?: 2 | 3 | 4;
  /** First card above the fold: load its image eagerly. */
  eager?: boolean;
  /** Placement / rhythm from the parent (e.g. a rail drops the first rule). */
  className?: string;
  /** Title / standfirst overrides from a parent composition (front page). */
  titleClassName?: string;
  standfirstClassName?: string;
};

export function ArticleCard({
  article: a,
  variant = "default",
  locale,
  rank = 1,
  showStandfirst = true,
  headingLevel = 3,
  eager,
  className,
  titleClassName,
  standfirstClassName,
}: ArticleCardProps) {
  const t = dictionaries[locale];
  const look = LOOK[variant];
  const H = `h${headingLevel}` as const;
  const isOpinion = a.section === "opinion";

  const kicker = (extra?: ReactNode) => (
    <div className="mb-2 flex items-center gap-2">
      {extra ?? <Badge variant={isOpinion ? "opinion" : "default"}>{a.sectionRef.name}</Badge>}
    </div>
  );

  const title = (
    <H className={cn(TITLE, look.title, titleClassName)}>
      <Link href={a.href} className={cn(LINK, look.link ?? LINK_HOVER)}>
        {a.title}
      </Link>
    </H>
  );

  const standfirst = showStandfirst && (
    <p
      className={cn(
        "mb-3 line-clamp-3 text-body-sm leading-155 wrap-anywhere text-meta",
        look.standfirst,
        standfirstClassName,
      )}
    >
      {a.standfirst}
    </p>
  );

  const meta = (
    <Metabar by={a.authorRef.name}>
      {formatDate(a.date, locale)}
      {t.card.minRead(formatNumber(a.mins, locale))}
    </Metabar>
  );

  const media = (opts: { decorative?: boolean; width?: number; height?: number; children?: ReactNode } = {}) => (
    <div className={cn(MEDIA, look.media)}>
      <Image
        src={a.image}
        // The headline is the link text; the thumbnail repeats it, so a compact
        // image is decorative. Larger media get the title as their description.
        alt={opts.decorative ? "" : a.title}
        width={opts.width ?? 1600}
        height={opts.height ?? 1067}
        sizes={SIZES[variant] ?? "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"}
        loading={eager ? "eager" : undefined}
        fetchPriority={eager ? "high" : undefined}
        className={cn(IMG, look.ratio ?? "aspect-3/2", look.img)}
      />
      {opts.children}
    </div>
  );

  const root = (children: ReactNode) => (
    <article className={cn(ROOT, look.root, className)}>
      {children}
    </article>
  );

  switch (variant) {
    case "compact":
      return root(
        <>
          {media({ decorative: true })}
          <div>
            {kicker()}
            {title}
            <p className={cn(CARD_META, "whitespace-nowrap")}>{t.card.minRead(formatNumber(a.mins, locale))}</p>
          </div>
        </>,
      );

    case "numbered":
      return root(
        <>
          <div
            aria-hidden="true"
            className={cn(
              "min-w-rank font-serif text-rank leading-none font-semibold text-muted-soft tabular-nums",
              "transition-colors duration-180 ease-in-out group-hover/card:text-brand",
            )}
          >
            {formatIndex(rank, locale)}
          </div>
          <div>
            {kicker()}
            {title}
            <p className={CARD_META}>
              <span className="whitespace-nowrap">{a.authorRef.name}</span>
              <span className={cn(dotSep, "whitespace-nowrap before:bg-strong")}>
                {t.card.reads(formatCompact(a.views, locale))}
              </span>
            </p>
          </div>
        </>,
      );

    case "minimal":
      return root(
        <>
          {kicker()}
          {title}
          {meta}
        </>,
      );

    case "opinion":
      return root(
        <>
          <Avatar initials={a.authorRef.initials} tone="opinion" />
          <div>
            {kicker(<Badge variant="opinion">{a.sectionRef.name}</Badge>)}
            {title}
            <p className={CARD_META}>
              <span className="whitespace-nowrap">{a.authorRef.name}</span>
              <span className={cn(dotSep, "before:bg-strong")}>{a.authorRef.role}</span>
            </p>
          </div>
        </>,
      );

    case "horizontal":
      return root(
        <>
          {media()}
          <div>
            {kicker()}
            {title}
            {standfirst}
            {meta}
          </div>
        </>,
      );

    case "longread":
      return root(
        <>
          {media({ width: 2000, height: 900 })}
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 max-w-ch-62 px-12 pt-16 pb-8 text-paper",
              "bg-linear-to-t from-photo/90 from-12% via-photo/55 via-52% to-photo/0",
              "max-md:px-4 max-md:pt-6 max-md:pb-4",
            )}
          >
            {kicker(
              <>
                <Badge tone="photo">{t.card.longRead}</Badge>
                <span className={cn(CARD_META, "whitespace-nowrap text-paper/82")}>
                  {t.card.mins(formatNumber(a.mins, locale))}
                </span>
              </>,
            )}
            {title}
            {standfirst}
          </div>
        </>,
      );

    case "video":
      return root(
        <>
          {media({
            children: (
              <span
                className={cn(
                  "absolute start-3 bottom-3 inline-flex items-center gap-2 rounded-full bg-photo/82 px-3 py-1",
                  "text-overline font-650 tracking-play text-white fa:tracking-normal [&_svg]:size-3.5",
                )}
              >
                <IconPlay /> <span dir="ltr">{`${formatNumber(a.mins, locale)}:${formatIndex(0, locale)}`}</span>
              </span>
            ),
          })}
          {kicker()}
          {title}
          {standfirst}
          {meta}
        </>,
      );

    default:
      return root(
        <>
          {media()}
          {kicker()}
          {title}
          {standfirst}
          {meta}
        </>,
      );
  }
}
