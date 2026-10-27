/**
 * Route map for comments. Anyone may read a thread (a signed-in reader also
 * sees their own held comments and which ones they liked); writing needs a
 * session. Every response is private (`no-store`).
 */
import { Router } from "express";
import { commentsController as c } from "./comments.controller.js";
import { createCommentSchema, editCommentSchema, listCommentsQuery, reportCommentSchema } from "./comments.schemas.js";
import { optionalAuth, requireAuth } from "../../http/auth.js";
import { validate, validateQuery } from "../../http/validate.js";
import { presets, rateLimit } from "../../services/rate-limit/limiter.js";

export const commentsRouter: Router = Router();

commentsRouter.use(["/articles/:slug/comments", "/comments"], (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

const engage = rateLimit(presets.engage);

commentsRouter.get("/articles/:slug/comments", optionalAuth, validateQuery(listCommentsQuery), c.list);
commentsRouter.post("/articles/:slug/comments", engage, requireAuth, validate(createCommentSchema), c.create);

commentsRouter.patch("/comments/:id", engage, requireAuth, validate(editCommentSchema), c.edit);
commentsRouter.delete("/comments/:id", engage, requireAuth, c.remove);
commentsRouter.put("/comments/:id/like", engage, requireAuth, c.like);
commentsRouter.delete("/comments/:id/like", engage, requireAuth, c.unlike);
commentsRouter.post("/comments/:id/report", engage, requireAuth, validate(reportCommentSchema), c.report);
