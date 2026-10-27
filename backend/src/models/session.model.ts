import mongoose, { Schema, model, type Types } from "mongoose";

/**
 * Refresh-token session. One document per issued device session.
 * Rotation overwrites `tokenHash`; `previousHashes` keeps the last five
 * hashes so an immediate reuse of an already-rotated token is detectable
 * (theft signal — the user's sessions are revoked in that case).
 *
 * `_id` is the 32-hex session id embedded in the token (`<id>.<secret>`),
 * so it is declared as a String — Mongoose's default ObjectId cannot hold it.
 */
export type RevokedReason = "logout" | "rotate-reuse" | "password-change" | "account-delete" | "admin-action" | "device-signout";

export interface SessionShape {
  _id: string;
  userId: Types.ObjectId;
  /** sha256 of the session secret — the token itself is never stored */
  tokenHash: string;
  previousHashes: string[];
  /** When the secret last rotated — a presented previous hash this soon after is a race, not theft. */
  rotatedAt?: Date;
  /** TTL: MongoDB removes the document automatically once elapsed */
  expiresAt: Date;
  revokedAt?: Date;
  revokedReason?: RevokedReason;
  userAgent?: string;
  ip?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/** A loaded (hydrated) session with Document methods such as save(). */
export type SessionDoc = mongoose.HydratedDocument<SessionShape>;
export type SessionCreateInput = Omit<SessionShape, "createdAt" | "updatedAt">;

const sessionSchema = new Schema<SessionShape>(
  {
    _id: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    previousHashes: { type: [String], default: [] },
    rotatedAt: { type: Date },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    revokedReason: { type: String, enum: ["logout", "rotate-reuse", "password-change", "account-delete", "admin-action", "device-signout"] },
    userAgent: { type: String, maxLength: 256 },
    ip: { type: String, maxLength: 64 },
  },
  { timestamps: true },
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SessionModel: mongoose.Model<SessionShape> =
  (mongoose.models.Session as mongoose.Model<SessionShape> | undefined) ??
  model<SessionShape>("Session", sessionSchema, "sessions");
