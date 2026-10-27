/**
 * Cross-site request forgery.
 *
 * The session lives in cookies, and a browser attaches cookies to a request a
 * malicious page makes. Two defences stack:
 *   1. the cookies are `SameSite=Lax`, so browsers withhold them from cross-site POSTs;
 *   2. this guard, for browsers and cases where that is not enough: an unsafe
 *      request that carries our session cookies must come from our own site.
 *
 * Requests with no session cookie (a script with a Bearer token, curl, the cron,
 * a mail client's one-click unsubscribe) have no ambient credentials to abuse,
 * so they pass untouched.
 */
import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { forbidden } from "./errors.js";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "./cookies.js";

const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const originOf = (url: string): string | null => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

/** The site (WEB_APP_URL), any extra origins configured, and the local dev servers outside production. */
export function allowedOrigins(): Set<string> {
  const list = [env.webAppUrl, ...env.allowedOrigins, ...(env.isProd ? [] : ["http://localhost:3000", "http://127.0.0.1:3000"])];
  return new Set(list.flatMap((u) => originOf(u) ?? []));
}

export const csrfGuard: RequestHandler = (req, _res, next) => {
  if (!UNSAFE.has(req.method)) return next();
  if (!req.cookies?.[ACCESS_COOKIE] && !req.cookies?.[REFRESH_COOKIE]) return next();

  const origin = req.get("origin");
  const refuse = () => next(forbidden("This request did not come from the NOVA site", "CSRF_REFUSED"));

  if (origin) return allowedOrigins().has(origin) ? next() : refuse();

  // No Origin (older browsers on same-origin requests): a request the browser marks cross-site is still refused.
  return req.get("sec-fetch-site") === "cross-site" ? refuse() : next();
};
