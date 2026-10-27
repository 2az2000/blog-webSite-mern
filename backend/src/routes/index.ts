/** Everything mounted under `/api/v1`. */
import { Router } from "express";
import { healthRouter, liveness } from "./health.routes.js";
import { authRouter } from "../modules/auth/auth.routes.js";
import { adminRouter } from "../modules/admin/admin.routes.js";
import { internalRouter } from "./internal.routes.js";
import { commentsRouter } from "../modules/comments/comments.routes.js";
import { placementsRouter } from "../modules/placements/placements.routes.js";
import { newsletterRouter } from "../modules/newsletter/newsletter.routes.js";
import { searchRouter } from "../modules/search/search.routes.js";
import { engagementRouter } from "../modules/engagement/engagement.routes.js";
import { contentRouter } from "../modules/content/content.routes.js";
import { docsHandler, openapiHandler } from "../openapi.js";
import { connectDb } from "../db/connect.js";
import { presets, rateLimit } from "../services/rate-limit/limiter.js";

export const apiRouter: Router = Router();

/* Liveness first: it must answer even when the database is down. */
apiRouter.get("/health", liveness);

/* Every DB-backed request awaits the cached connection (serverless-safe). */
apiRouter.use((req, res, next) => {
  void res;
  connectDb().then(
    () => next(),
    (err) => next(err),
  );
});

/* Docs — no rate limit, no auth. */
apiRouter.get("/openapi.json", openapiHandler);
apiRouter.get("/docs", docsHandler);

/* Global budget below this line; stricter per-endpoint budgets inside /auth. */
apiRouter.use(rateLimit(presets.global));

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use(contentRouter);
apiRouter.use(placementsRouter);
apiRouter.use(searchRouter);
apiRouter.use(newsletterRouter);
apiRouter.use(engagementRouter);
apiRouter.use(commentsRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/internal", internalRouter);
