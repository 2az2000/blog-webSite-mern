/**
 * Rate-limiter middleware + presets. Keys are bucketed by client IP (trust
 * proxy must be set) plus either the route name (global budget) or an
 * explicit suffix for the strict per-endpoint budgets (login brute force,
 * e-mail spam…).
 *
 * Response headers follow the draft convention: X-RateLimit-Limit,
 * X-RateLimit-Remaining, X-RateLimit-Reset; 429 carries Retry-After.
 */
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { env } from "../../config/env.js";
import { tooManyRequests } from "../../http/errors.js";
import { decideRate, rateLimitStoreName } from "./store.js";

export interface RateLimitOptions {
  /** requests allowed per window */
  limit: number;
  /** window in ms */
  windowMs: number;
  /** bucket name — defaults to "global" */
  bucket: string;
}

export const presets = {
  global: { limit: 240, windowMs: 60_000, bucket: "global" },
  authLogin: { limit: 12, windowMs: 15 * 60_000, bucket: "login" },
  authRegister: { limit: 5, windowMs: 60 * 60_000, bucket: "register" },
  authRefresh: { limit: 60, windowMs: 15 * 60_000, bucket: "refresh" },
  authForgot: { limit: 3, windowMs: 60 * 60_000, bucket: "forgot" },
  authReset: { limit: 10, windowMs: 60 * 60_000, bucket: "reset" },
  authVerify: { limit: 10, windowMs: 60 * 60_000, bucket: "verify" },
  /** Counting views, reads, likes, saves: cheap writes, generous budget. */
  engage: { limit: 120, windowMs: 60_000, bucket: "engage" },
  /** Broken-link reports are anonymous; keep them from becoming a flood. */
  report: { limit: 10, windowMs: 15 * 60_000, bucket: "report" },
  /** Asking for the Dispatch sends an e-mail to whoever is named, so it is tight. */
  newsletter: { limit: 6, windowMs: 60 * 60_000, bucket: "newsletter" },
  /** Links from e-mails (confirm, manage, leave): generous, they are clicked once. */
  newsletterToken: { limit: 40, windowMs: 10 * 60_000, bucket: "newsletter-token" },
  authVerifyResend: { limit: 3, windowMs: 60 * 60_000, bucket: "verify-resend" },
} satisfies Record<string, Omit<RateLimitOptions, never>>;

function clientIp(req: Request): string {
  // trust proxy is set by the app builder; req.ip then carries the client.
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

export function rateLimit(options: RateLimitOptions): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (env.rateLimitDisabled) {
      next();
      return;
    }

    const key = `${options.bucket}:${clientIp(req)}`;
    decideRate({ key, windowMs: options.windowMs, limit: options.limit })
      .then((d) => {
        req.rateLimit = { limit: d.limit, remaining: d.remaining, resetAt: d.resetAt, blocked: !d.allowed, key };

        res.setHeader("X-RateLimit-Limit", String(d.limit));
        res.setHeader("X-RateLimit-Remaining", String(d.remaining));
        res.setHeader("X-RateLimit-Reset", String(Math.ceil(d.resetAt / 1000)));

        if (!d.allowed) {
          const retryAfter = Math.max(1, Math.ceil((d.resetAt - Date.now()) / 1000));
          res.setHeader("Retry-After", String(retryAfter));
          next(tooManyRequests(undefined, "RATE_LIMITED", retryAfter));
          return;
        }
        next();
      })
      .catch(next);
  };
}

export function storeName(): "upstash" | "memory" {
  return rateLimitStoreName();
}
