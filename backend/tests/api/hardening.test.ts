/**
 * Phase 9 over real HTTP: the cross-site request guard, "give me my data", what
 * deleting an account takes with it, and that failures are reported without
 * leaking.
 *
 * Run: `npm run test:api`
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongod: MongoMemoryServer | undefined;
let api: ReturnType<typeof request>;
let userId = "";
let cookie = "";

const SITE = "http://localhost:3000"; // WEB_APP_URL's default, so the same origin the site posts from

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URL = mongod.getUri("nova-hardening-tests");
  process.env.ALLOWED_ORIGINS = "https://www.nova.test, https://nova.test";

  const { connectDb } = await import("../../src/db/connect.js");
  await connectDb();
  const { seedContent } = await import("../../src/modules/content/content.seed.js");
  await seedContent();

  const { UserModel, hashPassword } = await import("../../src/models/user.model.js");
  const user = await UserModel.create({
    name: "Reza Reader",
    email: "reza@example.com",
    passwordHash: await hashPassword("a-long-passphrase-1"),
    emailVerified: true,
  });
  userId = user._id.toString();

  const { createApp } = await import("../../src/app.js");
  api = request(createApp());

  const login = await api.post("/api/v1/auth/login").send({ email: "reza@example.com", password: "a-long-passphrase-1" }).expect(200);
  cookie = (login.headers["set-cookie"] as unknown as string[]).map((c) => c.split(";")[0]).join("; ");
}, 120_000);

afterAll(async () => {
  const { disconnectDb } = await import("../../src/db/connect.js");
  await disconnectDb();
  await mongod?.stop();
});

describe("cross-site request guard", () => {
  const save = () => api.put("/api/v1/me/bookmarks/human-brain").set("Cookie", cookie);

  it("lets the site write, from its own origin", async () => {
    await save().set("Origin", SITE).expect(200);
  });

  it("lets configured extra origins write (a www twin, a custom domain)", async () => {
    await save().set("Origin", "https://www.nova.test").expect(200);
    await save().set("Origin", "https://nova.test").expect(200);
  });

  it("refuses a logged-in write that comes from another site", async () => {
    const res = await save().set("Origin", "https://evil.example").expect(403);
    expect(res.body.error.code).toBe("CSRF_REFUSED");
    await save().set("Origin", "null").expect(403); // a sandboxed frame
    await save().set("Origin", "http://localhost:3000.evil.example").expect(403); // look-alike host
  });

  it("refuses a write the browser itself marks cross-site, even with no Origin", async () => {
    await save().set("Sec-Fetch-Site", "cross-site").expect(403);
    await save().set("Sec-Fetch-Site", "same-origin").expect(200);
  });

  it("covers sign-out and account changes too, not only content", async () => {
    await api.post("/api/v1/auth/logout").set("Cookie", cookie).set("Origin", "https://evil.example").expect(403);
    await api.patch("/api/v1/auth/me/profile").set("Cookie", cookie).set("Origin", "https://evil.example").send({ name: "Hacked" }).expect(403);
  });

  it("does not stand in the way of requests with no session cookie", async () => {
    // a visitor's sign-up, a mail client's one-click unsubscribe, the cron: no ambient credentials to abuse
    await api.post("/api/v1/newsletter/subscribe").set("Origin", "https://evil.example").send({ email: "x@example.com" }).expect(202);
    await api.post("/api/v1/reports/broken-link").set("Origin", "https://evil.example").send({ path: "/nope" }).expect(202);
  });

  it("does not stand in the way of a script that signs in with a token", async () => {
    const { signAccessToken } = await import("../../src/http/auth.js");
    await api.put("/api/v1/me/bookmarks/ai-labour").set("Authorization", `Bearer ${signAccessToken(userId, "reader")}`).set("Origin", "https://evil.example").expect(200);
  });

  it("never blocks reads", async () => {
    await api.get("/api/v1/auth/me").set("Cookie", cookie).set("Origin", "https://evil.example").expect(200);
  });
});

describe("give me my data", () => {
  beforeAll(async () => {
    const post = (path: string, body?: object) => api.post(`/api/v1${path}`).set("Cookie", cookie).set("Origin", SITE).send(body);
    await api.put("/api/v1/articles/quiet-office/like").set("Cookie", cookie).set("Origin", SITE).expect(200);
    await api.put("/api/v1/me/follows/author/duarte").set("Cookie", cookie).set("Origin", SITE).expect(200);
    const col = await post("/me/collections", { name: "For the train" }).expect(201);
    await api.put(`/api/v1/me/collections/${col.body.data.id}/articles/human-brain`).set("Cookie", cookie).set("Origin", SITE).expect(200);
    await post("/articles/human-brain/comments", { body: "A comment worth keeping, long enough to publish." }).expect(201);
    await api.post("/api/v1/articles/context-software/view").set("Cookie", cookie).set("Origin", SITE).set("User-Agent", "Mozilla/5.0 test").expect(200);
    const { SubscriberModel } = await import("../../src/models/newsletter.model.js");
    await SubscriberModel.create({ email: "reza@example.com", status: "confirmed", consentAt: new Date(), frequency: "weekly" });
  });

  it("is for the signed-in reader only", async () => {
    await api.get("/api/v1/auth/me/export").expect(401);
  });

  it("returns everything held about the reader, as a download", async () => {
    const res = await api.get("/api/v1/auth/me/export").set("Cookie", cookie).expect(200);
    expect(res.headers["content-disposition"]).toContain("attachment");
    expect(res.headers["cache-control"]).toBe("no-store");
    const d = res.body.data;
    expect(d.account).toMatchObject({ email: "reza@example.com", name: "Reza Reader" });
    expect(d.savedArticles.map((b: { article: string }) => b.article).sort()).toEqual(["ai-labour", "human-brain"]);
    expect(d.likedArticles[0].article).toBe("quiet-office");
    expect(d.follows[0]).toMatchObject({ kind: "author", slug: "duarte" });
    expect(d.collections[0]).toMatchObject({ name: "For the train", articles: ["human-brain"] });
    expect(d.comments[0].body).toContain("worth keeping");
    expect(d.readingHistory[0].article).toBe("context-software");
    expect(d.dispatchSubscription).toMatchObject({ status: "confirmed", frequency: "weekly" });
    expect(d.sessions.length).toBeGreaterThan(0);
  });

  it("never includes secrets", async () => {
    const text = JSON.stringify((await api.get("/api/v1/auth/me/export").set("Cookie", cookie).expect(200)).body);
    for (const secret of ["passwordHash", "tokenHash", "codeHash", "$2b$", "previousHashes", "confirmTokenHash"]) {
      expect(text).not.toContain(secret);
    }
  });

  it("holds only the reader's own data", async () => {
    const { UserModel, hashPassword } = await import("../../src/models/user.model.js");
    await UserModel.create({ name: "Other", email: "other@example.com", passwordHash: await hashPassword("a-long-passphrase-2"), emailVerified: true });
    const login = await api.post("/api/v1/auth/login").send({ email: "other@example.com", password: "a-long-passphrase-2" }).expect(200);
    const other = (login.headers["set-cookie"] as unknown as string[]).map((c) => c.split(";")[0]).join("; ");
    const d = (await api.get("/api/v1/auth/me/export").set("Cookie", other).expect(200)).body.data;
    expect(d.savedArticles).toEqual([]);
    expect(d.comments).toEqual([]);
    expect(d.dispatchSubscription).toBeNull();
  });
});

describe("deleting an account", () => {
  it("takes the Dispatch subscription on that address with it", async () => {
    const { SubscriberModel } = await import("../../src/models/newsletter.model.js");
    expect(await SubscriberModel.exists({ email: "reza@example.com" })).not.toBeNull();
    await api.delete("/api/v1/auth/me").set("Cookie", cookie).set("Origin", SITE).send({ password: "a-long-passphrase-1" }).expect(204);
    expect(await SubscriberModel.exists({ email: "reza@example.com" })).toBeNull();
  });

  it("and the rest: saves, likes, follows, collections", async () => {
    const { BookmarkModel } = await import("../../src/models/bookmark.model.js");
    const { LikeModel } = await import("../../src/models/like.model.js");
    const { FollowModel } = await import("../../src/models/follow.model.js");
    const { CollectionModel } = await import("../../src/models/collection.model.js");
    const { Types } = await import("mongoose");
    const mine = { user: new Types.ObjectId(userId) };
    expect(await BookmarkModel.countDocuments(mine)).toBe(0);
    expect(await LikeModel.countDocuments(mine)).toBe(0);
    expect(await FollowModel.countDocuments(mine)).toBe(0);
    expect(await CollectionModel.countDocuments(mine)).toBe(0);
  });
});

describe("unexpected failures", () => {
  it("answer a generic 500 that leaks nothing", async () => {
    const { ArticleModel } = await import("../../src/models/article.model.js");
    const original = ArticleModel.find.bind(ArticleModel);
    ArticleModel.find = (() => {
      throw new Error("secret database detail");
    }) as unknown as typeof ArticleModel.find;
    try {
      const res = await api.get("/api/v1/articles").expect(500);
      expect(res.body).toEqual({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
      expect(JSON.stringify(res.body)).not.toContain("secret");
    } finally {
      ArticleModel.find = original;
    }
  });

  it("are reported without throwing when error reporting is off", async () => {
    const { reportError } = await import("../../src/config/sentry.js");
    expect(() => reportError(new Error("x"), { method: "GET", url: "/api/v1/x?token=abc" })).not.toThrow();
  });
});
