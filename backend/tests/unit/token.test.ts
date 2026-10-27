import { describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { signAccessToken, verifyAccessToken } from "../../src/http/auth.js";
import { env } from "../../src/config/env.js";

describe("access tokens", () => {
  it("round-trips sub + role", () => {
    const token = signAccessToken("abc123", "writer");
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe("abc123");
    expect(payload.role).toBe("writer");
  });

  it("rejects a foreign secret", () => {
    const token = jwt.sign({ sub: "x", role: "reader" }, "totally-other-secret-value-0123456789", {
      expiresIn: 60,
    });
    expect(() => verifyAccessToken(token)).toThrow();
  });

  it("honours the issuer check", () => {
    const token = jwt.sign({ sub: "x", role: "reader" }, env.accessTokenSecret, { expiresIn: 60 });
    expect(() => verifyAccessToken(token)).toThrow();
  });
});
