import { routes } from "@/config/routes";
import type { Article, ArticleView, Author, Section, Topic } from "@/types/content";

/*
 * The shape the search screen works with, and the mapping from what the API
 * sends. Isomorphic: the server renders the first results, the browser fetches
 * the rest.
 */

type ApiSummary = Article & { authorRef: Author; sectionRef: Section };

export type ApiSearchBody = {
  data: { articles: ApiSummary[]; authors: (Author & { count: number })[]; topics: (Topic & { count: number })[] };
  page: { totals: { articles: number; authors: number; topics: number }; page: number; limit: number };
};

export type SearchData = {
  articles: ArticleView[];
  authors: (Author & { count: number })[];
  topics: (Topic & { count: number })[];
  totals: { articles: number; authors: number; topics: number };
  page: number;
  limit: number;
};

export type SearchSort = "relevance" | "newest" | "popular";

export function toSearchData(body: ApiSearchBody): SearchData {
  return {
    articles: body.data.articles.map((a) => ({ ...a, href: a.kind === "longread" ? routes.longform(a.slug) : routes.article(a.slug) })),
    authors: body.data.authors,
    topics: body.data.topics,
    totals: body.page.totals,
    page: body.page.page,
    limit: body.page.limit,
  };
}
