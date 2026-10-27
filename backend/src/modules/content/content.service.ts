/**
 * Read side of the editorial content. Every query here mirrors one the front
 * end's mock service (web/src/services/content.ts) makes, so swapping the
 * mock for this API changes where the data comes from, never what a page shows.
 *
 * Only `published` articles are ever visible. Scheduled publishing and drafts
 * arrive with the admin panel (phase 3).
 */
import type { QueryFilter, Types } from "mongoose";
import { ArticleModel, type ArticleShape } from "../../models/article.model.js";
import { AuthorModel, type AuthorShape } from "../../models/author.model.js";
import { SectionModel, type SectionShape } from "../../models/section.model.js";
import { TopicModel, type TopicShape } from "../../models/topic.model.js";
import { FollowModel } from "../../models/follow.model.js";
import { ReadEventModel } from "../../models/read-event.model.js";
import { badRequest, notFound } from "../../http/errors.js";
import {
  articleDetailSchema,
  longformDetailSchema,
  type BodyBlock,
  type ListArticlesQuery,
  type Sort,
} from "./content.schemas.js";

/* — Public shapes (these are the API's response bodies) ———————————————— */

export type PublicAuthor = AuthorShape;
export type PublicSection = Pick<SectionShape, "slug" | "name" | "blurb">;
export type PublicTopic = Pick<TopicShape, "slug" | "name" | "blurb" | "related">;

export interface ArticleSummary {
  slug: string;
  kind: ArticleShape["kind"];
  section: string;
  title: string;
  standfirst: string;
  author: string;
  /** Calendar day, ISO 8601 (YYYY-MM-DD). */
  date: string;
  mins: number;
  image: string;
  tags: string[];
  views: number;
  comments: number;
  trend: ArticleShape["trend"];
  authorRef: PublicAuthor;
  sectionRef: PublicSection;
}

export type ResolvedBlock =
  | Exclude<BodyBlock, { type: "recirc" }>
  | { type: "recirc"; label: string; articles: ArticleSummary[] };

export interface ArticlePage {
  kind: ArticleShape["kind"];
  article: ArticleSummary;
  /** Page-level copy; for a long read it also names the section its related stories come from. */
  detail: Record<string, unknown>;
  body: ResolvedBlock[];
  tags: { slug: string; name: string }[];
  related: ArticleSummary[];
  moreByAuthor: ArticleSummary[];
  /** Long reads only: the chapter rail. */
  chapters?: { id: string; title: string }[];
}

/** List queries project `body` and `detail` away; only the page query reads them. A published article always has its moment. */
export type LeanArticle = Omit<ArticleShape, "body" | "detail" | "publishedAt"> & { publishedAt: Date } & Partial<Pick<ArticleShape, "body" | "detail">> & { _id: Types.ObjectId };

/** Turns article rows (from any query) into the public summary shape, with authors and desks resolved. */
export async function summarize(rows: LeanArticle[]): Promise<ArticleSummary[]> {
  if (rows.length === 0) return [];
  const d = await directory();
  return rows.map((a) => toSummary(a, d));
}

/* — Lookups ————————————————————————————————————————————— */

const FALLBACK_AUTHOR: PublicAuthor = {
  slug: "staff",
  name: "NOVA Staff",
  initials: "NV",
  role: "Newsroom",
  since: 2023,
  bio: "Biography to follow.",
};

interface Directory {
  authors: Map<string, PublicAuthor>;
  sections: Map<string, PublicSection>;
  topics: Map<string, PublicTopic>;
}

/** Authors, sections and topics are tiny and read on every page: one pass each. */
async function directory(): Promise<Directory> {
  const [authors, sections, topics] = await Promise.all([
    AuthorModel.find().lean(),
    SectionModel.find().sort({ order: 1 }).lean(),
    TopicModel.find().lean(),
  ]);
  return {
    authors: new Map(authors.map((a) => [a.slug, stripAuthor(a)])),
    sections: new Map(sections.map((s) => [s.slug, { slug: s.slug, name: s.name, blurb: s.blurb }])),
    topics: new Map(topics.map((t) => [t.slug, { slug: t.slug, name: t.name, blurb: t.blurb, related: t.related }])),
  };
}

function stripAuthor(a: AuthorShape): PublicAuthor {
  return {
    slug: a.slug,
    name: a.name,
    initials: a.initials,
    role: a.role,
    since: a.since,
    bio: a.bio,
    ...(a.portrait ? { portrait: a.portrait } : {}),
  };
}

/** An unknown section key still renders, named after itself (reference behaviour). */
const sectionOrKey = (d: Directory, slug: string): PublicSection =>
  d.sections.get(slug) ?? { slug, name: slug, blurb: "" };

/** Topic display name, falling back to the de-slugged key (reference behaviour). */
const topicName = (d: Directory, slug: string): string => d.topics.get(slug)?.name ?? slug.replace(/-/g, " ");

function toSummary(a: LeanArticle, d: Directory): ArticleSummary {
  return {
    slug: a.slug,
    kind: a.kind,
    section: a.section,
    title: a.title,
    standfirst: a.standfirst,
    author: a.author,
    date: a.publishedAt.toISOString().slice(0, 10),
    mins: a.mins,
    image: a.image,
    tags: a.tags,
    views: a.views,
    comments: a.commentCount,
    trend: a.trend,
    authorRef: d.authors.get(a.author) ?? FALLBACK_AUTHOR,
    sectionRef: sectionOrKey(d, a.section),
  };
}

const PUBLISHED = { status: "published" } as const;
const NEWEST_FIRST = { publishedAt: -1, _id: -1 } as const;

/* — Sections, topics, authors ————————————————————————————— */

/** Published articles per section; `latest` (every desk) is the total. */
async function sectionCounts(): Promise<Map<string, number>> {
  const rows = await ArticleModel.aggregate<{ _id: string; n: number }>([
    { $match: PUBLISHED },
    { $group: { _id: "$section", n: { $sum: 1 } } },
  ]);
  const counts = new Map(rows.map((r) => [r._id, r.n]));
  counts.set("latest", rows.reduce((sum, r) => sum + r.n, 0));
  return counts;
}

export type PublicSectionWithCount = PublicSection & { count: number };

export async function listSections(): Promise<PublicSectionWithCount[]> {
  const [d, counts] = await Promise.all([directory(), sectionCounts()]);
  return [...d.sections.values()].map((s) => ({ ...s, count: counts.get(s.slug) ?? 0 }));
}

export async function getSection(slug: string): Promise<PublicSectionWithCount> {
  const section = (await listSections()).find((s) => s.slug === slug);
  if (!section) throw notFound("Section not found", "SECTION_NOT_FOUND");
  return section;
}

async function countBy(field: "author" | "tags"): Promise<Map<string, number>> {
  const pipeline =
    field === "tags"
      ? [{ $match: PUBLISHED }, { $unwind: "$tags" }, { $group: { _id: "$tags", n: { $sum: 1 } } }]
      : [{ $match: PUBLISHED }, { $group: { _id: "$author", n: { $sum: 1 } } }];
  const rows = await ArticleModel.aggregate<{ _id: string; n: number }>(pipeline);
  return new Map(rows.map((r) => [r._id, r.n]));
}

export async function listTopics(): Promise<(PublicTopic & { count: number })[]> {
  const [d, counts] = await Promise.all([directory(), countBy("tags")]);
  return [...d.topics.values()].map((t) => ({ ...t, count: counts.get(t.slug) ?? 0 }));
}

export async function getTopic(slug: string): Promise<PublicTopic & { count: number; followers: number }> {
  const topic = (await listTopics()).find((t) => t.slug === slug);
  if (!topic) throw notFound("Topic not found", "TOPIC_NOT_FOUND");
  return { ...topic, followers: await FollowModel.countDocuments({ kind: "topic", slug }) };
}

export async function listAuthors(): Promise<(PublicAuthor & { count: number })[]> {
  const [d, counts] = await Promise.all([directory(), countBy("author")]);
  return [...d.authors.values()].map((a) => ({ ...a, count: counts.get(a.slug) ?? 0 }));
}

export async function getAuthor(slug: string): Promise<PublicAuthor & { count: number; followers: number }> {
  const author = (await listAuthors()).find((a) => a.slug === slug);
  if (!author) throw notFound("Author not found", "AUTHOR_NOT_FOUND");
  return { ...author, followers: await FollowModel.countDocuments({ kind: "author", slug }) };
}

/* — Article lists ————————————————————————————————————————— */

const SORT_FIELD = { latest: "publishedAt", popular: "views", discussed: "commentCount" } as const satisfies Record<Sort, keyof ArticleShape>;

/** Keyset cursor: the sort value and the id of the last row of the previous page. */
function encodeCursor(sort: Sort, a: LeanArticle): string {
  const value = sort === "latest" ? a.publishedAt.toISOString() : a[SORT_FIELD[sort]];
  return Buffer.from(JSON.stringify([value, String(a._id)])).toString("base64url");
}

function decodeCursor(sort: Sort, raw: string): { value: Date | number; id: string } {
  try {
    const [value, id] = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as [unknown, unknown];
    if (typeof id !== "string" || !/^[a-f0-9]{24}$/.test(id)) throw new Error("id");
    if (sort === "latest") {
      const when = new Date(String(value));
      if (Number.isNaN(when.getTime())) throw new Error("date");
      return { value: when, id };
    }
    if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("number");
    return { value, id };
  } catch {
    throw badRequest("The cursor is not valid", "INVALID_CURSOR");
  }
}

export interface ArticleList {
  items: ArticleSummary[];
  /** Pass back as `cursor` for the next page; null on the last page. */
  nextCursor: string | null;
}

export async function listArticles(q: ListArticlesQuery): Promise<ArticleList> {
  const field = SORT_FIELD[q.sort];
  const filter: QueryFilter<ArticleShape> = { ...PUBLISHED };

  if (q.section && q.section !== "latest") filter.section = q.section;
  if (q.author) filter.author = q.author;
  if (q.topic) filter.tags = q.topic;
  if (q.kind?.length) filter.kind = { $in: q.kind };
  if (q.exclude?.length) filter.slug = { $nin: q.exclude };

  if (q.cursor) {
    const c = decodeCursor(q.sort, q.cursor);
    filter.$or = [{ [field]: { $lt: c.value } }, { [field]: c.value, _id: { $lt: c.id } }];
  }

  const rows = await ArticleModel.find(filter, { body: 0, detail: 0 })
    .sort({ [field]: -1, _id: -1 })
    .limit(q.limit + 1)
    .lean<LeanArticle[]>();

  const hasMore = rows.length > q.limit;
  const page = hasMore ? rows.slice(0, q.limit) : rows;
  const d = await directory();
  const last = page.at(-1);

  return {
    items: page.map((a) => toSummary(a, d)),
    nextCursor: hasMore && last ? encodeCursor(q.sort, last) : null,
  };
}

async function topBy(field: "views" | "commentCount", limit: number): Promise<ArticleSummary[]> {
  const [rows, d] = await Promise.all([
    ArticleModel.find(PUBLISHED, { body: 0, detail: 0 })
      .sort({ [field]: -1, _id: -1 })
      .limit(limit)
      .lean<LeanArticle[]>(),
    directory(),
  ]);
  return rows.map((a) => toSummary(a, d));
}

/** Days of completed reads the trending board looks back over. */
const TRENDING_DAYS = 7;

/**
 * Trending is what readers finished this week, not what they merely opened;
 * stories nobody has finished yet are ranked below by total views, so a
 * quiet week still fills the board.
 */
export async function trending(limit: number): Promise<ArticleSummary[]> {
  const since = new Date(Date.now() - TRENDING_DAYS * 86_400_000).toISOString().slice(0, 10);
  const rows = await ReadEventModel.aggregate<{ _id: string }>([
    { $match: { completed: true, day: { $gte: since } } },
    { $group: { _id: "$article", reads: { $sum: 1 } } },
    { $sort: { reads: -1, _id: 1 } },
    { $limit: limit * 3 },
  ]);
  const ranked = (await summariesBySlugs(rows.map((r) => r._id))).slice(0, limit);
  if (ranked.length >= limit) return ranked;
  const taken = new Set(ranked.map((a) => a.slug));
  const fill = (await topBy("views", limit + ranked.length)).filter((a) => !taken.has(a.slug));
  return [...ranked, ...fill].slice(0, limit);
}
export const mostDiscussed = (limit: number) => topBy("commentCount", limit);

/* — One article page ———————————————————————————————————— */

async function summaries(filter: QueryFilter<ArticleShape>, limit: number, d: Directory): Promise<ArticleSummary[]> {
  const rows = await ArticleModel.find({ ...PUBLISHED, ...filter }, { body: 0, detail: 0 })
    .sort(NEWEST_FIRST)
    .limit(limit)
    .lean<LeanArticle[]>();
  return rows.map((a) => toSummary(a, d));
}

/** Published articles by slug, in the order asked for; unknown or unpublished slugs are skipped. */
export async function summariesBySlugs(slugs: string[]): Promise<ArticleSummary[]> {
  if (slugs.length === 0) return [];
  const found = await summaries({ slug: { $in: slugs } }, slugs.length, await directory());
  const bySlug = new Map(found.map((a) => [a.slug, a]));
  return slugs.flatMap((slug) => bySlug.get(slug) ?? []);
}

/** Resolves each `recirc` block into real stories (reference rules). */
async function resolveBody(body: unknown[], article: LeanArticle, d: Directory): Promise<ResolvedBlock[]> {
  const out: ResolvedBlock[] = [];
  for (const raw of body as BodyBlock[]) {
    if (raw.type !== "recirc") {
      out.push(raw);
      continue;
    }
    let picked: ArticleSummary[];
    if (raw.slugs?.length) {
      const found = await summaries({ slug: { $in: raw.slugs } }, raw.slugs.length, d);
      picked = raw.slugs.flatMap((s) => found.filter((f) => f.slug === s)); // keep the editor's order
    } else {
      // stories sharing a tag, else the newest two others
      const shared = await summaries({ slug: { $ne: article.slug }, tags: { $in: article.tags } }, 2, d);
      picked = shared.length ? shared : await summaries({ slug: { $ne: article.slug } }, 2, d);
    }
    out.push({ type: "recirc", label: raw.label, articles: picked });
  }
  return out;
}

export async function getArticlePage(slug: string): Promise<ArticlePage> {
  const a = await ArticleModel.findOne({ ...PUBLISHED, slug }).lean<LeanArticle>();
  if (!a) throw notFound("Article not found", "ARTICLE_NOT_FOUND");

  const d = await directory();
  const isLongread = a.kind === "longread";

  const [body, sameSection, moreByAuthor] = await Promise.all([
    resolveBody(a.body ?? [], a, d),
    summaries({ slug: { $ne: slug }, section: a.section }, 3, d),
    summaries({ slug: { $ne: slug }, author: a.author }, 3, d),
  ]);

  let related: ArticleSummary[];
  let detail: Record<string, unknown>;

  if (isLongread) {
    const { related: relatedSlugs, ...rest } = longformDetailSchema.parse(a.detail ?? {});
    detail = rest;
    const found = relatedSlugs.length ? await summaries({ slug: { $in: relatedSlugs } }, relatedSlugs.length, d) : [];
    related = relatedSlugs.flatMap((s) => found.filter((f) => f.slug === s));
  } else {
    detail = articleDetailSchema.parse(a.detail ?? {});
    // same section first, then everything else — the first three
    const fill =
      sameSection.length < 3
        ? await summaries({ slug: { $nin: [slug, ...sameSection.map((s) => s.slug)] } }, 3 - sameSection.length, d)
        : [];
    related = [...sameSection, ...fill];
  }

  return {
    kind: a.kind,
    article: toSummary(a, d),
    detail,
    body,
    tags: a.tags.map((t) => ({ slug: t, name: topicName(d, t) })),
    related,
    moreByAuthor,
    ...(isLongread
      ? {
          chapters: ((a.body ?? []) as BodyBlock[]).flatMap((b) => (b.type === "chapter" ? [{ id: b.id, title: b.title }] : [])),
        }
      : {}),
  };
}
