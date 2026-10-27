/**
 * User persistence operations — the only module that talks to UserModel.
 * Writes go through explicit fields; `req.body` never reaches Mongo
 * directly, so mass assignment (e.g. a forged `isAdmin`) is impossible.
 */
import { sanitizeUser, UserModel, hashPassword, verifyPassword, type SanitizedUser, type User } from "../../models/user.model.js";
import { conflict, forbidden } from "../../http/errors.js";
import { POLICY_VERSION } from "../../config/legal.js";
import type { Types } from "mongoose";

export type PublicUser = SanitizedUser;
export type PublicUserSummary = { id: string; name: string; email: string };

/** Registering an existing, never-verified address re-sends instead of failing. */
export type RegisterAttempt = {
  wasCreated: boolean;
  value: User;
  summary: PublicUserSummary;
};

function summaryOf(user: User): PublicUserSummary {
  return { id: String(user._id), name: user.name, email: user.email };
}

const SENSITIVE = "+emailVerification +passwordReset";
const CREDENTIAL = "+passwordHash";

/* — finders ———————————————————————————————————————————— */

export async function findUserByEmail(email: string): Promise<User | null> {
  return UserModel.findOne({ email });
}

export async function findAuthUserByEmail(email: string): Promise<User | null> {
  return UserModel.findOne({ email }).select(CREDENTIAL);
}

export async function findSensitiveUserByEmail(email: string): Promise<User | null> {
  return UserModel.findOne({ email }).select(SENSITIVE);
}

export async function findAuthUserById(id: string): Promise<User | null> {
  return UserModel.findById(id).select(CREDENTIAL);
}

export async function findUserByResetToken(tokenHash: string): Promise<User | null> {
  return UserModel.findOne({ "passwordReset.tokenHash": tokenHash }).select(SENSITIVE);
}

export async function getPublicUser(id: string): Promise<PublicUser | null> {
  const user = await UserModel.findById(id);
  return user ? sanitizeUser(user) : null;
}

/* — writes ————————————————————————————————————————————— */

export async function createUser(input: { name: string; email: string; password: string }): Promise<RegisterAttempt> {
  const existing = await findUserByEmail(input.email);

  const passwordHash = await hashPassword(input.password);

  if (existing) {
    if (existing.emailVerified) {
      throw conflict("An account with this e-mail already exists", "EMAIL_TAKEN");
    }
    // Never-verified account: the latest submission wins. Keeping the first
    // password would let whoever registered an address first (without owning
    // it) keep a working login once the real owner verifies it.
    existing.name = input.name;
    existing.passwordHash = passwordHash;
    existing.terms = { acceptedAt: new Date(), version: POLICY_VERSION };
    await existing.save();
    return { wasCreated: false, value: existing, summary: summaryOf(existing) };
  }

  // role / status / emailVerified are schema defaults (reader / active / false)
  // the sign-up form says "by creating an account you agree to the terms": record which terms, and when
  const user = await UserModel.create({
    name: input.name,
    email: input.email,
    passwordHash,
    terms: { acceptedAt: new Date(), version: POLICY_VERSION },
  });
  return { wasCreated: true, value: user, summary: summaryOf(user) };
}

export async function checkPassword(user: User, plain: string): Promise<boolean> {
  return verifyPassword(plain, user.passwordHash);
}

/** Atomic: concurrent wrong guesses cannot undercount. */
export async function bumpVerifyAttempts(id: Types.ObjectId): Promise<void> {
  await UserModel.updateOne({ _id: id }, { $inc: { "emailVerification.attempts": 1 } });
}

export async function markEmailVerified(user: User): Promise<void> {
  user.emailVerified = true;
  user.emailVerification = undefined;
  await user.save();
}

export async function setNewPassword(user: User, plain: string): Promise<void> {
  user.passwordHash = await hashPassword(plain);
  user.passwordReset = undefined;
  await user.save();
}

export async function updateUserName(id: string, name: string): Promise<PublicUser | null> {
  await UserModel.findByIdAndUpdate(id, { name });
  return getPublicUser(id);
}

export async function deleteUserHard(id: string): Promise<void> {
  await UserModel.findByIdAndDelete(id);
}

export function assertActive(user: User): void {
  if (user.status !== "active") {
    throw forbidden("Account suspended", "ACCOUNT_SUSPENDED");
  }
}

export type { Types };
