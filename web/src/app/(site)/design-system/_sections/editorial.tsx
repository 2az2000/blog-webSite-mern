import { ArticleCard } from "@/components/patterns/article-card";
import { ChartNote } from "@/components/patterns/blocks";
import { EditorialBreak } from "@/components/patterns/editorial-break";
import { Frame } from "@/components/patterns/frame";
import { Ledger, SpecLedger } from "@/components/patterns/ledger";
import { Metabar } from "@/components/patterns/metabar";
import { SecHead, SecMark } from "@/components/patterns/sec-head";
import { CardGrid, CardList, Code, Col, Container, Grid, Heading, Section, Stack, Text } from "@/components/primitives";
import { routes } from "@/config/routes";
import type { Locale } from "@/i18n/config";
import { getArticle, getArticles, mostRead } from "@/services/content";

/* design-system.html §05 signatures, S4 break, §06 card system. */

const H4 = ({ children, mb = 16, mt }: { children: React.ReactNode; mb?: 16; mt?: 64 }) => (
  <Heading level={3} size="h4" mb={mb} mt={mt}>
    {children}
  </Heading>
);

/* .frontpage__lead restyles any card inside it to the lead scale (§23 outranks the variant's own size). */
const LEAD_SCALE = {
  titleClassName: "my-4 text-lead leading-lead tracking-lead",
  standfirstClassName: "mb-4 max-w-ch-52 leading-150 text-fg-soft",
};

export async function EditorialSections({ locale }: { locale: Locale }) {
  const [board, lead, featured, standard, horizontal, video, compact, numbered, minimal, opinion] = await Promise.all([
    mostRead(5),
    getArticle("context-software"),
    getArticle("grid-rebuild"),
    getArticle("human-brain"),
    getArticle("open-source-money"),
    getArticle("city-night"),
    getArticles(["type-revival", "ocean-floor", "public-transit"]),
    getArticles(["ai-labour", "founder-mode", "attention-economy"]),
    getArticles(["battery-chemistry", "slow-fashion", "remote-labs"]),
    getArticles(["think-better", "interview-rasmussen"]),
  ]);

  return (
    <>
      {/* 05 · Editorial signatures */}
      <Section aria-labelledby="sig-title">
        <Container>
          <SecHead
            index={5}
            id="sig-title"
            locale={locale}
            weight="accent"
            title="Editorial signatures"
            note="Five marks that make a page recognisable as NOVA before a word is read. They are the Phase 2 answer to “every section looks like the same card grid”."
          />

          <H4>S1 · Indexed section divider — four weights</H4>
          <Text variant="meta" mb={24} measure="long">
            One component, four weights, an index numeral on the rule. Alternating the weights down a page is what
            produces the large → quiet → dense rhythm; the homepage runs major, quiet, accent in that order.
          </Text>

          <SecHead
            index={1}
            locale={locale}
            weight="major"
            title="Major — the band that owns the screen"
            link={{ label: "Example", href: routes.home() }}
          />
          <SecHead index={2} locale={locale} title="Default — a working section" link={{ label: "A note, not an action" }} />
          <SecHead index={3} locale={locale} weight="quiet" title="Quiet — a breather between two dense bands" />
          <SecHead index={4} locale={locale} weight="accent" title="Accent — opinion and interviews" />
          <SecMark />
          <Text variant="meta">
            Above: <Code>.sec-mark</Code>, the fifth state — no rule, no title, a centred typographic breath between
            movements.
          </Text>

          <H4 mt={64}>S2 · Broadsheet ledger</H4>
          <Text variant="meta" mb={24} measure="long">
            Ranking as a printed table. Movement direction comes from each record&apos;s own <Code>trend</Code> field and
            is labelled in words, never by colour alone. Phase 1 printed a “places moved” figure computed from the loop
            index — a number the data never held — and it has been removed.
          </Text>
          <Ledger articles={board} locale={locale} showMovement />

          <H4 mt={64}>S3 · The metadata lockup</H4>
          <Text variant="meta" mb={24} measure="long">
            One lockup on every surface: author in ink, everything after it muted, separated by a hairline stroke rather
            than a dot, with tabular figures so stacked cards align down the column.
          </Text>
          <Stack gap={16}>
            <Metabar strong by="Elena Duarte">
              Sep 12, 2026
              {"14 min read"}
            </Metabar>
            <Metabar by="Sofia Lindqvist">
              Investigations
              {"32 min"}
            </Metabar>
          </Stack>

          <H4 mt={64}>S5 · Ratio-locked image frame</H4>
          <Text variant="meta" mb={24} measure="long">
            The container takes the ratio; the image never negotiates. Ratios are modifiers — <Code>--3x2</Code>,{" "}
            <Code>--4x5</Code>, <Code>--1x1</Code>, <Code>--16x9</Code>, <Code>--20x9</Code> — so a page cannot invent a
            ninth crop inline. <Code>.frame--natural</Code> renders a full frame for content that must not be cropped.
          </Text>
          <CardGrid cols={3} gap={24}>
            <Frame
              src="/images/quiet-office.jpg"
              alt="An empty open-plan office at dusk, chairs pushed in."
              ratio="3x2"
              caption="3 : 2 — the article default"
              credit="NOVA"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            <Frame
              src="/images/type-revival.jpg"
              alt="Metal type sorts arranged in a composing stick."
              ratio="1x1"
              caption="1 : 1 — compact thumbnails"
              credit="NOVA"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            <Frame
              src="/images/city-night.jpg"
              alt="A city skyline at night seen from an elevated road."
              ratio="16x9"
              focus="top"
              caption="16 : 9 with a top focus"
              credit="NOVA"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </CardGrid>
        </Container>
      </Section>

      {/* S4 · The break */}
      <EditorialBreak
        id="brk-demo"
        kicker="S4 · Full-bleed editorial break"
        quote={
          <>
            One per page, never two. The page goes to ink, a single sentence carries the whole band, and the reader comes
            back out onto <em>paper</em>.
          </>
        }
        cite={
          <>
            <b>Placement</b> · homepage, category, author, newsletter and trending. Long-form uses its own inverted
            language instead — the hero and the <Code>.lf-break</Code> image bands.
          </>
        }
      />

      {/* 06 · Card system */}
      <Section aria-labelledby="cards-title">
        <Container>
          <SecHead
            index={6}
            id="cards-title"
            locale={locale}
            weight="major"
            title="Article card system"
            note="Eight variants, one grammar. Every variant sits one clear step from its neighbours on the rank ladder, and image ratio is a per-variant token, never a local override."
          />
          <SpecLedger
            as="div"
            className="mb-12"
            rows={[
              ["Lead", "One per page — the dominant story", "40 → 64px"],
              ["Featured", "Section hero", "28 → 40px"],
              ["Default", "The workhorse grid card", "24 → 32px"],
              ["Horizontal", "Same rank, different composition", "24 → 32px"],
              ["Minimal", "Text-only rail", "19 → 22px"],
              ["Opinion", "Author-forward, serif italic", "19 → 22px"],
              ["Compact", "Thumbnail list — 1 : 1 media", "16px"],
              ["Numbered", "Ranked list inside a rail", "16px"],
            ]}
          />

          <H4>Lead — one per page, the dominant story</H4>
          <div className="mb-12">
            {lead && <ArticleCard article={lead} variant="featured" locale={locale} {...LEAD_SCALE} />}
          </div>

          <Grid rowGap={48}>
            <Col span={6}>
              <H4>Featured</H4>
              {featured && <ArticleCard article={featured} variant="featured" locale={locale} />}
            </Col>
            <Col span={6}>
              <H4>Default — the workhorse grid card</H4>
              {standard && <ArticleCard article={standard} locale={locale} />}
            </Col>
            <Col span={12}>
              <H4>Horizontal</H4>
              {horizontal && <ArticleCard article={horizontal} variant="horizontal" locale={locale} />}
            </Col>
            <Col span={4}>
              <H4>Compact</H4>
              <CardList>
                {compact.map((a) => (
                  <ArticleCard key={a.slug} article={a} variant="compact" locale={locale} />
                ))}
              </CardList>
            </Col>
            <Col span={4}>
              <H4>Numbered</H4>
              <CardList>
                {numbered.map((a, i) => (
                  <ArticleCard key={a.slug} article={a} variant="numbered" rank={i + 1} locale={locale} />
                ))}
              </CardList>
            </Col>
            <Col span={4}>
              <H4>Minimal</H4>
              <CardList>
                {minimal.map((a) => (
                  <ArticleCard key={a.slug} article={a} variant="minimal" locale={locale} />
                ))}
              </CardList>
            </Col>
            <Col span={6}>
              <H4>Opinion — author-forward, no image</H4>
              <CardList>
                {opinion.map((a) => (
                  <ArticleCard key={a.slug} article={a} variant="opinion" locale={locale} />
                ))}
              </CardList>
            </Col>
            <Col span={6}>
              <H4>Video — play affordance and runtime</H4>
              {video && <ArticleCard article={video} variant="video" locale={locale} />}
            </Col>
            <Col span={12}>
              <H4>Long read — immersive, inverted overlay</H4>
              {featured && <ArticleCard article={featured} variant="longread" locale={locale} />}
            </Col>
          </Grid>

          <ChartNote className="mt-8">
            Hover on every variant: the image scales 1.03 over 360ms and the headline&apos;s underline changes colour
            only — it is drawn transparent at rest, so a two-line headline never reflows. Focus reproduces the same
            treatment and adds a ring on the whole card.
          </ChartNote>
        </Container>
      </Section>
    </>
  );
}
