/**
 * Auth flows — register/login/verify, password reset & change, session
 * refresh/logout, account management.
 *
 * Successes render `{ data: … }`; failures leave via thrown AppError and the
 * error middleware renders `{ error: … }`.
 *
 * Machine codes (the front dictionary maps them to localized copy):
 *  EMAIL_TAKEN · EMAIL_NOT_VERIFIED · VERIFY_FAILED · INVALID_CREDENTIALS
 *  INVALID_REFRESH · REFRESH_REUSE · ACCOUNT_NOT_FOUND
 *  WRONG_CURRENT_PASSWORD · SAME_PASSWORD · RESET_TOKEN_INVALID
 */
import { randomBytes } from "node:crypto";
import type { Request, RequestHandler } from "express";
import { OTP_MAX_ATTEMPTS, OTP_TTL_MS, generateOtp, hashOtp, verifyOtpHash } from "../../services/otp.service.js";
import { mailer } from "../../services/email/email.service.js";
import { passwordResetMail, verificationMail } from "../../services/email/templates.js";
import { hashToken } from "../../services/token.service.js";
import {
  createSession,
  findSessionByToken,
  listDevices,
  revokeAllForUser,
  revokeDevice,
  revokeOtherDevices,
  revokeSession,
  rotateSession,
  sessionIdOf,
} from "../../services/session.service.js";
import { badRequest, forbidden, notFound, unauthorized } from "../../http/errors.js";
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from "../../http/cookies.js";
import { signAccessToken } from "../../http/auth.js";
import { purgeCommentData } from "../comments/comments.service.js";
import { exportUserData, purgeSubscription } from "./account-export.service.js";
import { purgeReaderData } from "../engagement/engagement.service.js";
import { TIMING_EQUALISER_HASH, sanitizeUser, verifyPassword } from "../../models/user.model.js";
import {
  checkPassword,
  createUser,
  deleteUserHard,
  findAuthUserByEmail,
  findAuthUserById,
  findSensitiveUserByEmail,
  bumpVerifyAttempts,
  findUserByResetToken,
  getPublicUser,
  markEmailVerified,
  setNewPassword,
  updateUserName,
} from "./user.service.js";
import type {
  ChangePasswordInput,
  DeleteAccountInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateProfileInput,
  VerifyEmailInput,
} from "./auth.schemas.js";

const sessionMeta = (req: Request) => ({
  userAgent: (req.headers["user-agent"] as string | undefined) ?? undefined,
  ip: req.ip,
});

/** Persists a fresh hashed code on the sensitive record and sends the mail. */
async function sendVerificationCode(email: string): Promise<void> {
  const user = await findSensitiveUserByEmail(email);
  if (!user) throw unauthorized("Account no longer exists", "ACCOUNT_NOT_FOUND");

  const code = generateOtp();
  user.emailVerification = {
    codeHash: hashOtp(code),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    sentAt: new Date(),
    attempts: 0,
  };
  await user.save();

  await mailer.send(verificationMail(user.email, code));
}

const RESET_TTL_MS = 60 * 60 * 1000;

/* — Controllers ————————————————————————————————————————— */

const register: RequestHandler = async (req, res) => {
  const input = req.body as RegisterInput;

  const attempt = await createUser(input);

  await sendVerificationCode(attempt.value.email);
  res
    .status(attempt.wasCreated ? 201 : 200)
    .json({ data: { user: attempt.summary, next: "verify-email", resent: !attempt.wasCreated } });
};

const verifyEmail: RequestHandler = async (req, res) => {
  const input = req.body as VerifyEmailInput;
  const sensitive = await findSensitiveUserByEmail(input.email);

  const verification = sensitive?.emailVerification;
  const fail = () => badRequest("That code is wrong or has expired", "VERIFY_FAILED");

  if (
    !sensitive ||
    sensitive.emailVerified ||
    !verification ||
    verification.expiresAt.getTime() <= Date.now() ||
    verification.attempts >= OTP_MAX_ATTEMPTS
  ) {
    throw fail();
  }

  if (!verifyOtpHash(input.code, verification.codeHash)) {
    // The IP rate limit cannot stop a spread-out guess; the code itself locks.
    await bumpVerifyAttempts(sensitive._id);
    throw fail();
  }

  await markEmailVerified(sensitive);
  res.json({ data: { email: sensitive.email, emailVerified: true, next: "signin" } });
};

const verifyEmailResend: RequestHandler = async (req, res) => {
  const input = req.body as { email: string };
  const sensitive = await findSensitiveUserByEmail(input.email);

  // Unknown / already-verified addresses get the identical OK — no enumeration.
  if (sensitive && !sensitive.emailVerified) {
    await sendVerificationCode(sensitive.email);
  }
  res.json({ data: { ok: true } });
};

const login: RequestHandler = async (req, res) => {
  const input = req.body as LoginInput;
  const user = await findAuthUserByEmail(input.email);

  // One identical answer — and one identical cost — whether or not the account exists.
  if (!user) await verifyPassword(input.password, TIMING_EQUALISER_HASH);
  if (!user || !(await checkPassword(user, input.password))) {
    throw unauthorized("Incorrect e-mail or password", "INVALID_CREDENTIALS");
  }

  if (user.status === "suspended") throw forbidden("Account suspended", "ACCOUNT_SUSPENDED");

  if (!user.emailVerified) {
    res.status(403).json({
      error: {
        code: "EMAIL_NOT_VERIFIED",
        message: "Verify your e-mail first — check your inbox or request a new code",
      },
    });
    return;
  }

  const accessToken = signAccessToken(String(user._id), user.role);
  const refreshToken = await createSession(String(user._id), sessionMeta(req));
  setAuthCookies(res, accessToken, refreshToken);

  res.json({ data: { user: sanitizeUser(user) } });
};

const refresh: RequestHandler = async (req, res) => {
  const presented = req.cookies?.[REFRESH_COOKIE] as string | undefined;

  if (typeof presented !== "string" || presented.length < 16) {
    clearAuthCookies(res);
    throw unauthorized("No refresh token", "INVALID_REFRESH");
  }

  let rotated;
  try {
    rotated = await rotateSession(presented, sessionMeta(req));
  } catch (err) {
    clearAuthCookies(res);
    throw err;
  }

  const user = await getPublicUser(rotated.userId);
  if (!user) {
    clearAuthCookies(res);
    throw unauthorized("Account no longer exists", "ACCOUNT_NOT_FOUND");
  }

  setAuthCookies(res, signAccessToken(rotated.userId, user.role), rotated.token);
  res.json({ data: { user } });
};

const logout: RequestHandler = async (req, res) => {
  const presented = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (typeof presented === "string" && presented.length >= 16) {
    const session = await findSessionByToken(presented);
    if (session) await revokeSession(session, "logout");
  }
  clearAuthCookies(res);
  res.json({ data: { ok: true } });
};

/** Mounted behind requireAuth. */
const me: RequestHandler = async (req, res) => {
  const user = await getPublicUser(String(req.auth!.userId));
  if (!user) throw unauthorized("Account no longer exists", "ACCOUNT_NOT_FOUND");
  res.json({ data: { user } });
};

/** PATCH /me/profile — name for now (account settings arrives later). */
const updateName: RequestHandler = async (req, res) => {
  const input = req.body as UpdateProfileInput;
  const user = await updateUserName(String(req.auth!.userId), input.name);
  if (!user) throw unauthorized("Account no longer exists", "ACCOUNT_NOT_FOUND");

  res.json({ data: { user } });
};

/** Mounted behind requireAuth. */
const changePassword: RequestHandler = async (req, res) => {
  const input = req.body as ChangePasswordInput;
  const user = await findAuthUserById(String(req.auth!.userId));
  if (!user) throw unauthorized("Account no longer exists", "ACCOUNT_NOT_FOUND");

  if (!(await checkPassword(user, input.currentPassword))) {
    throw badRequest("Current password is incorrect", "WRONG_CURRENT_PASSWORD");
  }
  if (input.currentPassword === input.password) {
    throw badRequest("The new password must differ from the current one", "SAME_PASSWORD");
  }

  await setNewPassword(user, input.password);
  await revokeAllForUser(String(user._id), "password-change");

  // The current device stays signed in thanks to a brand-new session;
  // every other device must sign in again.
  const accessToken = signAccessToken(String(user._id), user.role);
  const refreshToken = await createSession(String(user._id), sessionMeta(req));
  setAuthCookies(res, accessToken, refreshToken);

  res.json({ data: { ok: true, message: "Password changed; other sessions were signed out" } });
};

const forgotPassword: RequestHandler = async (req, res) => {
  const input = req.body as ForgotPasswordInput;
  const sensitive = await findSensitiveUserByEmail(input.email);

  if (sensitive) {
    const token = randomBytes(32).toString("hex");
    sensitive.passwordReset = {
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    };
    await sensitive.save();
    await mailer.send(passwordResetMail(sensitive.email, token));
  }
  // Identical answer for unknown addresses — no account enumeration.
  res.json({ data: { ok: true } });
};

const resetPassword: RequestHandler = async (req, res) => {
  const input = req.body as ResetPasswordInput;
  const user = await findUserByResetToken(hashToken(input.token));

  if (!user || !user.passwordReset || user.passwordReset.expiresAt.getTime() <= Date.now()) {
    throw badRequest("This reset link is invalid or has expired", "RESET_TOKEN_INVALID");
  }

  await setNewPassword(user, input.password);
  await revokeAllForUser(String(user._id), "password-change");

  res.json({ data: { ok: true, message: "Password updated — sign in with the new password" } });
};

/** The devices signed in to this account; `current` marks the one asking. */
const devices: RequestHandler = async (req, res) => {
  const current = sessionIdOf(req.cookies?.[REFRESH_COOKIE]);
  res.json({ data: await listDevices(String(req.auth!.userId), current) });
};

const signOutDevice: RequestHandler = async (req, res) => {
  const ok = await revokeDevice(String(req.auth!.userId), String(req.params.id));
  if (!ok) throw notFound("That device is not signed in", "DEVICE_NOT_FOUND");
  res.status(204).end();
};

const signOutOtherDevices: RequestHandler = async (req, res) => {
  const signedOut = await revokeOtherDevices(String(req.auth!.userId), sessionIdOf(req.cookies?.[REFRESH_COOKIE]));
  res.json({ data: { signedOut } });
};

/** "Give me my data": everything held about the signed-in reader, as a JSON download. */
const exportData: RequestHandler = async (req, res) => {
  const data = await exportUserData(req.auth!.userId);
  res.setHeader("Content-Disposition", 'attachment; filename="nova-my-data.json"');
  res.setHeader("Cache-Control", "no-store");
  res.json({ data });
};

const deleteAccount: RequestHandler = async (req, res) => {
  const userId = String(req.auth!.userId);
  const input = req.body as DeleteAccountInput;

  // A stolen session cookie must not be enough to destroy the account.
  const user = await findAuthUserById(userId);
  if (!user) throw unauthorized("Account no longer exists", "ACCOUNT_NOT_FOUND");
  if (!(await checkPassword(user, input.password))) {
    throw badRequest("Password is incorrect", "WRONG_CURRENT_PASSWORD");
  }

  await revokeAllForUser(userId, "account-delete");
  await purgeReaderData(req.auth!.userId);
  await purgeCommentData(req.auth!.userId);
  await purgeSubscription(user.email);
  await deleteUserHard(userId);
  clearAuthCookies(res);

  res.status(204).send();
};

export const authController = {
  register,
  verifyEmail,
  verifyEmailResend,
  login,
  refresh,
  logout,
  me,
  updateName,
  changePassword,
  forgotPassword,
  resetPassword,
  exportData,
  devices,
  signOutDevice,
  signOutOtherDevices,
  deleteAccount,
};
