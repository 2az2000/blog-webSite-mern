/**
 * Session lifecycle for refresh tokens (create, rotate, revoke) with
 * reuse detection. Token shape: `<sessionIdHex>.<secret>` — the id portion
 * locates the session, the secret portion is stored hashed.
 */
import { randomBytes, timingSafeEqual } from "node:crypto";
import { SessionModel, type SessionCreateInput, type SessionDoc, type RevokedReason } from "../models/session.model.js";
import { hashToken, refreshExpiryFromNow } from "./token.service.js";
import { unauthorized } from "../http/errors.js";

export type SessionMeta = { userAgent?: string; ip?: string };

export interface RotatedRefresh {
  token: string;
  userId: string;
}

const ID_BYTES = 16; // ⇒ 32 hex chars
const SECRET_BYTES = 48;
const MAX_PREVIOUS_HASHES = 5;
/**
 * Two tabs (or a prefetch) can present the same refresh token within moments
 * of each other. A previous hash seen this soon after rotation is that race,
 * not theft: refuse the request, but leave the user's sessions alone.
 */
const REUSE_GRACE_MS = 10_000;

const safeEqual = (a: string, b: string): boolean => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
};

function parseToken(token: string): { id: string; secretHash: string } {
  const dot = token.indexOf(".");
  const id = dot === -1 ? "" : token.slice(0, dot);
  const secret = dot === -1 ? "" : token.slice(dot + 1);
  if (!/^[a-f0-9]{32}$/.test(id) || secret.length < 32) {
    throw unauthorized("Invalid refresh token", "INVALID_REFRESH");
  }
  return { id, secretHash: hashToken(secret) };
}

function secretBytes(): string {
  return randomBytes(SECRET_BYTES).toString("base64url");
}

/** Issues a fresh session and returns its opaque token. */
export async function createSession(userId: string, meta: SessionMeta): Promise<string> {
  const id = randomBytes(ID_BYTES).toString("hex");
  const secret = secretBytes();

  const input: SessionCreateInput = {
    _id: id,
    userId: userId as unknown as SessionCreateInput["userId"],
    tokenHash: hashToken(secret),
    previousHashes: [],
    expiresAt: refreshExpiryFromNow(),
    userAgent: meta.userAgent?.slice(0, 256),
    ip: meta.ip?.slice(0, 64),
  };

  await SessionModel.create(input);
  return `${id}.${secret}`;
}

/**
 * Rotates a presented refresh token.
 * - unknown token / revoked / expired → 401 INVALID_REFRESH
 * - hash matches an older hash more than REUSE_GRACE_MS after rotation →
 *   reuse ⇒ the user's sessions are revoked wholesale → 401 REFRESH_REUSE
 *   (within the grace window it is a harmless race → plain 401 INVALID_REFRESH)
 */
export async function rotateSession(presented: string, meta: SessionMeta): Promise<RotatedRefresh> {
  const { id, secretHash } = parseToken(presented);
  const session: SessionDoc | null = await SessionModel.findById(id);

  if (!session) throw unauthorized("Invalid refresh token", "INVALID_REFRESH");
  if (session.revokedAt) throw unauthorized("Session revoked — sign in again", "INVALID_REFRESH");

  const matchesCurrent = safeEqual(session.tokenHash, secretHash);
  const matchesPrevious = session.previousHashes.some((h) => safeEqual(h, secretHash));

  if (!matchesCurrent) {
    if (matchesPrevious) {
      const rotatedAgo = Date.now() - (session.rotatedAt?.getTime() ?? 0);
      if (rotatedAgo < REUSE_GRACE_MS) throw unauthorized("Invalid refresh token", "INVALID_REFRESH");
      await revokeAllForUser(String(session.userId), "rotate-reuse");
      throw unauthorized("Refresh token reuse detected; all sessions were revoked", "REFRESH_REUSE");
    }
    throw unauthorized("Invalid refresh token", "INVALID_REFRESH");
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    throw unauthorized("Refresh token expired", "INVALID_REFRESH");
  }

  const nextSecret = secretBytes();
  session.tokenHash = hashToken(nextSecret);
  session.previousHashes = [secretHash, ...session.previousHashes].slice(0, MAX_PREVIOUS_HASHES);
  session.rotatedAt = new Date();
  session.expiresAt = refreshExpiryFromNow();
  session.userAgent = meta.userAgent?.slice(0, 256) ?? session.userAgent;
  session.ip = meta.ip?.slice(0, 64) ?? session.ip;
  await session.save();

  return { token: `${id}.${nextSecret}`, userId: String(session.userId) };
}

/** The live, unrevoked session behind a presented token (logout path). */
export async function findSessionByToken(presented: string): Promise<SessionDoc | null> {
  const { id, secretHash } = parseToken(presented);
  const session = await SessionModel.findById(id);
  if (!session || session.revokedAt || !safeEqual(session.tokenHash, secretHash)) return null;
  return session;
}

export async function revokeSession(session: SessionDoc, reason: RevokedReason): Promise<void> {
  if (session.revokedAt) return;
  session.revokedAt = new Date();
  session.revokedReason = reason;
  await session.save();
}

/** The session id inside a presented refresh token, or null when it is not shaped like one. */
export function sessionIdOf(presented: unknown): string | null {
  if (typeof presented !== "string") return null;
  const id = presented.slice(0, presented.indexOf("."));
  return /^[a-f0-9]{32}$/.test(id) ? id : null;
}

/** A person's signed-in devices, newest activity first. Revoked and expired sessions are not devices any more. */
export async function listDevices(userId: string, currentId: string | null) {
  const rows = await SessionModel.find({ userId, revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } })
    .sort({ updatedAt: -1 })
    .lean();
  return rows.map((s) => ({
    id: s._id,
    current: s._id === currentId,
    device: describeAgent(s.userAgent),
    signedInAt: s.createdAt,
    lastActiveAt: s.updatedAt,
  }));
}

/** Signs one device out. Someone else's session id is as good as a missing one. */
export async function revokeDevice(userId: string, id: string): Promise<boolean> {
  const res = await SessionModel.updateOne(
    { _id: id, userId, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date(), revokedReason: "device-signout" } },
  );
  return res.matchedCount === 1;
}

/** Signs out every device but this one. */
export async function revokeOtherDevices(userId: string, keepId: string | null): Promise<number> {
  const res = await SessionModel.updateMany(
    { userId, revokedAt: { $exists: false }, ...(keepId ? { _id: { $ne: keepId } } : {}) },
    { $set: { revokedAt: new Date(), revokedReason: "device-signout" } },
  );
  return res.modifiedCount;
}

/** "Chrome on Windows" from a user-agent string — enough to recognise your own devices, nothing finer. */
export function describeAgent(ua: string | undefined): string {
  if (!ua) return "Unknown device";
  const browser = ua.includes("Edg/")
    ? "Edge"
    : /OPR|Opera/.test(ua)
      ? "Opera"
      : ua.includes("Firefox/")
        ? "Firefox"
        : ua.includes("Chrome/") || /CriOS/.test(ua)
          ? "Chrome"
          : ua.includes("Safari/")
            ? "Safari"
            : null;
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad|iPod/.test(ua)
        ? "iOS"
        : /Mac OS X|Macintosh/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : null;
  if (browser && os) return `${browser} on ${os}`;
  return browser ?? os ?? "Unknown device";
}

export async function revokeAllForUser(userId: string, reason: RevokedReason): Promise<void> {
  await SessionModel.updateMany(
    { userId, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date(), revokedReason: reason } },
  );
}
