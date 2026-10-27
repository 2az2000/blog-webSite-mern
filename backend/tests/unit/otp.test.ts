import { describe, expect, it } from "vitest";
import { OTP_PATTERN, generateOtp, hashOtp, verifyOtpHash } from "../../src/services/otp.service.js";
import { hashToken, newRefreshToken } from "../../src/services/token.service.js";

describe("otp service", () => {
  it("generates six-character codes without look-alike glyphs", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateOtp();
      expect(code).toMatch(OTP_PATTERN);
      expect(code).not.toMatch(/[01OI]/);
    }
  });

  it("verifies case-insensitively (a code typed in lower case still works)", () => {
    const hash = hashOtp("A7K2QP");
    expect(verifyOtpHash("a7k2qp", hash)).toBe(true);
    expect(verifyOtpHash(" A7K2QP ", hash)).toBe(true);
    expect(verifyOtpHash("A7K2QQ", hash)).toBe(false);
  });

  it("hashes consistently and verifies correctly", () => {
    const code = generateOtp();
    const hash = hashOtp(code);
    expect(hash).not.toBe(code);
    expect(verifyOtpHash(code, hash)).toBe(true);
    expect(verifyOtpHash(generateOtp(), hash)).toBe(false);
  });
});

describe("refresh-token service", () => {
  it("never returns the same opaque token twice", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const t = newRefreshToken();
      expect(seen.has(t)).toBe(false);
      seen.add(t);
    }
  });

  it("hashes tokens to 64-hex", () => {
    const token = newRefreshToken();
    expect(hashToken(token)).toMatch(/^[a-f0-9]{64}$/);
  });
});
