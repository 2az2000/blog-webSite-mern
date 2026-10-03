import type { Metadata } from "next";

import { ArticleCard } from "@/components/patterns/article-card";
import { Ledger } from "@/components/patterns/ledger";
import { ActiveNav } from "@/components/layout/active-nav";
import { BarChart, ChartNote, PageHead } from "@/components/patterns/blocks";
import { EditorialBreak } from "@/components/patterns/editorial-break";
import { Breadcrumbs } from "@/components/patterns/navigation";
import { SecHead } from "@/components/patterns/sec-head";
import { CardGrid, CardList, Cluster, Col, Container, Grid, Section, Tag } from "@/components/primitives";
import { routes } from "@/config/routes";
import { getDictionary, getLocale } from "@/i18n";
import { getArticles, mostDiscussed, mostRead } from "@/services/content";

/* Trending — blog-refrence/trending.html */

export const metadata: Metadata = {
  title: "Trending",
  description: "What NOVA is reading, ranked by completed reads rather than clicks.",
};

const TOPIC_INDEX = [
  { label: "AI", value: 4.2 },
  { label: "Energy", value: 3.1 },
  { label: "Design", value: 2.4 },
  { label: "Work", value: 2.2 },
  { label: "Archives", value: 1.3, muted: true },
];

const TOPIC_TAGS = [
  { label: "Artificial intelligence", topic: "artificial-intelligence" },
  { label: "Climate", topic: "climate" },
  { label: "Design systems", topic: "design-systems" },
  { label: "Work", topic: "work" },
  { label: "Archives", topic: "archives" },
];

export default async function TrendingPage() {
  const locale = await getLocale();
  const t = await getDictionary(locale);
  const [top10, read, discussed, rising] = await Promise.all([
    mostRead(10),
    mostRead(4),
    mostDiscussed(4),
    getArticles(["battery-chemistry", "public-transit", "type-revival"]),
  ]);

  return (
    <>
      <ActiveNav section="latest" />
      <Container>
        <Breadcrumbs
          label={t.a11y.breadcrumb}
          items={[{ label: t.nav.home, href: routes.home() }, { label: "Trending" }]}
        />
      </Container>

      <PageHead
        eyebrow="Updated every 15 minutes"
        title="What NOVA is reading"
        lead="Ranked by completed reads rather than clicks, so a headline that disappoints does not climb. Movement is measured against the same hour yesterday."
      />

      {/* TRENDING NOW */}
      <Section aria-labelledby="now-title">
        <Grid  container rowGap={48}>
          <Col span={8}>
            <SecHead
              index={1}
              id="now-title"
              locale={locale}
              weight="major"
              title="Trending now"
              link={{ label: "Top 10 · completed reads" }}
            />
            <Ledger articles={top10} locale={locale} showMovement />
          </Col>
          <Col span={4} as="aside" className="grid content-start gap-16">
            <div>
              <SecHead index={2} locale={locale} title="Most read today" />
              <CardList>
                {read.map((a) => (
                  <ArticleCard key={a.slug} article={a} variant="compact" locale={locale} />
                ))}
              </CardList>
            </div>
            <div>
              <SecHead index={3} locale={locale} weight="accent" title="Most discussed" />
              <CardList>
                {discussed.map((a, i) => (
                  <ArticleCard key={a.slug} article={a} variant="numbered" rank={i + 1} locale={locale} />
                ))}
              </CardList>
            </div>
          </Col>
        </Grid>
      </Section>

      <EditorialBreak
        id="tr-brk"
        kicker="How we count"
        quote={
          <>
            A click is a decision to open something. A completed read is a decision to <em>stay</em>. Only the second
            one tells you a story was worth writing.
          </>
        }
        cite="NOVA measurement note · ranking updates every 15 minutes"
      />

      {/* RISING */}
      <Section aria-labelledby="rising-title">
        <Container>
          <SecHead
            index={4}
            id="rising-title"
            locale={locale}
            title="Rising"
            link={{ label: "Fastest growth in the last six hours" }}
          />
          <CardGrid cols={3}>
            {rising.map((a) => (
              <ArticleCard key={a.slug} article={a} locale={locale} />
            ))}
          </CardGrid>
        </Container>
      </Section>

      {/* TRENDING TOPICS */}
      <Section aria-labelledby="topics-title">
        <Container>
          <SecHead
            index={5}
            id="topics-title"
            locale={locale}
            title="Trending topics"
            link={{ label: "Browse topics", href: routes.topic("artificial-intelligence") }}
          />
          <BarChart
            description="Share of NOVA reads by topic over the past seven days: Artificial intelligence 4.2 percent-share index, Energy and infrastructure 3.1, Design systems 2.4, Labour and work 2.2, Archives and memory 1.3."
            max={4.2}
            unit="index"
            rows={TOPIC_INDEX}
          />
          <ChartNote>
            Index = share of completed reads over seven days, normalised against this quarter&apos;s average. Placeholder
            figures for the prototype.
          </ChartNote>
          <Cluster gap={12} mt={32}>
            {TOPIC_TAGS.map((tag) => (
              <Tag key={tag.topic} href={routes.topic(tag.topic)}>
                {tag.label}
              </Tag>
            ))}
          </Cluster>
        </Container>
      </Section>
    </>
  );
}
