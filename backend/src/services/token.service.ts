/**
 * Refresh tokens are long random values, only ever stored hashed (sha256).
 * The presented token identifies its session; rotation replaces the hash and
 * keeps the previous one briefly for theft detection.
 */
import { createHash, randomBytes } from "node:crypto";
import { env } from "../config/env.js";

export function newRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function refreshExpiryFromNow(): Date {
  return new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
}
