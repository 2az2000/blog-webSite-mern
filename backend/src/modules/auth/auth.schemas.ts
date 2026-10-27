/**
 * Request validation for the auth module. Zod strips unknown keys —
 * `isAdmin` in a register payload cannot reach the model (the ADR-necessary
 * fix for the `User.create(req.body)` hole).
 */
import { z } from "zod";
import { OTP_PATTERN } from "../../services/otp.service.js";

/** Min 8 chars, at least one letter and one digit (the form's own rule). */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .refine((v) => /[A-Za-z]/.test(v), { message: "Password must contain a letter" })
  .refine((v) => /\d/.test(v), { message: "Password must contain a digit" });

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

export const nameSchema = z.string().trim().min(2, "Name must be at least 2 characters").max(80);

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(128),
});

export const verifyEmailSchema = z.object({
  email: emailSchema,
  code: z.string().trim().toUpperCase().regex(OTP_PATTERN, "Code must be 6 letters or digits"),
});

export const verifyEmailResendSchema = z.object({
  email: emailSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/, "Reset token is invalid"),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  password: passwordSchema,
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required").max(128),
});

export const updateProfileSchema = z.object({
  name: nameSchema,
});export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
