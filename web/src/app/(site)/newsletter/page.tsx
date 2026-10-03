import type { Metadata } from "next";

import { ArticleCard } from "@/components/patterns/article-card";
import { Accordion, ReaderQuote, Stat, StatStrip } from "@/components/patterns/blocks";
import { EditorialBreak } from "@/components/patterns/editorial-break";
import { Frame } from "@/components/patterns/frame";
import { Breadcrumbs } from "@/components/patterns/navigation";
import { Panel } from "@/components/patterns/feedback";
import { CardGrid, CardList, Cluster, Col, Container, flex, Grid, Heading, Section, Text, TextLink, Wordmark } from "@/components/primitives";
import { SecHead } from "@/components/patterns/sec-head";
import { routes } from "@/config/routes";
import { getDictionary, getLocale } from "@/i18n";
import { cn } from "@/lib/utils";
import { getArticles } from "@/services/content";

import { DispatchSignup, FrequencyPicker, TopicToggles } from "./newsletter-client";

/* Newsletters — blog-refrence/newsletter.html */

export const metadata: Metadata = {
  title: "The NOVA Dispatch",
  description: "One email. Six stories. No noise. The NOVA Dispatch, free, twice a week.",
};

const BENEFITS = [
  {
    title: "Written, not generated",
    body: "Each issue is written by the editor who commissioned the stories in it, and signed. If a piece was wrong, the correction is in the next issue, at the top.",
  },
  {
    title: "Six stories, ranked",
    body: "Ordered by what we think matters, not by what performed. Two of the six are always from outside the week's obvious news.",
  },
  {
    title: "Nothing hidden behind it",
    body: "Every story linked in the Dispatch is readable without a subscription. The newsletter is not a funnel with a paywall at the end of it.",
  },
];

const FAQ = [
  {
    q: "Is it really free?",
    a: "Yes, and it stays free. The Dispatch is how most readers find NOVA; putting it behind the paywall would defeat the point of having one.",
  },
  {
    q: "What do you do with my email address?",
    a: "We send you the Dispatch. We do not sell it, rent it, or hand it to an advertiser. Delivery runs through a processor listed in the privacy notice, and you can request deletion at any time.",
  },
  {
    q: "Will I be able to read the linked stories?",
    a: "All of them. Everything the Dispatch links to is outside the paywall for the week it runs, including long reads.",
  },
  {
    q: "How do I unsubscribe?",
    a: "One link at the bottom of every issue, one click, done immediately. There is no confirmation page designed to talk you out of it.",
  },
  {
    q: "Can I get only one section?",
    a: "Yes — pick topics above, or follow a single desk from its section page. Section emails are weekly and separate from the Dispatch.",
  },
];

export default async function NewsletterPage() {
  const locale = await getLocale();
  const t = await getDictionary(locale);
  const sample = await getArticles(["grid-rebuild", "archive-fever", "open-source-money"]);

  return (
    <>
      <Container>
        <Breadcrumbs
          label={t.a11y.breadcrumb}
          items={[{ label: t.nav.home, href: routes.home() }, { label: "Newsletters" }]}
        />
      </Container>

      {/* HERO */}
      <Section as="header" aria-labelledby="nl-hero-title">
        <Container>
          <Grid rowGap={48}>
          <Col span={7}>
            <Text variant="eyebrow" tone="accent" mb={16}>
              The NOVA Dispatch · free
            </Text>
            <Heading level={1} size="display" id="nl-hero-title">
              One email.
              <br />
              Six stories.
              <br />
              No noise.
            </Heading>
            <Text variant="intro" mt={24}>
              Tuesday and Friday, our editors write up what mattered and why — the reporting behind the headline, not a
              link dump. Two minutes to read, and nothing in it you have already seen four times.
            </Text>
            <DispatchSignup />
          </Col>
          <Col span={5}>
            <StatStrip single gap={24}>
              <Stat value="214,000" label="Readers on the list" />
              <Stat value="2×" label="Issues per week — Tuesday and Friday" />
              <Stat value="2 min" label="Median reading time per issue" />
              <Stat value="0" label="Sponsored placements inside the edit" />
            </StatStrip>
          </Col>
          </Grid>
        </Container>
      </Section>

      {/* BENEFITS */}
      <Section aria-labelledby="benefits-title">
        <Container>
          <SecHead index={1} id="benefits-title" locale={locale} weight="major" title="What you actually get" />
          <CardGrid cols={3} gap={32}>
            {BENEFITS.map((b) => (
              <div key={b.title}>
                <Heading level={3} size="h3">
                  {b.title}
                </Heading>
                {/* the reference writes mt-12 here, a class it never defines: no top margin */}
                <Text tone="muted">{b.body}</Text>
              </div>
            ))}
          </CardGrid>
        </Container>
      </Section>

      {/* SAMPLE ISSUE */}
      <Section id="sample" aria-labelledby="sample-title">
        <Grid container rowGap={48}>
          <Col span={5}>
            <SecHead index={2} id="sample-title" locale={locale} title="A recent issue" />
            <Frame
              src="/images/newsletter-sample.jpg"
              alt="A printed copy of the Dispatch on a desk beside a coffee cup and a notebook."
              width={1200}
              height={800}
              sizes="(max-width: 768px) 100vw, 40vw"
              caption="Issue 418, sent Friday 5 September 2026."
              credit="Photograph for NOVA"
            />
          </Col>
          <Col span={7}>
            <Panel className="h-full">
              <Cluster gap={12} wrap={false} className="border-b-2 border-fg pb-4">
                <Wordmark size="sm" className={flex.fixed} />
                <Text as="span" variant="meta" className={flex.fill}>
                  The Dispatch · Issue 418
                </Text>
                <Text as="span" variant="meta" className={cn(flex.fixed, "whitespace-nowrap")}>
                  Fri 5 Sep
                </Text>
              </Cluster>
              <p className="my-6 font-serif text-h4 leading-h4 tracking-h4 text-fg">
                Two things this week that look unrelated and are not: the interconnection queue, and who is still paying
                to host the internet&apos;s archives. Both are maintenance stories. Both are being decided by people
                nobody elected to decide them.
              </p>
              <Text variant="meta" mb={16}>
                — Marcus Feldt, Business Editor
              </Text>
              <CardList>
                {sample.map((a, i) => (
                  <ArticleCard key={a.slug} article={a} variant="numbered" rank={i + 1} locale={locale} headingLevel={4} />
                ))}
              </CardList>
              {/* p.meta.tagrow: the filed-under row's rule and spacing, set as a footnote */}
              <Text
                variant="meta"
                className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-6 pb-12"
              >
                You are receiving this because you subscribed at nova.example. <TextLink href="#sample">Unsubscribe</TextLink> ·{" "}
                <TextLink href="#sample">Change frequency</TextLink>
              </Text>
            </Panel>
          </Col>
        </Grid>
      </Section>

      <EditorialBreak
        id="nl-brk"
        kicker="What the Dispatch is not"
        quote={
          <>
            It is not a list of links. An editor writes it, signs it, and explains why six stories mattered — which
            takes longer and is the <em>whole point</em>.
          </>
        }
        cite={
          <>
            <b>Hannah Vo</b>, Culture Writer · writes the Friday issue
          </>
        }
      />

      {/* PREFERENCES */}
      <Section aria-labelledby="prefs-title">
        <Grid container rowGap={48}>
          <Col span={7}>
            <SecHead index={3} id="prefs-title" locale={locale} title="Pick your topics" />
            <Text variant="meta" measure="note" mb={24}>
              Optional. Leaving everything off gets you the full Dispatch, which is what most readers do.
            </Text>
            <TopicToggles />
          </Col>
          <Col span={5}>
            <SecHead index={4} locale={locale} title="Frequency" />
            <FrequencyPicker />
          </Col>
        </Grid>
      </Section>

      {/* TESTIMONIALS */}
      <Section aria-labelledby="quotes-title">
        <Container>
          <SecHead index={5} id="quotes-title" locale={locale} title="What readers say" />
          <CardGrid cols={3} gap={32}>
            <ReaderQuote
              quote="“It is the only newsletter I read on the day it arrives. Mostly because it is short enough that putting it off would take more effort.”"
              initials="RK"
              name="Reader in Lisbon"
              meta="Subscriber since 2023"
            />
            <ReaderQuote
              quote="“I forward roughly one story a week to my team. That has never once been because of a headline.”"
              initials="AT"
              tone="opinion"
              name="Engineering lead"
              meta="Subscriber since 2022"
            />
            <ReaderQuote
              quote="“They ran a correction at the top of an issue once. I have trusted the rest of it more ever since.”"
              initials="MB"
              name="Researcher"
              meta="Subscriber since 2024"
            />
          </CardGrid>
          <Text variant="meta" mt={24}>
            Illustrative reader quotes written for this prototype.
          </Text>
        </Container>
      </Section>

      {/* FAQ */}
      <Section aria-labelledby="faq-title">
        <Container narrow>
          <SecHead index={6} id="faq-title" locale={locale} title="Questions" />
          <Accordion items={FAQ} />
        </Container>
      </Section>

    </>
  );
}
