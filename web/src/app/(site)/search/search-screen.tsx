"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { ArticleCard } from "@/components/patterns/article-card";
import { CollectionTile } from "@/components/patterns/blocks";
import { EmptyState, Skeleton, SkeletonStack } from "@/components/patterns/feedback";
import { SecHead, secHeadLink } from "@/components/patterns/sec-head";
import { SortMenu } from "@/components/patterns/sort-menu";
import { notify } from "@/components/ui/sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button, ButtonLink, CardGrid, CardList, Cluster, Col, Container, flex, Grid, IconSearch, refLink, Section, Tag, Text } from "@/components/primitives";
import { routes } from "@/config/routes";
import { useI18n } from "@/i18n/i18n-provider";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SearchIndex } from "@/services/content";
import type { ArticleView } from "@/types/content";

/* The search screen — behaviour ported from the search.html inline script. */

const SUGGESTED = ["artificial intelligence", "grid", "design systems", "open source", "memory", "batteries", "founders"];
const RECENT_KEY = "nova:recent-searches";
const PROMPT = "Type a word, or start from a suggestion below.";

type Kind = "articles" | "authors" | "topics";
type Sort = "relevance" | "newest" | "popular";

/* Recent searches live in localStorage (this device only), read as an external store. */
const RECENT_EVENT = "nova:recent-searches";
function readRecentRaw(): string {
  try {
    return localStorage.getItem(RECENT_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}
function writeRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 6)));
  } catch {
    // storage unavailable: recent searches simply are not remembered
  }
  window.dispatchEvent(new Event(RECENT_EVENT));
}
function subscribeRecent(onChange: () => void) {
  window.addEventListener(RECENT_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(RECENT_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
function useRecentSearches(): string[] {
  const raw = useSyncExternalStore(subscribeRecent, readRecentRaw, () => "[]");
  return useMemo(() => {
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  }, [raw]);
}
function remember(q: string) {
  let list: string[] = [];
  try {
    list = JSON.parse(readRecentRaw());
  } catch {
    // corrupted entry: start a fresh list
  }
  writeRecent([q, ...list.filter((r) => r !== q)]);
}

const matches = (a: ArticleView, q: string) => {
  const hay = `${a.title} ${a.standfirst} ${a.tags.join(" ")} ${a.authorRef.name} ${a.sectionRef.name}`.toLowerCase();
  return q.split(/\s+/).every((w) => hay.includes(w));
};
const score = (a: ArticleView, q: string) =>
  (a.title.toLowerCase().includes(q) ? 100 : 0) +
  (a.tags.join(" ").includes(q.replace(/\s+/g, "-")) ? 50 : 0) +
  a.views / 10000;

export function SearchScreen({ index, initialQuery }: { index: SearchIndex; initialQuery: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const initial = initialQuery.trim();
  const [value, setValue] = useState(initialQuery);
  const [term, setTerm] = useState(initial);
  // A search shows its skeleton for 450ms (reference timing) before results.
  const [loading, setLoading] = useState(Boolean(initial));
  const [kind, setKind] = useState<Kind>("articles");
  const [sort, setSort] = useState<Sort>("relevance");
  const recent = useRecentSearches();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const settle = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setLoading(false), 450);
  };

  const run = (raw: string) => {
    const q = raw.trim();
    setTerm(q);
    router.replace(q ? routes.search(q) : routes.search(), { scroll: false });
    if (!q) return;
    remember(q);
    setLoading(true);
    settle();
  };

  // Arriving with ?q= runs that search; arriving empty focuses the field.
  useEffect(() => {
    if (initial) {
      remember(initial);
      settle();
    } else {
      input.current?.focus();
    }
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);

  const q = term.toLowerCase();
  const articles = index.articles.filter((a) => matches(a, q));
  if (sort === "newest") articles.sort((a, b) => b.date.localeCompare(a.date));
  else if (sort === "popular") articles.sort((a, b) => b.views - a.views);
  else articles.sort((a, b) => score(b, q) - score(a, q));
  const authors = index.authors.filter((o) => `${o.name} ${o.role}`.toLowerCase().includes(q));
  const topics = index.topics.filter((o) => `${o.slug} ${o.name} ${o.blurb}`.toLowerCase().includes(q));
  const counts = { articles: articles.length, authors: authors.length, topics: topics.length };

  const status = !term
    ? PROMPT
    : loading
      ? `Searching for “${term}”…`
      : counts[kind]
        ? `${counts[kind]} ${kind} for “${term}”`
        : `No ${kind} matched “${term}”.`;

  const chip = (s: string) => (
    <Tag
      key={s}
      onClick={() => {
        setValue(s);
        run(s);
      }}
    >
      {s}
    </Tag>
  );

  return (
    <>
      <Container as="section" className="pt-12 pb-8" aria-labelledby="search-title">
        <h1 className="sr-only" id="search-title">
          {t.a11y.searchLabel}
        </h1>
        {/* .search-big: a ruled, serif-set field; the glyph and the button flank it */}
        <form
          className="grid grid-cols-sandwich items-center gap-4 border-b-2 border-fg py-3 max-sm:grid-cols-lead"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            run(value);
          }}
        >
          <IconSearch className="size-7 text-meta" />
          <label className="sr-only" htmlFor="search-input">
            Search stories, authors and topics
          </label>
          <input
            ref={input}
            id="search-input"
            name="q"
            type="search"
            placeholder={t.header.searchPlaceholder}
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={cn(
              "w-full border-0 bg-transparent py-2 font-serif text-h2 leading-120 text-fg fa:leading-160",
              "placeholder:text-muted-soft focus:outline-none max-sm:text-glyph",
            )}
          />
          <Button type="submit" className={flex.fixed}>
            {t.header.searchSubmit}
          </Button>
        </form>
        <Cluster gap={16} mt={16} wrap={false}>
          <Text variant="meta" className={flex.fixed} role="status" aria-live="polite">
            {status}
          </Text>
          {/* The reference sets [hidden] on this button, but .btn's display wins, so it always shows. */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setValue("");
              run("");
              input.current?.focus();
            }}
          >
            Clear search
          </Button>
        </Cluster>
      </Container>

      {!term ? (
        <Section tight aria-labelledby="suggest-title">
          <Grid container rowGap={48}>
            <Col span={6}>
              <SecHead index={1} id="suggest-title" locale={locale} weight="major" title="Try one of these" />
              <Cluster gap={8}>{SUGGESTED.map(chip)}</Cluster>
            </Col>
            <Col span={6}>
              <SecHead
                index={2}
                locale={locale}
                title="Recent searches"
                action={
                  <button
                    className={secHeadLink}
                    type="button"
                    onClick={() => {
                      writeRecent([]);
                      notify("Recent searches cleared", "success", { dismissLabel: t.a11y.dismiss });
                    }}
                  >
                    Clear
                  </button>
                }
              />
              <Cluster gap={8}>
                {recent.length ? (
                  recent.map(chip)
                ) : (
                  <Text as="span" variant="meta">
                    No recent searches on this device yet.
                  </Text>
                )}
              </Cluster>
            </Col>
          </Grid>
        </Section>
      ) : (
        <Section aria-labelledby="results-title">
          <Container>
            <Cluster gap={24} justify="between" wrap={false} mb={24}>
              <Tabs className={flex.fill} value={kind} onValueChange={(v) => setKind(v as Kind)}>
                <TabsList aria-label="Result type">
                  <TabsTrigger value="articles">Articles ({formatNumber(counts.articles, locale)})</TabsTrigger>
                  <TabsTrigger value="authors">Authors ({formatNumber(counts.authors, locale)})</TabsTrigger>
                  <TabsTrigger value="topics">Topics ({formatNumber(counts.topics, locale)})</TabsTrigger>
                </TabsList>
              </Tabs>
              <SortMenu
                className={flex.fixed}
                variant="secondary"
                label="Sort"
                menuLabel="Sort results"
                value={sort}
                onChange={setSort}
                options={[
                  { key: "relevance", label: "Relevance" },
                  { key: "newest", label: "Newest" },
                  { key: "popular", label: "Most popular" },
                ]}
              />
            </Cluster>

            <h2 className="sr-only" id="results-title">
              Search results
            </h2>

            {loading ? (
              // Shaped like the result rows it replaces.
              <CardList gap={32} aria-hidden="true">
                {[0, 1].map((i) => (
                  <div key={i} className="grid grid-cols-split items-start gap-6 max-md:grid-cols-1">
                    <Skeleton shape="media" />
                    <SkeletonStack>
                      <Skeleton shape="title" />
                      <Skeleton />
                      <Skeleton length="mid" />
                      <Skeleton length="short" />
                    </SkeletonStack>
                  </div>
                ))}
              </CardList>
            ) : !counts[kind] ? (
              <EmptyState
                mark="?"
                title={`Nothing matched “${term}”`}
                footer={
                  <>
                    Or try:{" "}
                    {SUGGESTED.slice(0, 3).map((s, i) => (
                      <span key={s}>
                        {i > 0 && ", "}
                        <Link
                          href={routes.search(s)}
                          className={refLink.link}
                          onClick={() => {
                            setValue(s);
                            run(s);
                          }}
                        >
                          {s}
                        </Link>
                      </span>
                    ))}
                  </>
                }
                actions={
                  <>
                    <ButtonLink href={routes.category("latest")}>Browse the latest</ButtonLink>
                    <ButtonLink href={routes.trending()} variant="secondary">See what’s trending</ButtonLink>
                  </>
                }
              >
                Search covers headlines, standfirsts, authors and tags. Try a broader word, check the spelling, or start
                from a section instead.
              </EmptyState>
            ) : kind === "articles" ? (
              <CardList gap={32}>
                {articles.map((a) => (
                  <ArticleCard key={a.slug} article={a} variant="horizontal" locale={locale} headingLevel={3} />
                ))}
              </CardList>
            ) : kind === "authors" ? (
              <CardGrid cols={3} gap={24}>
                {authors.map((o) => (
                  <CollectionTile
                    key={o.slug}
                    href={routes.author(o.slug)}
                    initials={o.initials}
                    title={o.name}
                    lines={[{ text: o.role }, { text: t.card.stories(formatNumber(o.count, locale)), nowrap: true }]}
                  />
                ))}
              </CardGrid>
            ) : (
              <CardGrid cols={2} gap={24}>
                {topics.map((o) => (
                  <CollectionTile
                    key={o.slug}
                    href={routes.topic(o.slug)}
                    eyebrow="Topic"
                    title={o.name}
                    size="h3"
                    lines={[
                      { text: o.blurb, clamp: true },
                      { text: t.card.stories(formatNumber(o.count, locale)), nowrap: true },
                    ]}
                  />
                ))}
              </CardGrid>
            )}

          </Container>
        </Section>
      )}
    </>
  );
}
