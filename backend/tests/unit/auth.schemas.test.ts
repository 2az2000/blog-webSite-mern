import { describe, expect, it } from "vitest";
import {
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../../src/modules/auth/auth.schemas.js";

describe("register schema", () => {
  it("stays lowercase for e-mails and strips unknown fields", () => {
    const parsed = registerSchema.parse({
      name: "  Amir  ",
      email: "  Visitor@EXAMPLE.com ",
      password: "abcdefgh1",
      isAdmin: true, // must be dropped
      role: "admin", // must be dropped
    });

    expect(parsed.name).toBe("Amir");
    expect(parsed.email).toBe("visitor@example.com");
    expect(parsed.password).toBe("abcdefgh1");
    // zod strips unknown payload keys — a forged isAdmin/role cannot pass through
    expect((parsed as Record<string, unknown>).isAdmin).toBeUndefined();
    expect((parsed as Record<string, unknown>).role).toBeUndefined();
  });

  it("enforces the password policy", () => {
    expect(() => registerSchema.parse({ name: "Amin", email: "a@b.co", password: "short1" })).toThrow();
    expect(() => registerSchema.parse({ name: "Amin", email: "a@b.co", password: "nodigitsatall" })).toThrow();
    expect(() => registerSchema.parse({ name: "Amin", email: "a@b.co", password: "nononono" })).toThrow();
  });

  it("rejects an invalid e-mail structure", () => {
    expect(() => registerSchema.parse({ name: "Amin", email: "not-an-email", password: "abcdefgh1" })).toThrow();
  });
});

describe("login schema", () => {
  it("normalizes e-mail, keeps password raw", () => {
    const parsed = loginSchema.parse({ email: "User@Site.COM", password: "Whatever123" });
    expect(parsed.email).toBe("user@site.com");
    expect(parsed.password).toBe("Whatever123");
  });

  it("demands a non-empty password", () => {
    expect(() => loginSchema.parse({ email: "u@site.com", password: "" })).toThrow();
  });
});

describe("verifyEmail schema", () => {
  it("requires exactly six digits", () => {
    expect(verifyEmailSchema.parse({ email: "a@b.co", code: "A7K2QP" })).toBeTruthy();
    // case and padding are normalised
    expect(verifyEmailSchema.parse({ email: "a@b.co", code: " a7k2qp " }).code).toBe("A7K2QP");
    expect(() => verifyEmailSchema.parse({ email: "a@b.co", code: "A7K2" })).toThrow();
    expect(() => verifyEmailSchema.parse({ email: "a@b.co", code: "ABC123" })).toThrow(); // 1 is not in the alphabet
  });
});

describe("resetPassword schema", () => {
  it("accepts the 64-hex token shape only", () => {
    const token = "a".repeat(64);
    expect(resetPasswordSchema.parse({ token, password: "newpass1" })).toBeTruthy();
    expect(() => resetPasswordSchema.parse({ token: "xyz", password: "newpass1" })).toThrow();
  });
});
