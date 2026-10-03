import Image from "next/image";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";

import { ArticleCard } from "@/components/patterns/article-card";
import { BarChart, Byline as BylineBase, ChartNote, Timeline } from "@/components/patterns/blocks";
import { Frame, FrameCredit } from "@/components/patterns/frame";
import { Metabar } from "@/components/patterns/metabar";
import { Avatar, ButtonLink, CardList, Cluster, Container, Heading, refLink, Tag, Text } from "@/components/primitives";
import { routes } from "@/config/routes";
import type { Locale } from "@/i18n/config";
import { dictionaries } from "@/i18n/dictionaries";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Author, ResolvedBlock, RichText } from "@/types/content";

/* Reading-surface parts — reference nova.css §11, §12 and §24. Server Components. */

/** `**strong**` → <strong> (.prose strong). The only inline markup the content model allows. */
export function Rich({ text }: { text: RichText }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? (
          <strong key={i} className="font-650 text-fg">
            {p}
          </strong>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

/** The article's author byline: monogram + name, both linking to the profile. */
export function Byline({ author, locale, tone }: { author: Author; locale: Locale; tone?: "opinion" }) {
  const t = dictionaries[locale];
  const href = routes.author(author.slug);
  return (
    <BylineBase
      avatar={
        <Link href={href} aria-label={t.article.authorProfile(author.name)}>
          <Avatar initials={author.initials} tone={tone} />
        </Link>
      }
      name={<Link href={href} className="text-inherit">{author.name}</Link>}
      meta={author.role}
    />
  );
}

/** .author-bio — the closing author block. */
export function AuthorBio({
  author,
  locale,
  label,
  tone,
  bio,
  actions,
}: {
  author: Author;
  locale: Locale;
  /** "Written by" / "Reported by" */
  label: string;
  tone?: "opinion";
  /** Overrides the author's standing bio (a piece-specific note). */
  bio?: string;
  /** Extra controls beside "All stories by this author". */
  actions?: ReactNode;
}) {
  const t = dictionaries[locale];
  const href = routes.author(author.slug);
  const allStories = (
    <ButtonLink href={href} variant="secondary" size="sm">
      {t.article.allByAuthor}
    </ButtonLink>
  );
  return (
    <div
      className={cn(
        "mt-12 mb-8 grid grid-cols-lead gap-6 border-t-2 border-b border-t-fg border-b-border py-8",
        "max-sm:grid-cols-1 max-sm:gap-4",
      )}
    >
      <Link href={href} aria-label={t.article.authorProfile(author.name)}>
        <Avatar initials={author.initials} size="lg" tone={tone} />
      </Link>
      <div>
        <Text variant="index" tone="accent">
          {label}
        </Text>
        <h2 className="mt-2 text-h3 leading-h3 tracking-h3">
          {/* classless in the reference: accent + underline */}
          <Link href={href} className={refLink.link}>
            {author.name}
          </Link>
        </h2>
        {/* with extra actions (the article page) the role takes a gap and the buttons a row */}
        <Text variant="meta" mt={actions ? 8 : undefined}>
          {author.role}
        </Text>
        <Text variant="small" measure="default" mt={16}>
          {bio ?? author.bio}
        </Text>
        {actions ? (
          <Cluster mt={24}>
            {allStories}
            {actions}
          </Cluster>
        ) : (
          allStories
        )}
      </div>
    </div>
  );
}

/** .tagrow — "Filed under". */
export function TagRow({ id, tags, locale }: { id: string; tags: { label: string; topic: string }[]; locale: Locale }) {
  const t = dictionaries[locale];
  return (
    <section
      aria-labelledby={id}
      className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-6 pb-12"
    >
      <h2 className="sr-only" id={id}>
        {t.article.filedUnder}
      </h2>
      <span className="me-2 text-caption whitespace-nowrap text-meta">{t.article.filedUnder}</span>
      <Cluster>
        {tags.map((tag) => (
          <Tag key={tag.label} href={routes.topic(tag.topic)}>
            {tag.label}
          </Tag>
        ))}
      </Cluster>
    </section>
  );
}

/** Metadata line under an article headline: published, updated, reading time. */
export function ArticleMeta({
  date,
  updated,
  mins,
  locale,
  className,
}: {
  date: string;
  updated?: string;
  mins: number;
  locale: Locale;
  className?: string;
}) {
  const t = dictionaries[locale];
  return (
    <Metabar className={className}>
      <>
        {t.article.published} <time dateTime={date}>{formatDate(date, locale)}</time>
      </>
      {updated && (
        <>
          {t.article.updated} <time dateTime={updated}>{formatDate(updated, locale)}</time>
        </>
      )}
      {t.card.minRead(formatNumber(mins, locale))}
    </Metabar>
  );
}

/* .prose > * + * is 24px; a block with its own margin (.prose h2, .pullquote,
   .prose .frame …) outranks it in the reference, so each block states its
   own margin here and only the plain ones take the 24px step. */
const STEP = "mt-6";

/* .prose--dropcap > p:first-of-type::first-letter (§24) — none in Persian */
const DROPCAP = [
  "first-letter:float-left first-letter:pe-3 first-letter:pt-2 first-letter:font-serif first-letter:text-dropcap",
  "first-letter:leading-82 first-letter:font-semibold first-letter:text-fg max-md:first-letter:text-dropcap-sm",
  "fa:first-letter:float-none fa:first-letter:p-0 fa:first-letter:font-[inherit] fa:first-letter:text-inherit",
];

/**
 * .prose — renders structured body blocks into the reference prose markup.
 * Every class a body can carry is decided here, never by the CMS.
 */
export function ArticleBody({
  blocks,
  locale,
  dropcap,
}: {
  blocks: ResolvedBlock[];
  locale: Locale;
  dropcap?: boolean;
}) {
  const firstP = blocks.findIndex((b) => b.type === "p");
  return (
    <div
      className={cn(
        "mx-auto max-w-measure text-body leading-body text-fg-soft print:max-w-none",
        // .prose a / .prose h3 reach every anchor and h3 in the body, recirc cards included
        "[&_a]:text-brand [&_a]:underline [&_a]:decoration-1 [&_a]:underline-offset-3",
        "[&_a:hover]:text-brand-hover [&_a:hover]:decoration-2 [&_h3]:mt-8",
      )}
    >
      {blocks.map((b, i) => {
        const step = i > 0 && STEP;
        switch (b.type) {
          case "p":
            return (
              <p key={i} className={cn("text-pretty", step, dropcap && i === firstP && DROPCAP)}>
                <Rich text={b.text} />
              </p>
            );
          case "h2":
            return (
              <h2 key={i} className="mt-12 text-h2 text-fg">
                {b.text}
              </h2>
            );
          case "h3":
            return (
              <h3 key={i} className="mt-8 text-h3 text-fg">
                {b.text}
              </h3>
            );
          case "list":
            return (
              <ul key={i} className={cn("grid gap-3 ps-6", step)}>
                {b.items.map((item) => (
                  <li key={item} className="marker:text-muted-soft">
                    <Rich text={item} />
                  </li>
                ))}
              </ul>
            );
          case "figure":
            return (
              <Frame
                key={i}
                inProse
                src={b.src}
                alt={b.alt}
                width={b.width}
                height={b.height}
                ratio={b.ratio ?? "3x2"}
                size={b.wide ? "wide" : undefined}
                sizes="(max-width: 1024px) 100vw, 46rem"
                caption={b.caption}
                credit={b.credit}
              />
            );
          case "pullquote":
            // block margins only: the browser's inline blockquote margin stays, as in the reference
            return (
              <blockquote
                key={i}
                className={cn(
                  "my-12 border-y-2 border-fg py-6 font-serif text-pullquote leading-125 tracking-h3 text-balance text-fg",
                  "fa:leading-160",
                )}
              >
                {b.text}
                <cite className="mt-4 block font-sans text-caption tracking-normal text-meta not-italic">{b.cite}</cite>
              </blockquote>
            );
          case "blockquote":
            return (
              <blockquote
                key={i}
                className="my-8 border-s-2 border-brand ps-6 font-serif text-body-lg leading-150 text-fg"
              >
                {b.text}
              </blockquote>
            );
          case "recirc":
            return (
              <div key={i} className="my-8 grid gap-4 rounded-md border border-border bg-surface p-6">
                <p className="text-overline font-650 tracking-overline text-meta uppercase">{b.label}</p>
                <CardList>
                  {b.articles.map((a) => (
                    <ArticleCard key={a.slug} article={a} variant="compact" locale={locale} headingLevel={3} />
                  ))}
                </CardList>
              </div>
            );
          case "chapter":
            return (
              <section
                key={i}
                id={b.id}
                className="mt-32 grid scroll-mt-chapter gap-2 border-t-2 border-fg pt-6 first:mt-0 max-md:mt-16"
              >
                <span className="font-mono text-index font-bold tracking-index text-brand uppercase">{b.label}</span>
                <h2 className="mt-0 max-w-ch-20 text-h1 leading-h1 tracking-h1">{b.title}</h2>
              </section>
            );
          case "break":
            return <LongformBreak key={i} {...b} />;
          case "chart":
            return <BarChart key={i} description={b.description} max={b.max} unit={b.unit} rows={b.rows} />;
          case "chartNote":
            return (
              <ChartNote key={i} className={cn(step)}>
                {b.text}
              </ChartNote>
            );
          case "note":
            return (
              <aside
                key={i}
                className={cn(
                  "my-12 grid grid-cols-lead gap-4 border-s-2 border-brand bg-surface-sunk p-6 text-body-sm leading-160 text-fg-soft",
                  "max-md:grid-cols-1 max-md:gap-2 max-md:p-4",
                )}
              >
                <p className="pt-[0.25em] font-mono text-index tracking-index whitespace-nowrap text-brand uppercase">
                  {b.label}
                </p>
                <p>{b.text}</p>
              </aside>
            );
          case "timeline":
            return <Timeline key={i} items={b.items} />;
        }
      })}
    </div>
  );
}

/**
 * .lf-break — the long-form chapter transition: an inverted image band,
 * 4rem wider than the measure on each side (collapses below 1024px).
 */
function LongformBreak({
  src,
  alt,
  width,
  height,
  caption,
  credit,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption: ReactNode;
  credit: ReactNode;
}) {
  return (
    <figure className="relative my-20 -mx-outset w-outset-full bg-ink max-lg:mx-0 max-lg:w-full max-md:my-12">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes="(max-width: 1024px) 100vw, 60rem"
        className="block aspect-20/9 h-auto w-full object-cover opacity-86 max-md:aspect-4/3"
      />
      <figcaption className="flex items-baseline gap-3 px-6 pt-3 pb-4 text-caption text-on-ink/70 [&_b]:font-semibold [&_b]:text-on-ink">
        <span>{caption}</span>
        <FrameCredit className="text-on-ink/55">{credit}</FrameCredit>
      </figcaption>
    </figure>
  );
}

/**
 * .article-head — the opening of a reading page (nova.css §11, §24): kicker,
 * headline, standfirst and the ruled byline row. Centred on desktop, start-
 * aligned on phones.
 */
export function ArticleHead({
  kicker,
  title,
  standfirst,
  byline,
}: {
  kicker: ReactNode;
  title: ReactNode;
  standfirst: ReactNode;
  /** Byline, metadata and share group: they sit on one ruled row. */
  byline: ReactNode;
}) {
  return (
    <Container as="header" className="max-w-article py-12 pb-8 text-center max-md:py-6 max-md:text-start">
      <div className="mb-6 flex items-center justify-center gap-3 max-md:justify-start">{kicker}</div>
      <Heading level={1} size="h1">
        {title}
      </Heading>
      <Text
        variant="intro"
        mt={24}
        className="mx-auto max-w-ch-42 text-center text-body-lg leading-150 max-md:mx-0 max-md:max-w-none max-md:text-start"
      >
        {standfirst}
      </Text>
      <div
        className={cn(
          "mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 border-y border-border py-6",
          "max-md:justify-start [&_p]:justify-center max-md:[&_p]:justify-start",
        )}
      >
        {byline}
      </div>
    </Container>
  );
}

/**
 * .lf-hero — the long-read opening (nova.css §12, §24): a photograph under a
 * dusk veil with the title set at display scale. Everything on it is on the
 * photo tone, whichever theme is active.
 */
export function LongformHero({
  image,
  alt,
  eyebrow,
  title,
  standfirst,
  children,
}: {
  image: string;
  alt: string;
  eyebrow: ReactNode;
  title: ReactNode;
  standfirst: ReactNode;
  /** The byline / metabar / save row. */
  children: ReactNode;
}) {
  return (
    <header className="relative grid min-h-[min(86vh,820px)] items-end overflow-hidden bg-photo text-paper max-md:min-h-[70vh]">
      <Image
        src={image}
        alt={alt}
        width={2000}
        height={900}
        sizes="100vw"
        loading="eager"
        fetchPriority="high"
        className="absolute inset-0 size-full object-cover opacity-55"
      />
      <Container className="relative pt-20 pb-16 max-md:pt-12 max-md:pb-8">
        <Text variant="eyebrow" className="text-photo-brand">
          {eyebrow}
        </Text>
        <Heading level={1} size="display" mt={24} className="max-w-ch-18 text-paper text-lf-title">
          {title}
        </Heading>
        <Text variant="intro" mt={24} className="text-paper/85">
          {standfirst}
        </Text>
        <div className="mt-8 flex flex-wrap items-center gap-6">{children}</div>
      </Container>
    </header>
  );
}

/** .lf-layout — chapter rail beside the story; stacks below 1024px. */
export function LongformLayout({ rail, children }: { rail: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-chapters items-start gap-16 max-lg:grid-cols-1 max-lg:gap-8">
      {rail}
      <div>{children}</div>
    </div>
  );
}
