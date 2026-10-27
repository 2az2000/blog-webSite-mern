/**
 * Authentication cookies. Both tokens ride httpOnly cookies so the Next app's
 * same-origin `/api/*` proxy keeps them browser-safe and CSRF-light:
 *
 *   nova_at  — access JWT, 15 min, path /
 *   nova_rt  — refresh token, days, path /api/v1/auth (not sent elsewhere)
 */
import type { Response } from "express";
import { env } from "../config/env.js";

export const ACCESS_COOKIE = "nova_at";
export const REFRESH_COOKIE = "nova_rt";

const baseCookie = () =>
  ({
    httpOnly: true,
    sameSite: "lax",
    secure: env.cookieSecure,
    path: "/",
  }) as const;

export function setAuthCookies(res: Response, accessToken: string, refreshToken?: string): void {
  res.cookie(ACCESS_COOKIE, accessToken, { ...baseCookie(), maxAge: env.accessTokenTtl * 1000 });

  if (refreshToken !== undefined) {
    res.cookie(REFRESH_COOKIE, refreshToken, {
      ...baseCookie(),
      path: "/api/v1/auth",
      maxAge: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    });
  }
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, baseCookie());
  res.clearCookie(REFRESH_COOKIE, { ...baseCookie(), path: "/api/v1/auth" });
}
