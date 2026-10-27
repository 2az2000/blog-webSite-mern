import { describe, expect, it } from "vitest";
import { AppError } from "../../src/http/errors.js";
import { verifyAccessToken } from "../../src/http/auth.js";

describe("AppError", () => {
  it("carries status, code and optional details", () => {
    const err = new AppError(409, "EMAIL_TAKEN", "already exists", { field: "email" });
    expect(err.status).toBe(409);
    expect(err.code).toBe("EMAIL_TAKEN");
    expect(err.details).toEqual({ field: "email" });
    expect(err.name).toBe("AppError");
  });
});

describe("access-token verification errors", () => {
  it("rejects garbage tokens", () => {
    expect(() => verifyAccessToken("garbage.token.value")).toThrow();
  });

  it("rejects empty payloads that are not JWTs", () => {
    expect(() => verifyAccessToken("")).toThrow();
  });
});
