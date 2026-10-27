/** Endpoints for the platform's own schedulers, not for browsers. */
import { timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { env } from "../config/env.js";
import { unauthorized } from "../http/errors.js";
import { publishDue } from "../modules/admin/articles.service.js";
import { runIssues } from "../modules/newsletter/newsletter.service.js";

export const internalRouter: Router = Router();

const matches = (given: string, expected: string): boolean => {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

/** Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`. Closed when no secret is set. */
internalRouter.get("/publish-due", async (req, res) => {
  const given = (req.headers.authorization ?? "").replace(/^Bearer /, "");
  if (!env.cronSecret || !matches(given, env.cronSecret)) throw unauthorized("Not allowed", "CRON_FORBIDDEN");
  const published = await publishDue();
  res.setHeader("Cache-Control", "no-store").json({ data: { published } });
});

/** Starts due scheduled Dispatch issues and keeps sending until the list runs out or the time budget is spent. */
internalRouter.get("/run-issues", async (req, res) => {
  const given = (req.headers.authorization ?? "").replace(/^Bearer /, "");
  if (!env.cronSecret || !matches(given, env.cronSecret)) throw unauthorized("Not allowed", "CRON_FORBIDDEN");
  res.setHeader("Cache-Control", "no-store").json({ data: await runIssues() });
});
