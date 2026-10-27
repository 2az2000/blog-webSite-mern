/**
 * The whole auth journey, over real HTTP (supertest) against an
 * in-memory MongoDB (mongodb-memory-server).
 *
 * Covers: health, register (incl. the isAdmin forgery regression),
 * verify-email (wrong + right code), login + me, refresh + reuse detection,
 * logout, change-password, forgot/reset (single use), profile update,
 * account deletion, validation and error envelopes.
 *
 * Run: `npm run test:api`
 */
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import type { Express } from "express";
import request from "supertest";
import type { mailOutbox as mailOutboxType } from "../../src/services/email/email.service.js";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongod: MongoMemoryServer | undefined;
let app: Express;
let api: ReturnType<typeof request>;
/* Loaded in beforeAll: importing it earlier would freeze `env` before MONGO_URL is set. */
let mailOutbox: typeof mailOutboxType;

const EMAIL = "reader@example.com";
const PASSWORD = "correct-horse-1";
const PASSWORD_2 = "battery-staple-2";

/* — helpers ————————————————————————————————————————— */

function cookieOf(res: { headers: Record<string, unknown> }, name: string): string | undefined {
  const raw = (res.headers["set-cookie"] as string[] | undefined) ?? [];
  for (const cookie of raw) {
    if (cookie.startsWith(`${name}=`)) return cookie.split(";")[0];
  }
  return undefined;
}

/** Latest 6-character verification code from the console-mail outbox. */
function lastVerificationCode(): string {
  for (const mail of [...mailOutbox()].reverse()) {
    if (mail.subject.startsWith("کد تأیید")) {
      const match = mail.text.match(/\b([A-HJ-NP-Z2-9]{6})\b/);
      if (match?.[1]) return match[1];
    }
  }
  throw new Error("no verification mail in outbox");
}

/** Latest reset token (64 hex) from the console-mail outbox. */
function lastResetToken(): string {
  for (const mail of [...mailOutbox()].reverse()) {
    if (mail.subject.includes("بازیابی")) {
      const match = mail.text.match(/reset=([a-f0-9]{64})/);
      if (match?.[1]) return match[1];
    }
  }
  throw new Error("no reset mail in outbox");
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URL = mongod.getUri("nova-auth-tests");

  ({ mailOutbox } = await import("../../src/services/email/email.service.js"));
  const { connectDb } = await import("../../src/db/connect.js");
  await connectDb();

  const { createApp } = await import("../../src/app.js");
  app = createApp();

  api = request(app);

  await api.get("/api/v1/health").expect(200);
}, 120_000);

afterAll(async () => {
  const { disconnectDb } = await import("../../src/db/connect.js");
  await disconnectDb();
  await mongod?.stop();
});

/* — the journey ————————————————————————————————————— */

describe("auth flow", () => {
  it("health is open", async () => {
    const res = await api.get("/api/v1/health").expect(200);
    expect(res.body.data.status).toBe("ok");
  });

  it("registers and e-mails a 6-character code", async () => {
    const res = await api
      .post("/api/v1/auth/register")
      .send({ name: "Reza Reader", email: EMAIL, password: PASSWORD })
      .expect(201);

    expect(res.body.data.user.email).toBe(EMAIL);
    expect(res.body.data.next).toBe("verify-email");
    expect(lastVerificationCode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });

  it("a forged isAdmin in the payload cannot change the role", async () => {
    await api
      .post("/api/v1/auth/register")
      .send({ name: "Evil Admin", email: "evil@example.com", password: "forgery-99", isAdmin: true, role: "admin" })
      .expect(201);

    const { UserModel } = await import("../../src/models/user.model.js");
    const evil = await UserModel.findOne({ email: "evil@example.com" });
    expect(evil?.role).toBe("reader");
  });

  it("registering the same address again re-sends, not 409", async () => {
    const res = await api.post("/api/v1/auth/register").send({ name: "Reza Reader", email: EMAIL, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.resent).toBe(true);
    expect(lastVerificationCode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });

  it("rejects an unverified login with EMAIL_NOT_VERIFIED", async () => {
    const res = await api.post("/api/v1/auth/login").send({ email: EMAIL, password: PASSWORD }).expect(403);
    expect(res.body.error.code).toBe("EMAIL_NOT_VERIFIED");
  });

  it("a wrong code fails VERIFY_FAILED", async () => {
    const res = await api.post("/api/v1/auth/verify-email").send({ email: EMAIL, code: "ZZZZZZ" }).expect(400);
    expect(res.body.error.code).toBe("VERIFY_FAILED");
  });

  it("the right code verifies", async () => {
    await api
      .post("/api/v1/auth/verify-email")
      .send({ email: EMAIL, code: lastVerificationCode() })
      .expect(200);
  });

  let refreshCookie: string | undefined;

  it("login sets both cookies and /me reads them", async () => {
    const res = await api.post("/api/v1/auth/login").send({ email: EMAIL, password: PASSWORD }).expect(200);

    expect(cookieOf(res, "nova_at")?.startsWith("nova_at=")).toBe(true);
    refreshCookie = cookieOf(res, "nova_rt");
    expect(refreshCookie?.startsWith("nova_rt=")).toBe(true);

    const me = await api
      .get("/api/v1/auth/me")
      .set("Cookie", cookieOf(res, "nova_at")!)
      .expect(200);
    expect(me.body.data.user.email).toBe(EMAIL);
    expect(me.body.data.user).not.toHaveProperty("passwordHash");
  });

  it("/me without cookies is 401", async () => {
    await api.get("/api/v1/auth/me").expect(401);
  });

  it("wrong password is INVALID_CREDENTIALS (one answer whether or not the account exists)", async () => {
    await api.post("/api/v1/auth/login").send({ email: EMAIL, password: "wrong-password-1" }).expect(401);
    await api.post("/api/v1/auth/login").send({ email: "ghost@example.com", password: "wrong-password-1" }).expect(401);
  });

  it("refresh rotates: the old token dies, the new one works", async () => {
    const rotated = await api.post("/api/v1/auth/refresh").set("Cookie", refreshCookie!).expect(200);
    const newRefresh = cookieOf(rotated, "nova_rt")!;
    expect(newRefresh).not.toBe(refreshCookie);

    // the rotated-away token must no longer grant access
    await api.post("/api/v1/auth/refresh").set("Cookie", refreshCookie!).expect(401);

    refreshCookie = newRefresh;
  });

  it("logout revokes the session and clears cookies", async () => {
    await api.post("/api/v1/auth/logout").set("Cookie", refreshCookie!).expect(200);

    const dead = await api.post("/api/v1/auth/refresh").set("Cookie", refreshCookie!).expect(401);
    expect(((dead.headers["set-cookie"] as unknown as string[]) ?? []).join(",")).toContain("nova_at=;");
  });

  it("rejects a wrong current password when changing it", async () => {
    const login = await api.post("/api/v1/auth/login").send({ email: EMAIL, password: PASSWORD });
    const access = cookieOf(login, "nova_at")!;

    await api
      .post("/api/v1/auth/me/change-password")
      .set("Cookie", access)
      .send({ currentPassword: "nope-not-it", password: PASSWORD_2 })
      .expect(400);
  });

  it("changes the password and the old one stops working", async () => {
    const login = await api.post("/api/v1/auth/login").send({ email: EMAIL, password: PASSWORD });
    const access = cookieOf(login, "nova_at")!;

    await api
      .post("/api/v1/auth/me/change-password")
      .set("Cookie", access)
      .send({ currentPassword: PASSWORD, password: PASSWORD_2 })
      .expect(200);

    await api.post("/api/v1/auth/login").send({ email: EMAIL, password: PASSWORD }).expect(401);
    await api.post("/api/v1/auth/login").send({ email: EMAIL, password: PASSWORD_2 }).expect(200);
  });

  it("forgot-password answers generically and e-mails a reset token", async () => {
    const [ghostRes, realRes] = await Promise.all([
      api.post("/api/v1/auth/forgot-password").send({ email: "ghost@nope.io" }),
      api.post("/api/v1/auth/forgot-password").send({ email: EMAIL }),
    ]);

    expect(ghostRes.status).toBe(realRes.status);
    expect(lastResetToken()).toMatch(/^[a-f0-9]{64}$/);
  });

  it("the reset token sets a new password once, then dies", async () => {
    const token = lastResetToken();
    await api.post("/api/v1/auth/reset-password").send({ token, password: "third-draft-3" }).expect(200);

    // already consumed → invalid
    await api.post("/api/v1/auth/reset-password").send({ token, password: "fourth-draft-4" }).expect(400);

    await api.post("/api/v1/auth/login").send({ email: EMAIL, password: PASSWORD_2 }).expect(401);
    await api.post("/api/v1/auth/login").send({ email: EMAIL, password: "third-draft-3" }).expect(200);
  });

  it("updates the profile name", async () => {
    const login = await api.post("/api/v1/auth/login").send({ email: EMAIL, password: "third-draft-3" });
    const access = cookieOf(login, "nova_at")!;

    const res = await api
      .patch("/api/v1/auth/me/profile")
      .set("Cookie", access)
      .send({ name: "Reza Updated" })
      .expect(200);
    expect(res.body.data.user.name).toBe("Reza Updated");
  });

  it("deletes the account and everything with it", async () => {
    const login = await api.post("/api/v1/auth/login").send({ email: EMAIL, password: "third-draft-3" });
    const access = cookieOf(login, "nova_at")!;

    // the session alone is not enough: the password must be confirmed
    await api.delete("/api/v1/auth/me").set("Cookie", access).send({ password: "not-my-password-1" }).expect(400);
    await api.get("/api/v1/auth/me").set("Cookie", access).expect(200);

    await api.delete("/api/v1/auth/me").set("Cookie", access).send({ password: "third-draft-3" }).expect(204);
    await api.get("/api/v1/auth/me").set("Cookie", access).expect(401);
    await api.post("/api/v1/auth/login").send({ email: EMAIL, password: "third-draft-3" }).expect(401);
  });

  describe("hardening", () => {
    const register = (email: string, password: string) =>
      api.post("/api/v1/auth/register").send({ name: "Some Reader", email, password });

    it("a second registration replaces the first password (no pre-registration takeover)", async () => {
      const email = "victim@example.com";
      await register(email, "attacker-pass-1").expect(201);
      await register(email, "victim-pass-22").expect(200);

      await api.post("/api/v1/auth/verify-email").send({ email, code: lastVerificationCode() }).expect(200);

      await api.post("/api/v1/auth/login").send({ email, password: "attacker-pass-1" }).expect(401);
      await api.post("/api/v1/auth/login").send({ email, password: "victim-pass-22" }).expect(200);
    });

    it("five wrong codes burn the code, even the right one", async () => {
      const email = "locked@example.com";
      await register(email, "locked-pass-11").expect(201);
      const right = lastVerificationCode();

      for (let i = 0; i < 5; i++) {
        await api.post("/api/v1/auth/verify-email").send({ email, code: right === "ZZZZZZ" ? "AAAAAA" : "ZZZZZZ" }).expect(400);
      }
      const res = await api.post("/api/v1/auth/verify-email").send({ email, code: right }).expect(400);
      expect(res.body.error.code).toBe("VERIFY_FAILED");

      // a fresh code (resend) is the way out
      await api.post("/api/v1/auth/verify-email/resend").send({ email }).expect(200);
      await api.post("/api/v1/auth/verify-email").send({ email, code: lastVerificationCode() }).expect(200);
    });

    it("a refresh race (old token, moments later) is refused without killing the session", async () => {
      const email = "race@example.com";
      await register(email, "race-pass-1234").expect(201);
      await api.post("/api/v1/auth/verify-email").send({ email, code: lastVerificationCode() }).expect(200);

      const login = await api.post("/api/v1/auth/login").send({ email, password: "race-pass-1234" }).expect(200);
      const first = cookieOf(login, "nova_rt")!;

      const rotated = await api.post("/api/v1/auth/refresh").set("Cookie", first).expect(200);
      const second = cookieOf(rotated, "nova_rt")!;

      // the second tab still holds `first`
      const race = await api.post("/api/v1/auth/refresh").set("Cookie", first).expect(401);
      expect(race.body.error.code).toBe("INVALID_REFRESH");

      // the legitimate rotation is untouched
      await api.post("/api/v1/auth/refresh").set("Cookie", second).expect(200);
    });

    it("reusing an old token well after rotation is theft: every session dies", async () => {
      const email = "theft@example.com";
      await register(email, "theft-pass-1234").expect(201);
      await api.post("/api/v1/auth/verify-email").send({ email, code: lastVerificationCode() }).expect(200);

      const login = await api.post("/api/v1/auth/login").send({ email, password: "theft-pass-1234" }).expect(200);
      const stolen = cookieOf(login, "nova_rt")!;
      const rotated = await api.post("/api/v1/auth/refresh").set("Cookie", stolen).expect(200);
      const current = cookieOf(rotated, "nova_rt")!;

      // pretend the rotation happened a minute ago
      const { SessionModel } = await import("../../src/models/session.model.js");
      await SessionModel.updateMany({}, { $set: { rotatedAt: new Date(Date.now() - 60_000) } });

      const reuse = await api.post("/api/v1/auth/refresh").set("Cookie", stolen).expect(401);
      expect(reuse.body.error.code).toBe("REFRESH_REUSE");
      await api.post("/api/v1/auth/refresh").set("Cookie", current).expect(401);
    });

    it("login answers an unknown address and a wrong password with the same body", async () => {
      const a = await api.post("/api/v1/auth/login").send({ email: "nobody@example.com", password: "whatever-123" }).expect(401);
      const b = await api.post("/api/v1/auth/login").send({ email: "victim@example.com", password: "whatever-123" }).expect(401);
      expect(a.body).toEqual(b.body);
    });
  });

  it("bad payloads answer VALIDATION_ERROR with field details", async () => {
    const res = await api
      .post("/api/v1/auth/register")
      .send({ name: "x", email: "not-an-email", password: "nodigits" })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(Array.isArray(res.body.error.details)).toBe(true);
    expect(res.body.error.details.length).toBeGreaterThanOrEqual(2);
  });

  it("malformed JSON gets a clean 400", async () => {
    const res = await api
      .post("/api/v1/auth/login")
      .set("Content-Type", "application/json")
      .send('{"email": not-json}')
      .expect(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
  });

  it("unknown /api routes answer the standard envelope", async () => {
    const res = await api.get("/api/v1/nonexistent").expect(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
