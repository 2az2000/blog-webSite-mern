/**
 * Search over published stories, authors and topics.
 *
 * Stories use a MongoDB text index (title ≫ tags > standfirst, English
 * stemming: "batteries" finds "battery") and also match a writer by name. A text
 * index only matches whole words, so when it finds nothing the query is retried
 * as word prefixes ("arti" → "artificial") — the way people type into a search
 * box. Authors and topics are few, so they are matched directly.
 *
 * This is the "start" the roadmap calls for; Atlas Search (fuzzy, suggestions)
 * is the step after, behind this same interface.
 */
import type { QueryFilter } from "mongoose";
import { ArticleModel, type ArticleShape } from "../../models/article.model.js";
import { SearchTermModel } from "../../models/search-term.model.js";
import { listAuthors, listTopics, summarize, type ArticleSummary } from "../content/content.service.js";
import type { SearchQuery } from "./search.schemas.js";

const MAX_WORDS = 8;
const MAX_TERM = 100;
const SIDE_RESULTS = 20;

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Lower-case, single-spaced words; a leading `-` (a MongoDB "exclude") is dropped so a reader cannot negate. */
export function normalizeQuery(raw: string): { term: string; words: string[] } {
  const words = raw
    .toLowerCase()
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F"]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^-+/, ""))
    .filter(Boolean)
    .slice(0, MAX_WORDS);
  return { term: words.join(" ").slice(0, MAX_TERM), words };
}

/** The text index, built once. Without it `$text` fails, so the first search after a deploy waits for it. */
let indexReady: Promise<unknown> | undefined;
const ensureIndex = () => (indexReady ??= ArticleModel.init());

type Sort = SearchQuery["sort"];

const sortFor = (sort: Sort, textual: boolean): Record<string, 1 | -1 | { $meta: "textScore" }> => {
  if (sort === "newest") return { publishedAt: -1, _id: -1 };
  if (sort === "popular") return { views: -1, _id: -1 };
  return textual ? { score: { $meta: "textScore" }, views: -1, _id: -1 } : { views: -1, _id: -1 };
};

const matchesAll = (words: string[], haystack: string) => words.every((w) => haystack.toLowerCase().includes(w));

export interface SearchResults {
  term: string;
  articles: ArticleSummary[];
  authors: Awaited<ReturnType<typeof listAuthors>>;
  topics: Awaited<ReturnType<typeof listTopics>>;
  totals: { articles: number; authors: number; topics: number };
  page: number;
  limit: number;
}

export async function search(q: SearchQuery): Promise<SearchResults> {
  const { term, words } = normalizeQuery(q.q);
  const empty: SearchResults = { term, articles: [], authors: [], topics: [], totals: { articles: 0, authors: 0, topics: 0 }, page: q.page, limit: q.limit };
  if (words.length === 0) return empty;
  await ensureIndex();

  const [allAuthors, allTopics] = await Promise.all([listAuthors(), listTopics()]);
  const authors = allAuthors.filter((a) => matchesAll(words, `${a.name} ${a.role} ${a.bio}`)).slice(0, SIDE_RESULTS);
  const topics = allTopics.filter((t) => matchesAll(words, `${t.slug} ${t.name} ${t.blurb}`)).slice(0, SIDE_RESULTS);

  // a writer's name finds that writer's stories too
  const byName = allAuthors.filter((a) => matchesAll(words, a.name)).map((a) => a.slug);
  let filter: QueryFilter<ArticleShape> = {
    status: "published",
    $or: [{ $text: { $search: term } }, ...(byName.length ? [{ author: { $in: byName } }] : [])],
  };
  let textual = true;
  let total = await ArticleModel.countDocuments(filter);

  if (total === 0) {
    // no whole-word match: retry each word as the start of a word
    textual = false;
    filter = {
      status: "published",
      $and: words.map((w) => {
        const rx = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegex(w)}`, "iu");
        return { $or: [{ title: rx }, { standfirst: rx }, { tags: rx }] };
      }),
    };
    total = await ArticleModel.countDocuments(filter);
  }

  const rows = total
    ? await ArticleModel.find(filter, { body: 0, detail: 0, ...(textual ? { score: { $meta: "textScore" } } : {}) })
        .sort(sortFor(q.sort, textual))
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .lean<Parameters<typeof summarize>[0]>()
    : [];

  return {
    term,
    articles: await summarize(rows),
    authors,
    topics,
    totals: { articles: total, authors: authors.length, topics: topics.length },
    page: q.page,
    limit: q.limit,
  };
}

/** Counts a search (first page only: "show more" is not a new search). Never fails the search itself. */
export async function recordSearch(term: string, articles: number): Promise<void> {
  if (!term) return;
  const now = new Date();
  try {
    await SearchTermModel.updateOne(
      { term },
      {
        $inc: { count: 1, zeroCount: articles === 0 ? 1 : 0 },
        $set: { lastResults: articles, lastAt: now },
        $setOnInsert: { firstAt: now },
      },
      { upsert: true },
    );
  } catch {
    // a lost count is not worth a failed search
  }
}

/** Terms people search for that do find something — the "try one of these" chips. */
export async function popularTerms(limit: number): Promise<string[]> {
  const rows = await SearchTermModel.find({ lastResults: { $gt: 0 } }, { term: 1 }).sort({ count: -1, lastAt: -1 }).limit(limit).lean();
  return rows.map((r) => r.term);
}

/** For the editors: what is searched most, and what finds nothing. */
export async function listSearchTerms(q: { kind: "top" | "empty"; page: number; limit: number }) {
  const filter = q.kind === "empty" ? { zeroCount: { $gt: 0 } } : {};
  const sort: Record<string, 1 | -1> = q.kind === "empty" ? { zeroCount: -1, lastAt: -1 } : { count: -1, lastAt: -1 };
  const [items, total] = await Promise.all([
    SearchTermModel.find(filter).sort(sort).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    SearchTermModel.countDocuments(filter),
  ]);
  return {
    items: items.map((t) => ({ term: t.term, count: t.count, zeroCount: t.zeroCount, lastResults: t.lastResults, lastAt: t.lastAt })),
    total,
    page: q.page,
    limit: q.limit,
  };
}
