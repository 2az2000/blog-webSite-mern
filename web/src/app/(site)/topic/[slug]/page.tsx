import type { Metadata } from "next";

import { ArticleCard } from "@/components/patterns/article-card";
import { FollowButton } from "@/components/patterns/actions";
import { CategoryHero } from "@/components/patterns/blocks";
import { EmptyState } from "@/components/patterns/feedback";
import { Breadcrumbs } from "@/components/patterns/navigation";
import { SecHead } from "@/components/patterns/sec-head";
import { ButtonLink, CardList, Cluster, Col, Container, Grid, Heading, Section, Tag, Text } from "@/components/primitives";
import { routes } from "@/config/routes";
import { getDictionary, getLocale } from "@/i18n";
import { formatNumber } from "@/lib/format";
import { articlesWithTopic, getTopic, listTopics, mostRead, topicName } from "@/services/content";

/*
 * Topic — blog-refrence/topic.html.
 * Any tag is a topic: unknown slugs render with their de-slugged name, as in
 * the reference, so every "Filed under" link resolves.
 */

export async function generateStaticParams() {
  return (await listTopics()).map((t) => ({ slug: t.slug }));
}

async function load(slug: string) {
  const topic = (await getTopic(slug)) ?? { slug, name: topicName(slug), blurb: "", related: [] };
  return { topic, pool: await articlesWithTopic(slug) };
}

export async function generateMetadata({ params }: PageProps<"/topic/[slug]">): Promise<Metadata> {
  const { topic } = await load((await params).slug);
  return { title: `${topic.name} — NOVA topics`, description: topic.blurb || undefined };
}

export default async function TopicPage({ params }: PageProps<"/topic/[slug]">) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getDictionary(locale);
  const { topic, pool } = await load(slug);
  const [featured, ...rest] = pool;
  const popular = await mostRead(4, pool);
  const all = await listTopics();
  const related = [...new Set([...topic.related, ...all.map((x) => x.slug).filter((k) => k !== slug)])].slice(0, 8);
  const count = t.card.stories(formatNumber(pool.length, locale));

  return (
    <>
      <CategoryHero image="/images/category-technology.jpg">
        <Breadcrumbs
          tone="photo"
          label={t.a11y.breadcrumb}
          items={[
            { label: t.nav.home, href: routes.home() },
            { label: "Topics", href: routes.topic("artificial-intelligence") },
            { label: topic.name },
          ]}
        />
        <Text variant="eyebrow" mt={24} mb={16} className="text-photo-brand">
          Continuing coverage
        </Text>
        <Heading level={1} size="display" measure="short">
          {topic.name}
        </Heading>
        <Text variant="intro" mt={24} className="text-paper/85">
          {topic.blurb}
        </Text>
        <Cluster gap={12} mt={32}>
          <FollowButton name={topic.name} label={t.follow.followTopic} variant="accent" />
          <ButtonLink href={routes.newsletter()} variant="secondary" tone="photo">
            Get it by email
          </ButtonLink>
          <Text as="span" variant="meta" className="whitespace-nowrap text-paper/70">
            {count}
          </Text>
        </Cluster>
      </CategoryHero>

      {featured && (
        <Section aria-labelledby="tfeat-title">
          <Container>
            <SecHead index={1} id="tfeat-title" locale={locale} weight="major" title="The story to start with" />
            <ArticleCard article={featured} variant="featured" locale={locale} />
          </Container>
        </Section>
      )}

      <Section aria-labelledby="tlatest-title">
        <Grid  container rowGap={64}>
          <Col span={8}>
            <SecHead
              index={2}
              id="tlatest-title"
              locale={locale}
              title="Latest on this topic"
              link={featured ? { label: count } : undefined}
            />
            {!featured ? (
              <EmptyState
                title="No stories tagged yet"
                actions={
                  <ButtonLink href={routes.newsletter()}>Follow this topic</ButtonLink>
                }
              >
                We open a topic page as soon as the second story lands. Follow it now and the first dispatch will reach
                you before the page fills up.
              </EmptyState>
            ) : rest.length ? (
              <CardList  gap={32}>
                {rest.map((a) => (
                  <ArticleCard key={a.slug} article={a} variant="horizontal" locale={locale} />
                ))}
              </CardList>
            ) : (
              <Text variant="meta">This is the only story on the topic so far.</Text>
            )}
          </Col>

          <Col span={4} as="aside" className="grid content-start gap-16">
            <div>
              <SecHead index={3} locale={locale} title="Most read on this topic" />
              {popular.length ? (
                <CardList>
                  {popular.map((a, i) => (
                    <ArticleCard key={a.slug} article={a} variant="numbered" rank={i + 1} locale={locale} />
                  ))}
                </CardList>
              ) : (
                <Text variant="meta">Nothing yet.</Text>
              )}
            </div>
            <div>
              <SecHead index={4} locale={locale} title="Related topics" />
              <Cluster gap={8}>
                {related.map((r) => (
                  <Tag key={r} href={routes.topic(r)}>
                    {topicName(r)}
                  </Tag>
                ))}
              </Cluster>
            </div>
          </Col>
        </Grid>
      </Section>
    </>
  );
}
