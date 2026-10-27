"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { ArticleCard } from "@/components/patterns/article-card";
import { CollectionTile } from "@/components/patterns/blocks";
import { EmptyState, Notice, Skeleton, SkeletonStack } from "@/components/patterns/feedback";
import { SecHead, secHeadLink } from "@/components/patterns/sec-head";
import { SortMenu } from "@/components/patterns/sort-menu";
import { notify } from "@/components/ui/sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button, ButtonLink, CardGrid, CardList, Cluster, Col, Container, flex, Grid, IconSearch, refLink, Section, Tag, Text } from "@/components/primitives";
import { routes } from "@/config/routes";
import { useI18n } from "@/i18n/i18n-provider";
import { preferencesAllowed } from "@/lib/consent";
import { formatNumber } from "@/lib/format";
import { search as searchApi } from "@/lib/reader-api";
import type { SearchData, SearchSort } from "@/lib/search";
import { cn } from "@/lib/utils";

/* The search screen — behaviour ported from the search.html inline script. */

const SUGGESTED = ["artificial intelligence", "grid", "design systems", "open source", "memory", "batteries", "founders"];
const RECENT_KEY = "nova:recent-searches";
const PROMPT = "Type a word, or start from a suggestion below.";

type Kind = "articles" | "authors" | "topics";
type Sort = SearchSort;

/* Recent searches live in localStorage (this device only), read as an external store. */
const RECENT_EVENT = "nova:recent-searches";
// without the visitor's consent to preference storage the list lasts for this page view only
let sessionRecent: string | null = null;
function readRecentRaw(): string {
  if (sessionRecent !== null) return sessionRecent;
  try {
    return localStorage.getItem(RECENT_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}
function writeRecent(list: string[]) {
  const value = JSON.stringify(list.slice(0, 6));
  try {
    if (preferencesAllowed()) {
      sessionRecent = null;
      localStorage.setItem(RECENT_KEY, value);
    } else {
      sessionRecent = value;
    }
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

const EMPTY_TOTALS = { articles: 0, authors: 0, topics: 0 };

export function SearchScreen({ initial, initialQuery }: { initial: SearchData | null; initialQuery: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const first = initialQuery.trim();
  const [value, setValue] = useState(initialQuery);
  const [term, setTerm] = useState(first);
  const [data, setData] = useState<SearchData | null>(initial);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [kind, setKind] = useState<Kind>("articles");
  const [sort, setSort] = useState<Sort>("relevance");
  const [suggested, setSuggested] = useState(SUGGESTED);
  const recent = useRecentSearches();
  // the answer to the latest question wins: an older, slower one must not overwrite it
  const latest = useRef(0);

  const fetchPage = async (q: string, by: Sort, page: number) => {
    const ticket = (latest.current += 1);
    setLoading(true);
    setFailed(false);
    try {
      const res = await searchApi.run(q, by, page);
      if (ticket !== latest.current) return;
      setData((cur) => (page > 1 && cur ? { ...res, articles: [...cur.articles, ...res.articles] } : res));
    } catch {
      if (ticket === latest.current) setFailed(true);
    } finally {
      if (ticket === latest.current) setLoading(false);
    }
  };

  const run = (raw: string) => {
    const q = raw.trim();
    setTerm(q);
    router.replace(q ? routes.search(q) : routes.search(), { scroll: false });
    if (!q) {
      latest.current += 1;
      setData(null);
      setLoading(false);
      return;
    }
    remember(q);
    void fetchPage(q, sort, 1);
  };

  // Arriving with ?q= already has its results; arriving empty focuses the field.
  useEffect(() => {
    if (first) remember(first);
    else input.current?.focus();
    // what other readers look for replaces the starter chips once there is enough of it
    searchApi.popular().then(
      (terms) => terms.length >= 3 && setSuggested(terms),
      () => undefined,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);

  const articles = data?.articles ?? [];
  const authors = data?.authors ?? [];
  const topics = data?.topics ?? [];
  const counts = data?.totals ?? EMPTY_TOTALS;

  const status = !term
    ? PROMPT
    : loading && !data
      ? `Searching for “${term}”…`
      : counts[kind]
        ? `${formatNumber(counts[kind], locale)} ${kind} for “${term}”`
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
              <Cluster gap={8}>{suggested.map(chip)}</Cluster>
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
                onChange={(next) => {
                  setSort(next);
                  if (term) void fetchPage(term, next, 1);
                }}
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

            {failed ? (
              <Notice tone="error">Search is unavailable right now. Try again in a moment.</Notice>
            ) : loading && (!data || data.page === 1) ? (
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
                    {suggested.slice(0, 3).map((s, i) => (
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
            ) : null}

            {!failed && !loading && kind === "articles" && articles.length > 0 && articles.length < counts.articles ? (
              <div className="mt-8 flex justify-center">
                <Button variant="secondary" onClick={() => void fetchPage(term, sort, (data?.page ?? 1) + 1)}>
                  Show more results
                </Button>
              </div>
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
