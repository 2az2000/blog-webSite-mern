/**
 * Route map for what readers do. Counting a view or finished read works for
 * anyone (and knows more about a signed-in reader); everything else needs a
 * session. All responses are private (`no-store`).
 */
import { Router } from "express";
import { engagementController as c } from "./engagement.controller.js";
import { brokenLinkSchema, collectionBodySchema, historyQuery, listQuery, syncBookmarksSchema } from "./engagement.schemas.js";
import { optionalAuth, requireAuth } from "../../http/auth.js";
import { validate, validateQuery } from "../../http/validate.js";
import { presets, rateLimit } from "../../services/rate-limit/limiter.js";

export const engagementRouter: Router = Router();

const engage = rateLimit(presets.engage);

const PRIVATE = [
  "/articles/:slug/view",
  "/articles/:slug/read",
  "/articles/:slug/like",
  "/articles/:slug/engagement",
  "/me",
  "/reports",
];

engagementRouter.use(PRIVATE, (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

/* — per article — */
engagementRouter.post("/articles/:slug/view", engage, optionalAuth, c.view);
engagementRouter.post("/articles/:slug/read", engage, optionalAuth, c.read);
engagementRouter.get("/articles/:slug/engagement", optionalAuth, c.engagement);
engagementRouter.put("/articles/:slug/like", engage, requireAuth, c.like);
engagementRouter.delete("/articles/:slug/like", engage, requireAuth, c.unlike);

/* — the signed-in reader — */
const me: Router = Router();
me.use(requireAuth, engage);

me.get("/bookmarks", validateQuery(listQuery), c.listBookmarks);
me.post("/bookmarks/sync", validate(syncBookmarksSchema), c.syncBookmarks);
me.put("/bookmarks/:slug", c.save);
me.delete("/bookmarks/:slug", c.unsave);

me.get("/collections", c.listCollections);
me.post("/collections", validate(collectionBodySchema), c.createCollection);
me.get("/collections/:id", c.getCollection);
me.patch("/collections/:id", validate(collectionBodySchema), c.renameCollection);
me.delete("/collections/:id", c.deleteCollection);
me.put("/collections/:id/articles/:slug", c.addToCollection);
me.delete("/collections/:id/articles/:slug", c.removeFromCollection);

me.get("/follows", c.listFollows);
me.put("/follows/:kind/:slug", c.follow);
me.delete("/follows/:kind/:slug", c.unfollow);

me.get("/history", validateQuery(historyQuery), c.history);
me.delete("/history", c.clearHistory);

engagementRouter.use("/me", me);

/* — anyone — */
engagementRouter.post("/reports/broken-link", rateLimit(presets.report), validate(brokenLinkSchema), c.reportBrokenLink);
