/**
 * Route map for `/api/v1/auth`. Route-local rate limits (brute force,
 * e-mail spam) wrap the validators; `me` endpoints sit behind requireAuth.
 */
import { Router } from "express";
import { authController } from "./auth.controller.js";
import {
  changePasswordSchema,
  deleteAccountSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyEmailResendSchema,
  verifyEmailSchema,
} from "./auth.schemas.js";
import { validate } from "../../http/validate.js";
import { requireAuth } from "../../http/auth.js";
import { presets, rateLimit } from "../../services/rate-limit/limiter.js";

export const authRouter = Router();

/* — public — */
authRouter.post("/register", rateLimit(presets.authRegister), validate(registerSchema), authController.register);
authRouter.post("/login", rateLimit(presets.authLogin), validate(loginSchema), authController.login);
authRouter.post(
  "/verify-email",
  rateLimit(presets.authVerify),
  validate(verifyEmailSchema),
  authController.verifyEmail,
);
authRouter.post(
  "/verify-email/resend",
  rateLimit(presets.authVerifyResend),
  validate(verifyEmailResendSchema),
  authController.verifyEmailResend,
);
authRouter.post(
  "/forgot-password",
  rateLimit(presets.authForgot),
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);
authRouter.post(
  "/reset-password",
  rateLimit(presets.authReset),
  validate(resetPasswordSchema),
  authController.resetPassword,
);
authRouter.post("/refresh", rateLimit(presets.authRefresh), authController.refresh);
authRouter.post("/logout", rateLimit(presets.authRefresh), authController.logout);

/* — authenticated — */
authRouter.get("/me", requireAuth, authController.me);
authRouter.get("/me/export", requireAuth, authController.exportData);
authRouter.get("/me/sessions", requireAuth, authController.devices);
authRouter.post("/me/sessions/sign-out-others", requireAuth, authController.signOutOtherDevices);
authRouter.delete("/me/sessions/:id", requireAuth, authController.signOutDevice);
authRouter.patch("/me/profile", requireAuth, validate(updateProfileSchema), authController.updateName);
authRouter.post("/me/change-password", requireAuth, validate(changePasswordSchema), authController.changePassword);
authRouter.delete("/me", requireAuth, validate(deleteAccountSchema), authController.deleteAccount);
