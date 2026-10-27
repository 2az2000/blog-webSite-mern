import bcrypt from "bcryptjs";
import mongoose, { Schema, model, type Document, type Types } from "mongoose";

export const ROLES = ["reader", "writer", "editor", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUSES = ["active", "suspended"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** Hashed e-mail verification code, fresh per sign-up / resend. */
export interface EmailVerification {
  codeHash: string;
  expiresAt: Date;
  sentAt: Date;
  /** Wrong tries against this code; it dies after OTP_MAX_ATTEMPTS. */
  attempts: number;
}

/** Hashed one-time password-reset token, 1h lifetime. */
export interface PasswordReset {
  tokenHash: string;
  expiresAt: Date;
}

const emailVerificationSchema = new Schema<EmailVerification>(
  {
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    sentAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
  },
  { _id: false },
);

const passwordResetSchema = new Schema<PasswordReset>(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { _id: false },
);

export interface User extends Document<Types.ObjectId> {
  name: string;
  email: string; // stored lowercased
  /** selected: false in queries — never leaves the data layer by accident */
  passwordHash: string;
  role: Role;
  status: UserStatus;
  emailVerified: boolean;
  /** Which terms the person accepted when they created the account, and when. */
  terms?: { acceptedAt: Date; version: string };
  emailVerification?: EmailVerification;
  passwordReset?: PasswordReset;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<User>(
  {
    name: { type: String, required: true, trim: true, maxLength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ROLES), default: "reader", index: true },
    status: { type: String, enum: Object.values(USER_STATUSES), default: "active" },
    emailVerified: { type: Boolean, default: false },
    terms: { type: new Schema({ acceptedAt: { type: Date, required: true }, version: { type: String, required: true } }, { _id: false }) },
    emailVerification: { type: emailVerificationSchema, select: false },
    passwordReset: { type: passwordResetSchema, select: false },
  },
  { timestamps: true },
);

export const UserModel: mongoose.Model<User> =
  (mongoose.models.User as mongoose.Model<User> | undefined) ?? model<User>("User", userSchema, "users");

/* — Password hashing (used by the user service; cost fixed here so every
 * layer agrees) —--------------------------------------------------------- */

export const PASSWORD_COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, PASSWORD_COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * A real cost-12 bcrypt hash of a throw-away string. Login compares against it
 * when the e-mail is unknown, so "no such account" costs the same ~250 ms as
 * "wrong password" and the response time does not reveal which one it was.
 */
export const TIMING_EQUALISER_HASH = "$2b$12$TOyscqYol/zoCqW220RFEOz/z2f84.wK0.QXDVV/DhTR1VMsD6rWi";

export type SanitizedUser = {
  id: Types.ObjectId;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  emailVerified: boolean;
};

export function sanitizeUser(user: User): SanitizedUser {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
  };
}
