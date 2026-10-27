import Link from "next/link";

import { ArticleCard, autoVariant } from "@/components/patterns/article-card";
import { Ledger } from "@/components/patterns/ledger";
import {
  EditionLine,
  FrontPageLead,
  frontpageRail,
  frontpageSecondary,
  frontpageSecondaryCard,
  frontpageSection,
  RailHead,
  TopicTiles,
} from "@/components/patterns/front-page";
import { EditorialBreak } from "@/components/patterns/editorial-break";
import { NewsletterBand } from "@/components/patterns/newsletter-band";
import { RevealList } from "@/components/patterns/reveal-list";
import { SecHead, SecMark } from "@/components/patterns/sec-head";
import { ButtonLink, CardList, Col, Container, Grid, Section, Text } from "@/components/primitives";
import { routes } from "@/config/routes";
import { JsonLd } from "@/components/seo/json-ld";
import { FOUNDED, issueNumber } from "@/config/site";
import { websiteLd } from "@/lib/seo";
import { getDictionary, getLocale } from "@/i18n";
import { formatLongDate, formatNumber, formatWeekday } from "@/lib/format";
import { getHomePlacement, latestExcluding, listSections, mostRead } from "@/services/content";

/*
 * Front page — blog-refrence/index.html.
 * Rhythm: large → dense → quiet → dense → immersive → quiet → large.
 */

/** The five desks the front page shows as picture tiles; each tile's count is the desk's real number of published stories. */
const TILES = [
  { slug: "technology", label: "Technology", image: "/images/topic-technology.jpg" },
  { slug: "science", label: "Science", image: "/images/topic-science.jpg" },
  { slug: "business", label: "Business", image: "/images/topic-business.jpg" },
  { slug: "design", label: "Design", image: "/images/topic-design.jpg" },
  { slug: "culture", label: "Culture", image: "/images/topic-culture.jpg" },
] as const;

export default async function HomePage() {
  const locale = await getLocale();
  const t = await getDictionary(locale);
  const today = new Date();
  // the editors choose the placement in the back office; the Latest list is everything not already placed above it
  const { lead, secondary, brief, picks, opinion, longread: longRead } = await getHomePlacement();
  const [latest, board, sections] = await Promise.all([
    latestExcluding([lead, ...secondary, ...brief].flatMap((a) => (a ? [a.slug] : []))),
    mostRead(5),
    listSections(),
  ]);
  const counts = new Map(sections.map((s) => [s.slug, s.count]));
  const tiles = TILES.map((tile) => ({
    label: tile.label,
    href: routes.category(tile.slug),
    image: tile.image,
    count: t.card.stories(formatNumber(counts.get(tile.slug) ?? 0, locale)),
  }));

  return (
    <>
      <JsonLd data={websiteLd(t.site.description)} />
      {/* LARGE · front page */}
      <section className={frontpageSection} aria-labelledby="lead-story">
        <Container>
          <EditionLine
            edition={`${formatWeekday(today, locale)} edition`}
            date={formatLongDate(today, locale)}
            issue={`Nº ${issueNumber(today)} · Independent since ${FOUNDED}`}
          />
          <Grid  rowGap={48}>
            <Col span={8}>
              {lead && (
                <FrontPageLead
                  article={lead}
                  locale={locale}
                  label="The lead story"
                  alt="A long exposure of a server hall corridor, racks receding into low blue light."
                />
              )}
              <div className={frontpageSecondary}>
                {secondary.map((a) => (
                  <ArticleCard
                    key={a.slug}
                    article={a}
                    variant="minimal"
                    locale={locale}
                    headingLevel={2}
                    {...frontpageSecondaryCard}
                  />
                ))}
              </div>
            </Col>
            <Col span={4} as="aside" className={frontpageRail} aria-labelledby="brief-title">
              <RailHead id="brief-title" title="The Brief" note="Four things worth your morning, chosen by the editors." />
              <CardList>
                {brief.map((a) => (
                  <ArticleCard
                    key={a.slug}
                    article={a}
                    variant="minimal"
                    locale={locale}
                    className="first-of-type:border-t-0 first-of-type:pt-0"
                  />
                ))}
              </CardList>
              <ButtonLink href={routes.category("latest")} variant="secondary">
                Read everything from today
              </ButtonLink>
            </Col>
          </Grid>
        </Container>
      </section>

      {/* DENSE · latest */}
      <Section aria-labelledby="latest-title">
        <Container>
          <SecHead
            index={1}
            id="latest-title"
            locale={locale}
            weight="major"
            title="Latest stories"
            link={{ label: "All stories", href: routes.category("latest") }}
          />
          <RevealList
            initial={6}
            step={3}
            label="Load more stories"
            doneLabel="You’re all caught up"
            items={latest.map((a) => {
              const v = autoVariant(a);
              return <ArticleCard key={a.slug} article={a} variant={v === "opinion" ? "default" : v} locale={locale} />;
            })}
          />
        </Container>
      </Section>

      {/* QUIET · mark */}
      <Container>
        <SecMark />
      </Container>

      {/* DENSE · the board + picks */}
      <Section aria-labelledby="trending-title">
        <Grid  container rowGap={64}>
          <Col span={5}>
            <SecHead
              index={2}
              id="trending-title"
              locale={locale}
              title="The board"
              link={{ label: "Full board", href: routes.trending() }}
              note="Ranked by completed reads, not clicks."
            />
            <Ledger articles={board} locale={locale} />
          </Col>
          <Col span={7}>
            <SecHead
              index={3}
              id="picks-title"
              locale={locale}
              title="Editor’s picks"
              link={{ label: "More", href: routes.category("latest") }}
            />
            <CardList  gap={32}>
              {picks.map((a) => (
                <ArticleCard key={a.slug} article={a} variant="horizontal" locale={locale} />
              ))}
            </CardList>
          </Col>
        </Grid>
      </Section>

      {/* IMMERSIVE · the break */}
      <EditorialBreak
        id="brk-title"
        kicker="From the editor"
        quote={
          <>
            We are not short of information. We are short of the patience it takes to decide what any of it{" "}
            <em>means</em> — which is the whole of the job.
          </>
        }
        cite={
          <>
            <b>Marcus Feldt</b>, Business Editor · <Link href={routes.newsletter()}>Read this week’s Dispatch</Link>
          </>
        }
      />

      {/* QUIET · topics */}
      <Section aria-labelledby="topics-title">
        <Container>
          <SecHead
            index={4}
            id="topics-title"
            locale={locale}
            weight="quiet"
            title="Where to start"
            link={{ label: "All topics", href: routes.topic("artificial-intelligence") }}
          />
          <TopicTiles tiles={tiles} />
        </Container>
      </Section>

      {/* IMMERSIVE · long read */}
      <Section aria-labelledby="longread-title">
        <Container>
          <SecHead
            index={5}
            id="longread-title"
            locale={locale}
            weight="major"
            title="The long read"
            link={{ label: "Open the full feature", href: routes.longform("grid-rebuild") }}
          />
          {longRead && <ArticleCard article={longRead} variant="longread" locale={locale} />}
        </Container>
      </Section>

      {/* DENSE · opinion */}
      <Section aria-labelledby="opinion-title">
        <Grid  container rowGap={32}>
          <Col span={4}>
            <SecHead index={6} id="opinion-title" locale={locale} weight="accent" title="Opinion & interviews" />
            <Text variant="meta" measure="short">
              Signed arguments from NOVA writers and outside contributors. Every piece is open to reply in the comments.
            </Text>
            <ButtonLink href={routes.category("opinion")} variant="ghost" flush className="mt-4">
              All opinion →
            </ButtonLink>
          </Col>
          <Col span={8}>
            <CardList>
              {opinion.map((a) => (
                <ArticleCard key={a.slug} article={a} variant="opinion" locale={locale} />
              ))}
            </CardList>
          </Col>
        </Grid>
      </Section>

      {/* LARGE · newsletter */}
      <NewsletterBand
        id="nl-title"
        eyebrow="The NOVA Dispatch"
        title="One email. Six stories. No noise."
        lead="Every Tuesday and Friday our editors write up what mattered and why — the reporting behind the headline, not a link dump. Free, and you can leave in one click."
        aside={
          <Text variant="meta" tone="soft" mt={24}>
            Joined by 214,000 readers ·{" "}
            <Link className="text-inherit" href={routes.newsletter()}>
              See a sample issue
            </Link>
          </Text>
        }
        form={{
          offers: "Also send me occasional subscriber offers. Optional, and separate from the Dispatch.",
          footnote: "We never sell reader data. Unsubscribe from any issue — one click, no survey.",
        }}
      />
    </>
  );
}
