/** Route map for the public read API. Everything here is GET and CDN-cacheable. */
import { Router } from "express";
import { contentController as c } from "./content.controller.js";
import { limitQuery, listArticlesQuery } from "./content.schemas.js";
import { publicCache } from "../../http/cache.js";
import { sweepDue } from "../admin/articles.service.js";
import { validateQuery } from "../../http/validate.js";

export const contentRouter: Router = Router();

/* Scheduled articles go live on the first read after their time (throttled to every 30 s). */
contentRouter.use(["/articles", "/trending", "/most-discussed"], async (_req, _res, next) => {
  await sweepDue().catch(() => undefined);
  next();
});

contentRouter.get("/sections", publicCache, c.sections);
contentRouter.get("/sections/:slug", publicCache, c.section);
contentRouter.get("/topics", publicCache, c.topics);
contentRouter.get("/topics/:slug", publicCache, c.topic);
contentRouter.get("/authors", publicCache, c.authors);
contentRouter.get("/authors/:slug", publicCache, c.author);

contentRouter.get("/articles", publicCache, validateQuery(listArticlesQuery), c.articles);
contentRouter.get("/articles/:slug", publicCache, c.article);

contentRouter.get("/trending", publicCache, validateQuery(limitQuery), c.trending);
contentRouter.get("/most-discussed", publicCache, validateQuery(limitQuery), c.mostDiscussed);
