import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleCard } from "@/components/patterns/article-card";
import { PageHead, Stat, StatStrip } from "@/components/patterns/blocks";
import { EditorialBreak } from "@/components/patterns/editorial-break";
import { Panel } from "@/components/patterns/feedback";
import { NewsletterForm } from "@/components/patterns/forms";
import { Breadcrumbs } from "@/components/patterns/navigation";
import { SecHead } from "@/components/patterns/sec-head";
import { routes } from "@/config/routes";
import { getDictionary, getLocale } from "@/i18n";
import { formatDate, formatNumber } from "@/lib/format";
import { articlesInSection, getArticles, getSection, listSectionSlugs, mostRead } from "@/services/content";
import { CardList, Container, Heading, Text } from "@/components/primitives";

import { CategoryBrowser } from "./category-browser";

/* Section — blog-refrence/category.html */

export async function generateStaticParams() {
  return (await listSectionSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/category/[slug]">): Promise<Metadata> {
  const section = getSection((await params).slug);
  return section ? { title: section.name, description: section.blurb } : {};
}

export default async function CategoryPage({ params }: PageProps<"/category/[slug]">) {
  const { slug } = await params;
  const section = getSection(slug);
  if (!section) notFound();
  const locale = await getLocale();
  const t = await getDictionary(locale);

  const [pool, trending, picks] = await Promise.all([
    articlesInSection(slug),
    mostRead(5),
    getArticles(["interview-rasmussen", "archive-fever", "remote-labs"]),
  ]);

  const writers = new Set(pool.map((a) => a.author)).size;
  const minutes = pool.reduce((sum, a) => sum + a.mins, 0);
  const newest = pool.map((a) => a.date).sort().at(-1);
  // Reference: the date without its year ("Sep 12").
  const updated = newest ? formatDate(newest, locale).replace(/, \d{4}$/, "") : "—";

  return (
    <>
      <Container>
        <Breadcrumbs
          label={t.a11y.breadcrumb}
          items={[
            { label: t.nav.home, href: routes.home() },
            { label: "Sections", href: routes.category("latest") },
            { label: section.name },
          ]}
        />
      </Container>

      <PageHead eyebrow="NOVA Section" title={section.name} lead={section.blurb}>
        <StatStrip className="mt-12">
          <Stat value={formatNumber(pool.length, locale)} label="Stories in this section" />
          <Stat value={formatNumber(writers, locale)} label="Contributing writers" />
          <Stat value={formatNumber(minutes, locale)} label="Minutes of reading" />
          <Stat value={updated} label="Last updated" />
        </StatStrip>
      </PageHead>

      <CategoryBrowser
        pool={pool}
        aside={
          <>
            <div>
              <SecHead index={3} locale={locale} title="Trending in section" />
              <CardList>
                {trending.map((a, i) => (
                  <ArticleCard key={a.slug} article={a} variant="numbered" rank={i + 1} locale={locale} />
                ))}
              </CardList>
            </div>
            <div>
              <SecHead index={4} locale={locale} title="Editors’ picks" />
              <CardList  gap={24}>
                {picks.map((a) => (
                  <ArticleCard key={a.slug} article={a} variant="compact" locale={locale} />
                ))}
              </CardList>
            </div>
            <Panel variant="sunk">
              <Text variant="eyebrow" tone="accent">
                Section newsletter
              </Text>
              {/* the reference writes mt-12 here, a class it never defines: no top margin */}
              <Heading level={3} size="h4" mb={12}>
                Get this desk by email
              </Heading>
              <Text variant="meta" mb={16}>
                A weekly round-up from the editors who commission this section.
              </Text>
              <NewsletterForm
                variant="stack"
                label="Email"
                buttonLabel="Follow section"
                success="You're following this section."
              />
            </Panel>
          </>
        }
      />

      <EditorialBreak
        id="cat-brk"
        kicker="How this desk works"
        quote={
          <>
            A section is an argument about what deserves attention. Ours is that the <em>maintenance</em> of a thing is
            more revealing than its launch.
          </>
        }
        cite={
          <>
            NOVA editorial standards · <Link href={routes.newsletter()}>Get this desk by email</Link>
          </>
        }
      />
    </>
  );
}
