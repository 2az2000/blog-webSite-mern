/**
 * The HTTP application — middleware order, routers, error handling.
 * No listen() here:
 *  - entry B (src/index.ts) adds dotenv + boot logging + app.listen
 *  - entry A (api/index.ts) hands this app to Vercel's Node runtime
 *
 * Order: request logging → security headers → body + cookies → CSRF guard → /api/v1 router
 * (liveness, DB connection, docs, global rate limit, feature routers) → /api 404
 * → error handler.
 */
import express, { type Express } from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { logger } from "./config/logger.js";
import { initSentry } from "./config/sentry.js";
import { csrfGuard } from "./http/csrf.js";
import { apiNotFound, errorHandler } from "./http/error-handler.js";
import { apiRouter } from "./routes/index.js";

export function createApp(): Express {
  initSentry();
  const app = express();

  // Behind one proxy layer (Next rewrite / Vercel edge) so req.ip is the client.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(pinoHttp({ logger }));

  // CSP is off here: responses are JSON, and the docs page pulls Redoc from a CDN.
  // The site's CSP and the rest of its headers are set by the Next app (web/next.config.ts).
  app.use(helmet({ contentSecurityPolicy: false }));

  // article bodies are long; the parser that runs first wins, so this must precede the small global one
  app.use("/api/v1/admin", express.json({ limit: "512kb" }));
  app.use(express.json({ limit: "32kb" }));
  app.use(cookieParser());
  app.use(csrfGuard);

  app.use("/api/v1", apiRouter);

  // Unknown /api/* routes (but not the 404 page of /404 test links).
  app.use("/api", apiNotFound);

  app.use(errorHandler);

  return app;
}
