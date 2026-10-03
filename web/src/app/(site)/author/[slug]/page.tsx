import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleCard } from "@/components/patterns/article-card";
import { FollowButton } from "@/components/patterns/actions";
import { CollectionTile, Stat, StatStrip } from "@/components/patterns/blocks";
import { EditorialBreak } from "@/components/patterns/editorial-break";
import { EmptyState, Panel } from "@/components/patterns/feedback";
import { Frame, PortraitSlot } from "@/components/patterns/frame";
import { Breadcrumbs } from "@/components/patterns/navigation";
import { SecHead } from "@/components/patterns/sec-head";
import { Button, ButtonLink, CardGrid, CardList, Cluster, Col, Container, Grid, Heading, Section, Tag, Text } from "@/components/primitives";
import { routes } from "@/config/routes";
import { getDictionary, getLocale } from "@/i18n";
import { formatCompact, formatNumber } from "@/lib/format";
import { articlesByAuthor, getAuthor, listAuthors, listAuthorSlugs, mostRead, topicName } from "@/services/content";

/* Writer — blog-refrence/author.html */

export async function generateStaticParams() {
  return (await listAuthorSlugs()).map((slug) => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/author/[slug]">): Promise<Metadata> {
  const au = getAuthor((await params).slug);
  return { title: au.name, description: au.bio };
}

export default async function AuthorPage({ params }: PageProps<"/author/[slug]">) {
  const { slug } = await params;
  if (!(await listAuthorSlugs()).includes(slug)) notFound();
  const locale = await getLocale();
  const t = await getDictionary(locale);
  const au = getAuthor(slug);
  const pool = await articlesByAuthor(slug);
  const popular = await mostRead(4, pool);
  const others = (await listAuthors()).filter((o) => o.slug !== slug).slice(0, 4);

  const reads = pool.reduce((s, a) => s + a.views, 0);
  const minutes = pool.reduce((s, a) => s + a.mins, 0);
  const tags = [...new Set(pool.flatMap((a) => a.tags))];
  const [featured] = pool;

  return (
    <>
      <Container>
        <Breadcrumbs
          label={t.a11y.breadcrumb}
          items={[{ label: t.nav.home, href: routes.home() }, { label: "Writers", href: routes.home() }, { label: au.name }]}
        />
      </Container>

      {/* HEAD */}
      <Section as="header" tight>
        <Container>
          <Grid rowGap={32}>
          <Col span={4}>
            {/* A commissioned portrait where one exists, otherwise the typographic
                monogram — never a stand-in photo of someone who is not the writer. */}
            {au.portrait ? (
              <Frame
                src={au.portrait}
                alt={`${au.name}, photographed for NOVA.`}
                ratio="auto"
                width={900}
                height={1200}
                eager
                sizes="(max-width: 768px) 100vw, 33vw"
                caption="Commissioned portrait, 2025."
                credit="Photograph for NOVA"
              />
            ) : (
              <PortraitSlot
                initials={au.initials}
                name={au.name}
                caption="No commissioned portrait on file — NOVA sets a typographic monogram rather than a stand-in photograph."
              />
            )}
          </Col>

          <Col span={8}>
            <Text variant="eyebrow" tone="accent" mb={16}>
              NOVA Writer
            </Text>
            <Heading level={1} size="display">
              {au.name}
            </Heading>
            <Text variant="intro" mt={16}>
              {au.role}
            </Text>
            <Text variant="small" measure="long" mt={24}>
              {au.bio}
            </Text>
            <Cluster gap={12} mt={32}>
              <FollowButton name={au.name} />
              <ButtonLink href={routes.newsletter()} variant="secondary">Get their stories by email</ButtonLink>
              <Button asChild variant="ghost">
                <a href="#archive">Jump to archive</a>
              </Button>
            </Cluster>
            <Cluster gap={8} mt={24}>
              {["Mastodon", "Bluesky", "Signal", "RSS"].map((s) => (
                <Tag key={s} href={routes.about()}>
                  {s}
                </Tag>
              ))}
            </Cluster>
          </Col>
        </Grid>

        <StatStrip className="mt-16">
          <Stat value={formatNumber(pool.length, locale)} label="Stories for NOVA" />
          <Stat value={formatCompact(reads, locale)} label="Total reads" />
          <Stat value={formatNumber(minutes, locale)} label="Minutes published" />
          <Stat value={String(au.since)} label="Writing here since" />
          </StatStrip>
        </Container>
      </Section>

      {/* EXPERTISE */}
      <Section tight aria-labelledby="expertise-title">
        <Container>
          <SecHead index={1} id="expertise-title" locale={locale} weight="major" title="Covers" />
          <Cluster gap={8}>
            {tags.length ? (
              tags.map((tag) => (
                <Tag key={tag} href={routes.topic(tag)}>
                  {topicName(tag)}
                </Tag>
              ))
            ) : (
              <Text as="span" variant="meta">
                No topics yet.
              </Text>
            )}
          </Cluster>
        </Container>
      </Section>

      {/* LATEST + POPULAR */}
      <Section aria-labelledby="author-latest">
        <Grid container rowGap={64}>
          <Col span={8}>
            <SecHead index={2} id="author-latest" locale={locale} title="Latest work" />
            {featured && (
              <div className="mb-12">
                <ArticleCard article={featured} variant="featured" locale={locale} />
              </div>
            )}
            <CardList gap={32}>
              {pool.slice(1, 4).map((a) => (
                <ArticleCard key={a.slug} article={a} variant="horizontal" locale={locale} />
              ))}
            </CardList>
          </Col>
          <Col span={4} as="aside" className="grid content-start gap-16">
            <div>
              <SecHead index={3} locale={locale} title="Most read" />
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
            <Panel variant="sunk">
              <Text variant="eyebrow" tone="accent">
                Tip this desk
              </Text>
              {/* the reference writes mt-12 here, a class it never defines: no top margin */}
              <Heading level={3} size="h4" mb={12}>
                Something we should look at?
              </Heading>
              <Text variant="meta">
                Encrypted drop and postal address are on the newsroom contact page. Do not send confidential material
                from a work device.
              </Text>
              <ButtonLink href={routes.about()} variant="secondary" size="sm" className="mt-4">
                Contact the newsroom
              </ButtonLink>
            </Panel>
          </Col>
        </Grid>
      </Section>

      <EditorialBreak
        id="author-brk"
        kicker="On the beat"
        quote={
          <>
            The interesting story is almost never the launch. It is the <em>procurement document</em> three years
            earlier, and whoever was in the room when it was signed.
          </>
        }
        cite={
          <>
            <b>{au.name}</b> · <Link href={routes.newsletter()}>Follow this writer by email</Link>
          </>
        }
      />

      {/* ARCHIVE */}
      <Section id="archive" aria-labelledby="archive-title">
        <Container>
          <SecHead
            index={4}
            id="archive-title"
            locale={locale}
            title="Full archive"
            link={pool.length ? { label: t.card.stories(formatNumber(pool.length, locale)) } : undefined}
          />
          {pool.length ? (
            <CardList>
              {pool.map((a) => (
                <ArticleCard key={a.slug} article={a} variant="minimal" locale={locale} />
              ))}
            </CardList>
          ) : (
            <EmptyState
              title="No published stories yet"
              actions={
                <ButtonLink href={routes.category("latest")}>Read the rest of NOVA</ButtonLink>
              }
            >
              This writer has joined NOVA but has not filed yet. Follow them and their first piece will arrive in your
              reading list.
            </EmptyState>
          )}
        </Container>
      </Section>

      {/* OTHER WRITERS */}
      <Section aria-labelledby="writers-title">
        <Container>
          <SecHead index={5} id="writers-title" locale={locale} title="Other NOVA writers" />
          <CardGrid cols={4} gap={24}>
            {others.map((o) => (
              <CollectionTile
                key={o.slug}
                href={routes.author(o.slug)}
                initials={o.initials}
                title={o.name}
                lines={[{ text: o.role }, { text: t.card.stories(formatNumber(o.count, locale)), nowrap: true }]}
              />
            ))}
          </CardGrid>
        </Container>
      </Section>
    </>
  );
}
