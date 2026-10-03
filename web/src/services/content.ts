import "server-only";

import { articles } from "@/data/mock/articles";
import { authors, fallbackAuthor } from "@/data/mock/authors";
import { defaultArticleDetail, longformDetails } from "@/data/mock/bodies";
import { comments, type CommentRecord } from "@/data/mock/comments";
import { sections } from "@/data/mock/sections";
import { topics } from "@/data/mock/topics";
import { routes } from "@/config/routes";
import type {
  Article,
  ArticleDetail,
  ArticleView,
  Author,
  BodyBlock,
  LongformDetail,
  ResolvedBlock,
  Section,
  Topic,
} from "@/types/content";

/*
 * Content data-access layer. The ONLY module that knows where content comes
 * from. Today it reads the mock records ported verbatim from the reference;
 * when the Express API is ready, replace the bodies with `fetch()` calls and
 * keep the signatures — pages and components do not change.
 *
 * Every function mirrors a query the reference pages make in their inline
 * scripts, so the ordering and filtering rules are the reference's own.
 */

/* — Lookups ---------------------------------------------------------------- */

export function getAuthor(slug: string): Author {
  return authors[slug] ?? fallbackAuthor;
}

export function getSection(slug: string): Section | null {
  return sections[slug] ?? null;
}

/** nova.js section(): an unknown key still renders, named after itself. */
function sectionOrKey(slug: string): Section {
  return sections[slug] ?? { slug, name: slug, blurb: "" };
}

/** Topic display name, falling back to the de-slugged key (reference behaviour). */
export function topicName(slug: string): string {
  return topics[slug]?.name ?? slug.replace(/-/g, " ");
}

function toView(a: Article): ArticleView {
  return {
    ...a,
    authorRef: getAuthor(a.author),
    sectionRef: sectionOrKey(a.section),
    href: a.kind === "longread" ? routes.longform(a.slug) : routes.article(a.slug),
  };
}

const byViews = (a: Article, b: Article) => b.views - a.views;
const byComments = (a: Article, b: Article) => b.comments - a.comments;

/* — Articles --------------------------------------------------------------- */

/** All articles in publication order (the record order is newest first). */
export async function listArticles(): Promise<ArticleView[]> {
  return articles.map(toView);
}

export async function getArticle(slug: string): Promise<ArticleView | null> {
  const a = articles.find((x) => x.slug === slug);
  return a ? toView(a) : null;
}

/** Resolve a fixed list of slugs, in order, skipping any that do not exist. */
export async function getArticles(slugs: string[]): Promise<ArticleView[]> {
  return slugs.flatMap((s) => {
    const a = articles.find((x) => x.slug === s);
    return a ? [toView(a)] : [];
  });
}

export async function mostRead(limit: number, pool: Article[] = articles): Promise<ArticleView[]> {
  return [...pool].sort(byViews).slice(0, limit).map(toView);
}

export async function mostDiscussed(limit: number): Promise<ArticleView[]> {
  return [...articles].sort(byComments).slice(0, limit).map(toView);
}

export async function articlesInSection(section: string): Promise<ArticleView[]> {
  const pool = section === "latest" ? articles : articles.filter((a) => a.section === section);
  return pool.map(toView);
}

export async function articlesByAuthor(author: string): Promise<ArticleView[]> {
  return articles.filter((a) => a.author === author).map(toView);
}

export async function articlesWithTopic(topic: string): Promise<ArticleView[]> {
  return articles.filter((a) => a.tags.includes(topic)).map(toView);
}

/** Front-page "Latest": newest first, minus what is already placed and minus long reads. */
export async function latestExcluding(placed: string[]): Promise<ArticleView[]> {
  return articles.filter((a) => !placed.includes(a.slug) && a.kind !== "longread").map(toView);
}

/* — Article page ----------------------------------------------------------- */

function resolveBody(body: BodyBlock[], article: Article): ResolvedBlock[] {
  const others = articles.filter((x) => x.slug !== article.slug);
  return body.map((block) => {
    if (block.type !== "recirc") return block;
    let picked: Article[];
    if (block.slugs) {
      picked = block.slugs.flatMap((s) => articles.filter((x) => x.slug === s));
    } else {
      // reference: stories sharing a tag, else the first two others
      const shared = others.filter((x) => x.tags.some((t) => article.tags.includes(t))).slice(0, 2);
      picked = shared.length ? shared : others.slice(0, 2);
    }
    return { type: "recirc", label: block.label, articles: picked.map(toView) };
  });
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
  const a = articles.find((x) => x.slug === slug && x.kind !== "longread");
  if (!a) return null;
  const { body, ...detail } = defaultArticleDetail;
  const others = articles.filter((x) => x.slug !== a.slug);
  const sameSection = others.filter((x) => x.section === a.section);
  return {
    article: toView(a),
    detail,
    body: resolveBody(body, a),
    tags: a.tags.map((t) => ({ slug: t, name: topicName(t) })),
    // reference: same section first, then everything else, first three
    related: [...sameSection, ...others].slice(0, 3).map(toView),
    moreByAuthor: others.filter((x) => x.author === a.author).slice(0, 3).map(toView),
  };
}

export async function listArticleSlugs(): Promise<string[]> {
  return articles.filter((a) => a.kind !== "longread").map((a) => a.slug);
}

export async function getComments(): Promise<CommentRecord[]> {
  return comments;
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
  const a = articles.find((x) => x.slug === slug);
  const d = longformDetails[slug];
  if (!a || !d) return null;
  const { body, related, ...detail } = d;
  return {
    article: toView(a),
    detail,
    body: resolveBody(body, a),
    chapters: body.flatMap((b) => (b.type === "chapter" ? [{ id: b.id, title: b.title }] : [])),
    related: (await getArticles(related)),
  };
}

export async function listLongformSlugs(): Promise<string[]> {
  return Object.keys(longformDetails);
}

/* — Sections, topics, authors --------------------------------------------- */

export async function listSectionSlugs(): Promise<string[]> {
  return Object.keys(sections);
}

export async function getTopic(slug: string): Promise<Topic | null> {
  return topics[slug] ?? null;
}

export async function listTopics(): Promise<Topic[]> {
  return Object.values(topics);
}

export async function listAuthors(): Promise<(Author & { count: number })[]> {
  return Object.values(authors).map((au) => ({
    ...au,
    count: articles.filter((a) => a.author === au.slug).length,
  }));
}

export async function listAuthorSlugs(): Promise<string[]> {
  return Object.keys(authors);
}

/** Search index handed to the client search screen — only the fields it matches on. */
export async function getSearchIndex() {
  return {
    articles: articles.map(toView),
    authors: await listAuthors(),
    topics: Object.values(topics).map((t) => ({
      ...t,
      count: articles.filter((a) => a.tags.includes(t.slug)).length,
    })),
  };
}

export type SearchIndex = Awaited<ReturnType<typeof getSearchIndex>>;
