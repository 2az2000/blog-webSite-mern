import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { cardParts } from "@/components/patterns/article-card";
import { Frame } from "@/components/patterns/frame";
import { Metabar } from "@/components/patterns/metabar";
import { Badge, Text } from "@/components/primitives";
import type { Locale } from "@/i18n/config";
import { dictionaries } from "@/i18n/dictionaries";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ArticleView } from "@/types/content";

/* Front-page pieces — reference index.html, nova.css §10 and §23. */

/** .frontpage — the opening band: lead + secondaries + rail, closed by the heavy rule. */
export const frontpageSection = "border-b-2 border-fg pt-8 pb-16 max-md:pt-4 max-md:pb-12";

/** .frontpage__secondary — two minimal cards under the lead, on the heavy rule. */
export const frontpageSecondary = cn(
  "mt-12 grid grid-cols-2 gap-col border-t-2 border-fg pt-6",
  "max-md:grid-cols-1 max-md:gap-0",
);
/** Card overrides inside .frontpage__secondary (title h4, standfirst caption, mobile rule). */
export const frontpageSecondaryCard = {
  className: "max-md:first-of-type:border-t-0 max-md:first-of-type:pt-2",
  titleClassName: "text-h4",
  standfirstClassName: "text-caption",
};

/** .frontpage__rail — separated by a rule, not a box. */
export const frontpageRail = cn(
  "grid content-start gap-6 border-s border-border ps-8",
  "max-lg:border-s-0 max-lg:border-t-2 max-lg:border-fg max-lg:ps-0 max-lg:pt-6",
);

/** .edition-line — the paper naming itself and the day. */
export function EditionLine({ edition, date, issue }: { edition: string; date: string; issue: string }) {
  return (
    <p
      className={cn(
        "mb-8 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-border pb-3",
        "font-mono text-index tracking-index text-meta uppercase max-md:mb-6",
        "[&_strong]:font-semibold [&_strong]:text-fg",
      )}
    >
      <span>
        <strong>{edition}</strong> · {date}
      </span>
      <span className="whitespace-nowrap">{issue}</span>
    </p>
  );
}

/** .frontpage__lead — the one dominant story of the page. The page's h1. */
export function FrontPageLead({
  article: a,
  label,
  alt,
  locale,
}: {
  article: ArticleView;
  label: string;
  alt: string;
  locale: Locale;
}) {
  const t = dictionaries[locale];
  return (
    <article className={cn(cardParts.root)}>
      {/* figure.frame.frame--3x2.card__media */}
      <Frame
        src={a.image}
        alt={alt}
        ratio="3x2"
        eager
        sizes="(max-width: 1024px) 100vw, 66vw"
        // figure.frame.card__media: §20 .frame { margin: 0 } outranks §9's 16px, so no bottom margin
        className="overflow-hidden bg-skeleton"
        imageClassName={cn(cardParts.image)}
      />
      <div className="mb-2 flex items-center gap-2">
        <Badge>{a.sectionRef.name}</Badge>
        <Text as="span" variant="index" tone="muted">
          {label}
        </Text>
      </div>
      <h1 id="lead-story" className={cn(cardParts.title, "my-4 text-lead leading-lead tracking-lead")}>
        <Link href={a.href} className={cn(cardParts.link)}>
          {a.title}
        </Link>
      </h1>
      <p className="mb-4 max-w-ch-52 text-body-lg leading-150 text-fg-soft">{a.standfirst}</p>
      <Metabar strong by={a.authorRef.name}>
        {formatDate(a.date, locale)}
        {t.card.minRead(formatNumber(a.mins, locale))}
      </Metabar>
    </article>
  );
}

export type TopicTileData = { label: string; href: string; image: string; count: string };

/** .topics-row / .topic-tile — image tiles into the main desks. */
export function TopicTiles({ tiles }: { tiles: TopicTileData[] }) {
  return (
    <div className="grid grid-cols-5 gap-col max-lg:grid-cols-3 max-md:grid-cols-2">
      {tiles.map((tile) => (
        <Link key={tile.href} href={tile.href} className="group/tile relative block overflow-hidden bg-ink">
          {/* Decorative — the label is the link text. */}
          <Image
            src={tile.image}
            alt=""
            width={800}
            height={533}
            sizes="(max-width: 768px) 50vw, 20vw"
            className={cn(
              "block aspect-3/2 h-auto w-full object-cover opacity-62",
              "[transition:scale_var(--duration-slow)_var(--ease-out),opacity_var(--duration-fast)_var(--ease-in-out)]",
              "group-hover/tile:opacity-50 motion-safe:group-hover/tile:scale-105",
            )}
          />
          <span className="absolute inset-x-0 bottom-0 p-4 font-serif text-h4 leading-120 text-paper fa:leading-160">
            {tile.label}
            <span className="mt-1 block font-sans text-overline tracking-overline text-paper/75 uppercase">
              {tile.count}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}

/** A heading block for a rail that is not a numbered section (The Brief). */
export function RailHead({ id, title, note }: { id: string; title: string; note: ReactNode }) {
  return (
    <div>
      {/* h2.sec-head__title outside a .sec-head */}
      <h2 id={id} className="font-sans text-label leading-130 font-650 tracking-overline text-fg uppercase">
        {title}
      </h2>
      <Text variant="meta" mt={8}>
        {note}
      </Text>
    </div>
  );
}
