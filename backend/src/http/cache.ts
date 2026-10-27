import type { RequestHandler } from "express";

/**
 * Public, read-only content may be shared by a CDN: the edge serves it for a
 * minute and then revalidates in the background for five more, so a traffic
 * spike never reaches Mongo more than once a minute per URL.
 * (Browsers always revalidate: `max-age=0`.)
 */
export const publicCache: RequestHandler = (_req, res, next) => {
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");
  next();
};
