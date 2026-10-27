/**
 * What NOVA records when someone agrees to something: the terms an account was
 * opened under, and the policy text a Dispatch sign-up was made under. Each record
 * names the version of the text, so it can later show what the person agreed to.
 *
 * Run: `npm run test:api`
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongod: MongoMemoryServer | undefined;
let api: ReturnType<typeof request>;
let version = "";

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URL = mongod.getUri("nova-consent-tests");

  const { connectDb } = await import("../../src/db/connect.js");
  await connectDb();
  ({ POLICY_VERSION: version } = await import("../../src/config/legal.js"));
  const { createApp } = await import("../../src/app.js");
  api = request(createApp());
}, 120_000);

afterAll(async () => {
  const { disconnectDb } = await import("../../src/db/connect.js");
  await disconnectDb();
  await mongod?.stop();
});

describe("consent records", () => {
  it("stamps the terms an account was created under", async () => {
    const before = Date.now();
    await api.post("/api/v1/auth/register").send({ name: "Tala Terms", email: "tala@example.com", password: "a-long-passphrase-1" }).expect(201);
    const { UserModel } = await import("../../src/models/user.model.js");
    const user = await UserModel.findOne({ email: "tala@example.com" }).lean();
    expect(user?.terms?.version).toBe(version);
    expect(user!.terms!.acceptedAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it("does not let the client choose which version it accepted", async () => {
    await api
      .post("/api/v1/auth/register")
      .send({ name: "Forger", email: "forger@example.com", password: "a-long-passphrase-1", terms: { version: "1999-01-01" }, termsVersion: "1999-01-01" })
      .expect(201);
    const { UserModel } = await import("../../src/models/user.model.js");
    expect((await UserModel.findOne({ email: "forger@example.com" }).lean())?.terms?.version).toBe(version);
  });

  it("stamps a Dispatch sign-up, and the stamp survives into the reader's own export", async () => {
    await api.post("/api/v1/newsletter/subscribe").send({ email: "tala@example.com", topics: [], frequency: "both", source: "footer" }).expect(202);
    const { SubscriberModel } = await import("../../src/models/newsletter.model.js");
    const row = await SubscriberModel.findOne({ email: "tala@example.com" }).lean();
    expect(row?.consentVersion).toBe(version);
    expect(row?.consentAt).toBeTruthy();

    const { UserModel, hashPassword } = await import("../../src/models/user.model.js");
    await UserModel.updateOne({ email: "tala@example.com" }, { $set: { emailVerified: true, passwordHash: await hashPassword("a-long-passphrase-1") } });
    const login = await api.post("/api/v1/auth/login").send({ email: "tala@example.com", password: "a-long-passphrase-1" }).expect(200);
    const cookie = (login.headers["set-cookie"] as unknown as string[]).map((c) => c.split(";")[0]).join("; ");
    const exported = (await api.get("/api/v1/auth/me/export").set("Cookie", cookie).expect(200)).body.data;
    expect(exported.account.termsAccepted.version).toBe(version);
    expect(exported.dispatchSubscription.consentVersion).toBe(version);
  });

  it("records joining from the account, keeps the original consent when asked twice, and records a return afresh", async () => {
    const { UserModel, hashPassword } = await import("../../src/models/user.model.js");
    await UserModel.create({ name: "Acct", email: "acct@example.com", passwordHash: await hashPassword("a-long-passphrase-1"), emailVerified: true });
    const login = await api.post("/api/v1/auth/login").send({ email: "acct@example.com", password: "a-long-passphrase-1" }).expect(200);
    const cookie = (login.headers["set-cookie"] as unknown as string[]).map((c) => c.split(";")[0]).join("; ");
    const put = (body: object) => api.put("/api/v1/newsletter/mine").set("Cookie", cookie).set("Origin", "http://localhost:3000").send(body).expect(200);
    const { SubscriberModel } = await import("../../src/models/newsletter.model.js");
    const row = () => SubscriberModel.findOne({ email: "acct@example.com" }).lean();

    await put({ subscribed: true });
    const first = await row();
    expect(first?.consentVersion).toBe(version);

    await put({ subscribed: true, frequency: "weekly" });
    expect((await row())?.consentAt.getTime()).toBe(first!.consentAt.getTime());

    await put({ subscribed: false });
    await new Promise((r) => setTimeout(r, 15));
    await put({ subscribed: true });
    expect((await row())!.consentAt.getTime()).toBeGreaterThan(first!.consentAt.getTime());
  });
});
