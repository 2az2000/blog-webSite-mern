import "server-only";

import { routes } from "@/config/routes";
import { toSearchData, type ApiSearchBody, type SearchData, type SearchSort } from "@/lib/search";
import { ApiUnavailableError, apiGet, apiGetAll, apiGetRaw } from "@/lib/server-api";
import type {
  Article,
  ArticleDetail,
  ArticleView,
  Author,
  LongformDetail,
  ResolvedBlock,
  Section,
  Topic,
} from "@/types/content";

/*
 * Content data-access layer. The ONLY module that knows where content comes
 * from: the NOVA API (backend/, `/api/v1`). Pages and components import these
 * functions and never see a raw payload; the shapes they get are the ones in
 * `types/content.ts`.
 *
 * Reads are cached for a minute and tagged for the back office's
 * revalidation webhook (see lib/server-api.ts).
 */

/* — API payloads ----------------------------------------------------------- */

/** An article summary as the API sends it: the `Article` fields plus its resolved author and section. */
type ApiSummary = Article & { authorRef: Author; sectionRef: Section };

type ApiResolvedBlock =
  | Exclude<ResolvedBlock, { type: "recirc" }>
  | { type: "recirc"; label: string; articles: ApiSummary[] };

type ApiArticlePage = {
  kind: Article["kind"];
  article: ApiSummary;
  detail: Record<string, unknown>;
  body: ApiResolvedBlock[];
  tags: { slug: string; name: string }[];
  related: ApiSummary[];
  moreByAuthor: ApiSummary[];
  chapters?: { id: string; title: string }[];
};

const ARTICLES = ["articles"];

function toView(a: ApiSummary): ArticleView {
  return { ...a, href: a.kind === "longread" ? routes.longform(a.slug) : routes.article(a.slug) };
}

const views = (list: ApiSummary[]): ArticleView[] => list.map(toView);

/** A list that feeds `generateStaticParams`: when the API is unreachable at build time, render on demand instead of failing. */
async function slugsOrNone(load: () => Promise<string[]>): Promise<string[]> {
  try {
    return await load();
  } catch (err) {
    if (err instanceof ApiUnavailableError) return [];
    throw err;
  }
}

/* — Lookups ---------------------------------------------------------------- */

export async function getAuthor(slug: string): Promise<(Author & { count: number }) | null> {
  const res = await apiGet<Author & { count: number }>(`/authors/${encodeURIComponent(slug)}`, [`author:${slug}`]);
  return res?.data ?? null;
}

export type SectionWithCount = Section & { count: number };

/** Every desk, in navigation order, with how many published stories it holds (`latest`: all of them). */
export async function listSections(): Promise<SectionWithCount[]> {
  return (await apiGet<SectionWithCount[]>("/sections", ["sections", ...ARTICLES]))?.data ?? [];
}

export async function getSection(slug: string): Promise<Section | null> {
  const res = await apiGet<Section>(`/sections/${encodeURIComponent(slug)}`, [`section:${slug}`, "sections"]);
  return res?.data ?? null;
}

/** Topic display names by slug, for tag rows. A tag without a topic page falls back to its de-slugged key. */
export async function topicNames(): Promise<Record<string, string>> {
  const topics = await listTopics();
  return Object.fromEntries(topics.map((t) => [t.slug, t.name]));
}

export function topicName(slug: string, names: Record<string, string>): string {
  return names[slug] ?? slug.replace(/-/g, " ");
}

/* — Articles --------------------------------------------------------------- */

/** All published articles, newest first. */
export async function listArticles(): Promise<ArticleView[]> {
  return views(await apiGetAll<ApiSummary>("/articles", ARTICLES));
}

export async function getArticle(slug: string): Promise<ArticleView | null> {
  const res = await apiGet<ApiArticlePage>(`/articles/${encodeURIComponent(slug)}`, [`article:${slug}`]);
  return res ? toView(res.data.article) : null;
}

/** Resolve a fixed list of slugs, in order, skipping any that do not exist. */
export async function getArticles(slugs: string[]): Promise<ArticleView[]> {
  if (slugs.length === 0) return [];
  const all = new Map((await listArticles()).map((a) => [a.slug, a]));
  return slugs.flatMap((s) => all.get(s) ?? []);
}

/** The most-read stories: finished reads of the last week, then total views. Within `pool`, by views. */
export async function mostRead(limit: number, pool?: ArticleView[]): Promise<ArticleView[]> {
  if (pool) return [...pool].sort((a, b) => b.views - a.views).slice(0, limit);
  const res = await apiGet<ApiSummary[]>(`/trending?limit=${limit}`, ARTICLES);
  return views(res?.data ?? []);
}

export async function mostDiscussed(limit: number): Promise<ArticleView[]> {
  const res = await apiGet<ApiSummary[]>(`/most-discussed?limit=${limit}`, ARTICLES);
  return views(res?.data ?? []);
}

export async function articlesInSection(section: string): Promise<ArticleView[]> {
  return views(await apiGetAll<ApiSummary>(`/articles?section=${encodeURIComponent(section)}`, [`section:${section}`, ...ARTICLES]));
}

export async function articlesByAuthor(author: string): Promise<ArticleView[]> {
  return views(await apiGetAll<ApiSummary>(`/articles?author=${encodeURIComponent(author)}`, [`author:${author}`, ...ARTICLES]));
}

export async function articlesWithTopic(topic: string): Promise<ArticleView[]> {
  return views(await apiGetAll<ApiSummary>(`/articles?topic=${encodeURIComponent(topic)}`, [`topic:${topic}`, ...ARTICLES]));
}

/** Front-page "Latest": newest first, minus what is already placed and minus long reads. */
export async function latestExcluding(placed: string[]): Promise<ArticleView[]> {
  const exclude = placed.length ? `&exclude=${placed.map(encodeURIComponent).join(",")}` : "";
  return views(await apiGetAll<ApiSummary>(`/articles?kind=article,opinion,video,interview${exclude}`, ARTICLES));
}

/* — Front page placement ------------------------------------------------- */

export type HomePlacement = {
  lead: ArticleView | null;
  secondary: ArticleView[];
  brief: ArticleView[];
  picks: ArticleView[];
  opinion: ArticleView[];
  longread: ArticleView | null;
};

/**
 * Which stories sit where on the front page: pinned by the editors in the back
 * office, the rest filled in by the API with the newest suitable stories.
 */
export async function getHomePlacement(): Promise<HomePlacement> {
  const res = await apiGet<Record<keyof HomePlacement, ApiSummary[]>>("/placements/home", ["placement:home", ...ARTICLES]);
  const slots = res?.data;
  return {
    lead: slots?.lead[0] ? toView(slots.lead[0]) : null,
    secondary: views(slots?.secondary ?? []),
    brief: views(slots?.brief ?? []),
    picks: views(slots?.picks ?? []),
    opinion: views(slots?.opinion ?? []),
    longread: slots?.longread[0] ? toView(slots.longread[0]) : null,
  };
}

/* — The Dispatch ---------------------------------------------------------- */

export type LatestIssue = {
  subject: string;
  note: string;
  kind: "tuesday" | "friday" | "monthly";
  sentAt: string | null;
  articles: ArticleView[];
};

/** The most recent issue of the Dispatch that went out (null before the first). */
export async function getLatestIssue(): Promise<LatestIssue | null> {
  const res = await apiGet<(Omit<LatestIssue, "articles"> & { articles: ApiSummary[] }) | null>("/newsletter/issues/latest", ["newsletter", ...ARTICLES]);
  return res?.data ? { ...res.data, articles: views(res.data.articles) } : null;
}

/* — Article page ----------------------------------------------------------- */

function resolved(body: ApiResolvedBlock[]): ResolvedBlock[] {
  return body.map((b) => (b.type === "recirc" ? { type: "recirc", label: b.label, articles: views(b.articles) } : b));
}

export type ArticlePageData = {
  article: ArticleView;
  detail: Omit<ArticleDetail, "body">;
  body: ResolvedBlock[];
  tags: { slug: string; name: string }[];
  related: ArticleView[];
  moreByAuthor: ArticleView[];
};

export async function getArticlePage(slug: string): Promise<ArticlePageData | null> {
  const res = await apiGet<ApiArticlePage>(`/articles/${encodeURIComponent(slug)}`, [`article:${slug}`]);
  if (!res || res.data.kind === "longread") return null;
  const p = res.data;
  return {
    article: toView(p.article),
    detail: p.detail as Omit<ArticleDetail, "body">,
    body: resolved(p.body),
    tags: p.tags,
    related: views(p.related),
    moreByAuthor: views(p.moreByAuthor),
  };
}

export async function listArticleSlugs(): Promise<string[]> {
  return slugsOrNone(async () => (await listArticles()).filter((a) => a.kind !== "longread").map((a) => a.slug));
}

/* — Long-form page ---------------------------------------------------------- */

export type LongformPageData = {
  article: ArticleView;
  detail: Omit<LongformDetail, "body" | "related">;
  body: ResolvedBlock[];
  chapters: { id: string; title: string }[];
  related: ArticleView[];
};

export async function getLongformPage(slug: string): Promise<LongformPageData | null> {
  const res = await apiGet<ApiArticlePage>(`/articles/${encodeURIComponent(slug)}`, [`article:${slug}`]);
  if (!res || res.data.kind !== "longread") return null;
  const p = res.data;
  return {
    article: toView(p.article),
    detail: p.detail as Omit<LongformDetail, "body" | "related">,
    body: resolved(p.body),
    chapters: p.chapters ?? [],
    related: views(p.related),
  };
}

export async function listLongformSlugs(): Promise<string[]> {
  return slugsOrNone(async () => (await listArticles()).filter((a) => a.kind === "longread").map((a) => a.slug));
}

/* — Sections, topics, authors --------------------------------------------- */

export async function listSectionSlugs(): Promise<string[]> {
  return slugsOrNone(async () => ((await apiGet<Section[]>("/sections", ["sections"]))?.data ?? []).map((s) => s.slug));
}

export async function getTopic(slug: string): Promise<(Topic & { count: number; followers: number }) | null> {
  const res = await apiGet<Topic & { count: number; followers: number }>(`/topics/${encodeURIComponent(slug)}`, [`topic:${slug}`]);
  return res?.data ?? null;
}

export async function listTopics(): Promise<(Topic & { count: number })[]> {
  return (await apiGet<(Topic & { count: number })[]>("/topics", ["topics"]))?.data ?? [];
}

export async function listAuthors(): Promise<(Author & { count: number })[]> {
  return (await apiGet<(Author & { count: number })[]>("/authors", ["authors"]))?.data ?? [];
}

export async function listAuthorSlugs(): Promise<string[]> {
  return slugsOrNone(async () => (await listAuthors()).map((a) => a.slug));
}

/** Results of a search, ranked by the API (text index, stems, prefixes, writer names). */
export async function searchContent(q: string, sort: SearchSort = "relevance"): Promise<SearchData> {
  const res = await apiGetRaw<ApiSearchBody>(`/search?q=${encodeURIComponent(q)}&sort=${sort}`, ["articles"]);
  return toSearchData(res);
}
