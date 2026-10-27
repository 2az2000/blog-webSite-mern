/**
 * Access-token gate. Reads `nova_at` cookie (or `Authorization: Bearer …`
 * for tools/tests), verifies the JWT, loads the live user from the DB —
 * role/status decisions are always made against current data, never a stale
 * token claim.
 */
import type { Request, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { forbidden, unauthorized } from "./errors.js";
import { ACCESS_COOKIE } from "./cookies.js";
import { UserModel, type User, type Role } from "../models/user.model.js";

export interface AccessPayload {
  sub: string;
  role: Role;
}

export function signAccessToken(userId: string, role: Role): string {
  return jwt.sign({ sub: userId, role }, env.accessTokenSecret, {
    expiresIn: env.accessTokenTtl,
    issuer: "nova",
  });
}

export function verifyAccessToken(token: string): AccessPayload {
  const decoded = jwt.verify(token, env.accessTokenSecret, { issuer: "nova" });
  if (typeof decoded === "string" || !("sub" in decoded) || typeof decoded.sub !== "string") {
    throw unauthorized("Invalid access token", "INVALID_ACCESS_TOKEN");
  }
  return { sub: decoded.sub, role: decoded.role as Role };
}

function readToken(req: Request): string {
  const cookieToken = req.cookies?.[ACCESS_COOKIE];
  if (typeof cookieToken === "string" && cookieToken.length > 0) return cookieToken;

  const header = req.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) return header.slice("Bearer ".length);

  throw unauthorized("Authentication required");
}

/** Attaches `req.auth` and `req.user` (fresh from DB) or fails 401/403. */
export const requireAuth: RequestHandler = (req, res, next) => {
  void res;
  try {
    const payload = verifyAccessToken(readToken(req));
    defaultUserLoader(payload.sub)
      .then((user) => {
        if (!user) throw unauthorized("Account no longer exists", "ACCOUNT_NOT_FOUND");
        if (user.status !== "active") throw forbidden("Account suspended", "ACCOUNT_SUSPENDED");

        req.auth = { userId: user._id, role: user.role };
        (req as Request & { user?: User }).user = user;
        next();
      })
      .catch(next);
  } catch (err) {
    next(err);
  }
};

async function defaultUserLoader(id: string) {
  return UserModel.findById(id);
}

/** Convenience wrappers for future RBAC (phase 3 admin panel). */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    const auth = req.auth;
    if (!auth) {
      next(unauthorized());
      return;
    }
    if (!roles.includes(auth.role as Role)) {
      next(forbidden("Insufficient role"));
      return;
    }
    next();
  };
}

/**
 * Like `requireAuth`, but a missing, expired or invalid session simply means
 * "anonymous": public actions (counting a view) work for everyone and merely
 * know more about a signed-in reader.
 */
export const optionalAuth: RequestHandler = (req, res, next) => {
  void res;
  let payload: AccessPayload;
  try {
    payload = verifyAccessToken(readToken(req));
  } catch {
    next();
    return;
  }
  defaultUserLoader(payload.sub)
    .then((user) => {
      if (user && user.status === "active") req.auth = { userId: user._id, role: user.role };
      next();
    })
    .catch(next);
};
