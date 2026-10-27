/**
 * Six-character e-mail verification codes — the shape the reference UI shows
 * ("A7K2QP"). The alphabet drops the look-alikes (0/O, 1/I) so a code read off
 * a phone screen is hard to mistype; 32^6 ≈ 10^9 possibilities. Codes are
 * stored hashed and compared in constant time; the account also locks a code
 * after OTP_MAX_ATTEMPTS wrong tries (see the verify-email controller).
 */
import { createHash, randomInt, timingSafeEqual } from "node:crypto";

export const OTP_TTL_MS = 10 * 60 * 1000; // ten minutes
export const OTP_MAX_ATTEMPTS = 5;

export const OTP_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const OTP_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

export function generateOtp(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += OTP_ALPHABET[randomInt(0, OTP_ALPHABET.length)];
  return code;
}

export function hashOtp(code: string): string {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

export function verifyOtpHash(code: string, storedHash: string): boolean {
  const a = Buffer.from(hashOtp(code));
  const b = Buffer.from(storedHash);
  return a.length === b.length && timingSafeEqual(a, b);
}
