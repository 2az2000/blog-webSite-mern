/** Public search, and the list of terms people have used. CDN-cacheable like the rest of the public read API. */
import { Router } from "express";
import { publicCache } from "../../http/cache.js";
import { validateQuery } from "../../http/validate.js";
import { sweepDue } from "../admin/articles.service.js";
import { popularQuery, searchQuery, type SearchQuery } from "./search.schemas.js";
import { popularTerms, recordSearch, search } from "./search.service.js";

export const searchRouter: Router = Router();

/** Crawlers and monitors search for nothing a reader would; they would only skew the counts. */
const NOT_A_READER = /bot|crawl|spider|slurp|headless|preview|monitor|curl|wget|python-requests/i;

searchRouter.get("/search", publicCache, validateQuery(searchQuery), async (req, res) => {
  await sweepDue().catch(() => undefined); // a scheduled story may be due
  const q = res.locals.query as SearchQuery;
  const found = await search(q);
  const ua = String(req.headers["user-agent"] ?? "");
  // "show more" and re-sorting are not new searches
  if (q.page === 1 && q.sort === "relevance" && ua && !NOT_A_READER.test(ua)) await recordSearch(found.term, found.totals.articles);

  const { articles, authors, topics, totals, ...meta } = found;
  res.json({ data: { articles, authors, topics }, page: { ...meta, totals } });
});

searchRouter.get("/search/popular", publicCache, validateQuery(popularQuery), async (_req, res) => {
  res.json({ data: await popularTerms((res.locals.query as { limit: number }).limit) });
});
