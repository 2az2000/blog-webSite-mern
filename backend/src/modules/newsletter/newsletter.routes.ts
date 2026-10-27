/**
 * The public side of the Dispatch. Subscribing needs no account; every link in an
 * e-mail works without one. Responses are private (`no-store`) except the latest issue.
 */
import express, { Router } from "express";
import type { Types } from "mongoose";
import { UserModel } from "../../models/user.model.js";
import { badRequest } from "../../http/errors.js";
import { publicCache } from "../../http/cache.js";
import { validate } from "../../http/validate.js";
import { presets, rateLimit } from "../../services/rate-limit/limiter.js";
import { requireAuth } from "../../http/auth.js";
import { mySubscriptionSchema, subscribeSchema, tokenSchema, updatePreferencesSchema } from "./newsletter.schemas.js";
import * as newsletter from "./newsletter.service.js";

export const newsletterRouter: Router = Router();

newsletterRouter.use("/newsletter", (req, res, next) => {
  if (!req.path.startsWith("/issues/latest")) res.setHeader("Cache-Control", "no-store");
  next();
});

/** Asks for the Dispatch. The answer is the same whoever the address belongs to. */
newsletterRouter.post("/newsletter/subscribe", rateLimit(presets.newsletter), validate(subscribeSchema), async (req, res) => {
  await newsletter.subscribe(req.body);
  res.status(202).json({ data: { ok: true } });
});

newsletterRouter.post("/newsletter/confirm", rateLimit(presets.newsletterToken), validate(tokenSchema), async (req, res) => {
  res.json({ data: await newsletter.confirm(req.body.token) });
});

newsletterRouter.post("/newsletter/manage", rateLimit(presets.newsletterToken), validate(tokenSchema), async (req, res) => {
  res.json({ data: await newsletter.getPreferences(req.body.token) });
});

newsletterRouter.patch("/newsletter/manage", rateLimit(presets.newsletterToken), validate(updatePreferencesSchema), async (req, res) => {
  const { token, ...patch } = req.body as { token: string; topics?: string[]; frequency?: "both" | "weekly" | "monthly" };
  res.json({ data: await newsletter.updatePreferences(token, patch) });
});

/**
 * Leaves. Mail clients' "unsubscribe" button POSTs here with the token in the
 * query and a form body (RFC 8058 one-click); the site's own button sends JSON.
 */
newsletterRouter.post(
  "/newsletter/unsubscribe",
  rateLimit(presets.newsletterToken),
  express.urlencoded({ extended: false, limit: "1kb" }),
  async (req, res) => {
    const raw = req.query.token ?? (req.body as { token?: unknown } | undefined)?.token;
    const parsed = tokenSchema.safeParse({ token: typeof raw === "string" ? raw : "" });
    if (!parsed.success) throw badRequest("A token is required", "VALIDATION_ERROR");
    res.json({ data: await newsletter.unsubscribe(parsed.data.token) });
  },
);

newsletterRouter.post("/newsletter/resubscribe", rateLimit(presets.newsletterToken), validate(tokenSchema), async (req, res) => {
  res.json({ data: await newsletter.resubscribe(req.body.token) });
});

const accountEmail = async (id: Types.ObjectId): Promise<string> => (await UserModel.findById(id, { email: 1 }).lean())!.email;

/** The signed-in reader's own subscription (their account e-mail): no link needed, they are already proven. */
newsletterRouter.get("/newsletter/mine", requireAuth, async (req, res) => {
  res.json({ data: await newsletter.mySubscription(await accountEmail(req.auth!.userId)) });
});

newsletterRouter.put("/newsletter/mine", requireAuth, validate(mySubscriptionSchema), async (req, res) => {
  res.json({ data: await newsletter.setMySubscription(await accountEmail(req.auth!.userId), req.body) });
});

/** The latest issue sent, for the site's "A recent issue" section (null before the first). */
newsletterRouter.get("/newsletter/issues/latest", publicCache, async (_req, res) => {
  res.json({ data: await newsletter.latestIssue() });
});
