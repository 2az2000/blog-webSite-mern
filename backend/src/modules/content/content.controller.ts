/**
 * Public read endpoints. Express 5 forwards rejected promises to the error
 * middleware, so handlers just await the service and render the envelope.
 */
import type { Request, RequestHandler } from "express";
import * as content from "./content.service.js";
import type { ListArticlesQuery } from "./content.schemas.js";

const slugOf = (req: Request): string => String(req.params.slug);

export const contentController = {
  sections: (async (_req, res) => {
    res.json({ data: await content.listSections() });
  }) satisfies RequestHandler,

  section: (async (req, res) => {
    res.json({ data: await content.getSection(slugOf(req)) });
  }) satisfies RequestHandler,

  topics: (async (_req, res) => {
    res.json({ data: await content.listTopics() });
  }) satisfies RequestHandler,

  topic: (async (req, res) => {
    res.json({ data: await content.getTopic(slugOf(req)) });
  }) satisfies RequestHandler,

  authors: (async (_req, res) => {
    res.json({ data: await content.listAuthors() });
  }) satisfies RequestHandler,

  author: (async (req, res) => {
    res.json({ data: await content.getAuthor(slugOf(req)) });
  }) satisfies RequestHandler,

  articles: (async (_req, res) => {
    const { items, nextCursor } = await content.listArticles(res.locals.query as ListArticlesQuery);
    res.json({ data: items, page: { nextCursor } });
  }) satisfies RequestHandler,

  article: (async (req, res) => {
    res.json({ data: await content.getArticlePage(slugOf(req)) });
  }) satisfies RequestHandler,

  trending: (async (_req, res) => {
    res.json({ data: await content.trending((res.locals.query as { limit: number }).limit) });
  }) satisfies RequestHandler,

  mostDiscussed: (async (_req, res) => {
    res.json({ data: await content.mostDiscussed((res.locals.query as { limit: number }).limit) });
  }) satisfies RequestHandler,
};
