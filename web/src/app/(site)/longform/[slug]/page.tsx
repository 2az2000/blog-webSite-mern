import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ChapterNav, MobileArticleBar } from "@/components/patterns/article-client";
import { ArticleCard } from "@/components/patterns/article-card";
import { ArticleBody, AuthorBio, LongformHero, LongformLayout, TagRow } from "@/components/patterns/article-parts";
import { Byline } from "@/components/patterns/blocks";
import { BookmarkButton, ShareTextButtons } from "@/components/patterns/actions";
import { Metabar } from "@/components/patterns/metabar";
import { ReadingProgress } from "@/components/patterns/reading-progress";
import { SecHead } from "@/components/patterns/sec-head";
import { Avatar, CardGrid, Container, Section } from "@/components/primitives";
import { routes } from "@/config/routes";
import { getDictionary, getLocale } from "@/i18n";
import { formatDate, formatNumber } from "@/lib/format";
import { getLongformPage, getSection, listLongformSlugs } from "@/services/content";

/* Long read — blog-refrence/longform.html */

export async function generateStaticParams() {
  return (await listLongformSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/longform/[slug]">): Promise<Metadata> {
  const data = await getLongformPage((await params).slug);
  if (!data) return {};
  const { article: a } = data;
  return {
    title: a.title,
    description: "A continent-wide rewiring, conducted mostly at night, by crews who have been at it since 2019. A NOVA long read.",
    openGraph: { title: a.title, images: [a.image], type: "article" },
  };
}

export default async function LongformPage({ params }: PageProps<"/longform/[slug]">) {
  const data = await getLongformPage((await params).slug);
  if (!data) notFound();
  const locale = await getLocale();
  const t = await getDictionary(locale);
  const { article: a, detail, body, chapters, related } = data;
  const author = a.authorRef;
  const section = getSection(detail.relatedSection);
  const firstChapter = chapters[0]?.id ?? "";

  return (
    <>
      <ReadingProgress targetId="longread" />

      <article id="longread">
        {/* IMMERSIVE HERO */}
        <LongformHero
          image={a.image}
          alt={detail.heroAlt}
          eyebrow={detail.eyebrow}
          title={a.title}
          standfirst={a.standfirst}
        >
          <Byline
            tone="lf-hero"
            avatar={<Avatar initials={author.initials} tone="opinion" />}
            name={
              <Link className="text-inherit" href={routes.author(author.slug)}>
                {author.name}
              </Link>
            }
            meta={detail.bylineRole}
          />
          <Metabar tone="lf-hero">
            <time dateTime={a.date}>{formatDate(a.date, locale)}</time>
            {t.card.minRead(formatNumber(a.mins, locale))}
            {`${formatNumber(chapters.length, locale)} chapters`}
          </Metabar>
          <BookmarkButton slug={a.slug} label={a.title} variant="button" tone="photo" />
        </LongformHero>

        {/* CHAPTER NAV + BODY */}
        <Section>
          <Container>
            <LongformLayout rail={<ChapterNav chapters={chapters} actions={<ShareTextButtons />} />}>
              <ArticleBody blocks={body} locale={locale} />
              <AuthorBio
                author={author}
                locale={locale}
                label={t.article.reportedBy}
                tone="opinion"
                bio={detail.reporterBio}
              />
              <TagRow id="lf-tags" locale={locale} tags={detail.filedUnder} />
            </LongformLayout>
          </Container>
        </Section>

        <Section aria-labelledby="lf-related">
          <Container>
            <SecHead
              index={1}
              id="lf-related"
              locale={locale}
              weight="major"
              title="Related stories"
              link={{
                label: `More from ${section?.name ?? a.sectionRef.name}`,
                href: routes.category(detail.relatedSection),
              }}
            />
            <CardGrid>
              {related.map((r) => (
                <ArticleCard key={r.slug} article={r} locale={locale} />
              ))}
            </CardGrid>
          </Container>
        </Section>
      </article>

      <MobileArticleBar
        cta={t.article.backToChapterOne}
        href={`#${firstChapter}`}
        slug={a.slug}
        saveLabel={t.article.thisLongRead}
      />
    </>
  );
}
