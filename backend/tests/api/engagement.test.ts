/**
 * What readers do, over real HTTP: be counted, like, save, collect, follow,
 * look back, and report a broken link.
 *
 * Run: `npm run test:api`
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongod: MongoMemoryServer | undefined;
let api: ReturnType<typeof request>;

const BROWSER = "Mozilla/5.0 (test) AppleWebKit/537.36 Chrome/120";
type Who = "ann" | "ben" | "editor";
const tokens = {} as Record<Who, string>;
const ids = {} as Record<Who, string>;

const as = (who: Who) => ({ Authorization: `Bearer ${tokens[who]}` });
const get = (path: string, who: Who) => api.get(`/api/v1${path}`).set(as(who));
const put = (path: string, who: Who) => api.put(`/api/v1${path}`).set(as(who));
const del = (path: string, who: Who) => api.delete(`/api/v1${path}`).set(as(who));
const post = (path: string, who: Who, body?: object) => api.post(`/api/v1${path}`).set(as(who)).send(body);

/** An anonymous visit from a given "browser". */
const visit = (slug: string, action: "view" | "read", ua = BROWSER, ip = "203.0.113.7") =>
  api.post(`/api/v1/articles/${slug}/${action}`).set("User-Agent", ua).set("X-Forwarded-For", ip);

const publicArticle = async (slug: string) => (await api.get(`/api/v1/articles/${slug}`).expect(200)).body.data.article;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URL = mongod.getUri("nova-engagement-tests");

  const { connectDb } = await import("../../src/db/connect.js");
  await connectDb();
  const { seedContent } = await import("../../src/modules/content/content.seed.js");
  await seedContent();

  const { UserModel } = await import("../../src/models/user.model.js");
  const { signAccessToken } = await import("../../src/http/auth.js");
  for (const who of ["ann", "ben", "editor"] as const) {
    const role = who === "editor" ? "editor" : "reader";
    const user = await UserModel.create({ name: who, email: `${who}@example.com`, passwordHash: "x".repeat(60), role, emailVerified: true });
    ids[who] = user._id.toString();
    tokens[who] = signAccessToken(ids[who], role);
  }

  const { createApp } = await import("../../src/app.js");
  api = request(createApp());
}, 120_000);

afterAll(async () => {
  const { disconnectDb } = await import("../../src/db/connect.js");
  await disconnectDb();
  await mongod?.stop();
});

describe("views", () => {
  it("counts a visitor once a day, however often they refresh", async () => {
    const before = (await publicArticle("quiet-office")).views;
    expect((await visit("quiet-office", "view").expect(200)).body.data.counted).toBe(true);
    expect((await visit("quiet-office", "view").expect(200)).body.data.counted).toBe(false);
    expect((await publicArticle("quiet-office")).views).toBe(before + 1);
    // a different visitor is a different view
    expect((await visit("quiet-office", "view", BROWSER, "198.51.100.9").expect(200)).body.data.counted).toBe(true);
    expect((await publicArticle("quiet-office")).views).toBe(before + 2);
  });

  it("does not count crawlers, previews or requests with no browser", async () => {
    const before = (await publicArticle("slow-fashion")).views;
    expect((await visit("slow-fashion", "view", "Googlebot/2.1").expect(200)).body.data.counted).toBe(false);
    expect((await visit("slow-fashion", "view", "").expect(200)).body.data.counted).toBe(false);
    expect((await publicArticle("slow-fashion")).views).toBe(before);
  });

  it("leaves the article's updatedAt alone — a view is not an edit", async () => {
    const { ArticleModel } = await import("../../src/models/article.model.js");
    const before = await ArticleModel.findOne({ slug: "city-night" }, { updatedAt: 1 }).lean<{ updatedAt: Date }>();
    await visit("city-night", "view", BROWSER, "192.0.2.50").expect(200);
    const after = await ArticleModel.findOne({ slug: "city-night" }, { updatedAt: 1 }).lean<{ updatedAt: Date }>();
    expect(after?.updatedAt.getTime()).toBe(before?.updatedAt.getTime());
  });

  it("404s for an unknown story and never counts a draft", async () => {
    await visit("nope", "view").expect(404);
    const { ArticleModel } = await import("../../src/models/article.model.js");
    await ArticleModel.updateOne({ slug: "remote-labs" }, { status: "draft" });
    await visit("remote-labs", "view").expect(404);
    await ArticleModel.updateOne({ slug: "remote-labs" }, { status: "published" });
  });

  it("is private to the caller: never cached", async () => {
    const res = await visit("quiet-office", "view", BROWSER, "192.0.2.77").expect(200);
    expect(res.headers["cache-control"]).toBe("no-store");
  });
});

describe("finished reads and the trending board", () => {
  it("counts a finished read once, and ranks the story on the board", async () => {
    const before = await publicArticle("chip-shortage");
    const first = await visit("chip-shortage", "read", BROWSER, "192.0.2.10").expect(200);
    expect(first.body.data.counted).toBe(true);
    expect((await visit("chip-shortage", "read", BROWSER, "192.0.2.10").expect(200)).body.data.counted).toBe(false);

    const { ArticleModel } = await import("../../src/models/article.model.js");
    expect((await ArticleModel.findOne({ slug: "chip-shortage" }, { readCount: 1 }).lean())?.readCount).toBe(1);
    // the read also counted as the day's view
    expect((await publicArticle("chip-shortage")).views).toBe(before.views + 1);

    const board = (await api.get("/api/v1/trending?limit=3").expect(200)).body.data;
    expect(board[0].slug).toBe("chip-shortage"); // finished reads outrank raw views
    expect(board).toHaveLength(3);
  });

  it("falls back to total views for the rest of the board", async () => {
    const board = (await api.get("/api/v1/trending?limit=5").expect(200)).body.data;
    expect(board).toHaveLength(5);
    expect(new Set(board.map((a: { slug: string }) => a.slug)).size).toBe(5);
  });
});

describe("engagement summary", () => {
  it("shows counts to everyone and the viewer's own state to a signed-in reader", async () => {
    const anon = (await api.get("/api/v1/articles/context-software/engagement").expect(200)).body.data;
    expect(anon.viewer).toBeNull();
    expect(anon).toMatchObject({ likes: 0, comments: expect.any(Number), views: expect.any(Number) });

    await put("/articles/context-software/like", "ann").expect(200);
    await put("/me/bookmarks/context-software", "ann").expect(200);
    const mine = (await get("/articles/context-software/engagement", "ann").expect(200)).body.data;
    expect(mine.viewer).toEqual({ liked: true, bookmarked: true });
    expect(mine.likes).toBe(1);
    const other = (await get("/articles/context-software/engagement", "ben").expect(200)).body.data;
    expect(other.viewer).toEqual({ liked: false, bookmarked: false });

    await del("/articles/context-software/like", "ann").expect(200);
    await del("/me/bookmarks/context-software", "ann").expect(200);
  });

  it("treats a broken session as anonymous rather than failing the page", async () => {
    const res = await api.get("/api/v1/articles/context-software/engagement").set("Authorization", "Bearer garbage").expect(200);
    expect(res.body.data.viewer).toBeNull();
  });
});

describe("likes", () => {
  it("needs an account", async () => {
    await api.put("/api/v1/articles/human-brain/like").expect(401);
  });

  it("moves the count only when the fact changes", async () => {
    expect((await put("/articles/human-brain/like", "ann").expect(200)).body.data).toEqual({ liked: true, likes: 1 });
    expect((await put("/articles/human-brain/like", "ann").expect(200)).body.data.likes).toBe(1); // a second click
    expect((await put("/articles/human-brain/like", "ben").expect(200)).body.data.likes).toBe(2);
    expect((await del("/articles/human-brain/like", "ann").expect(200)).body.data).toEqual({ liked: false, likes: 1 });
    expect((await del("/articles/human-brain/like", "ann").expect(200)).body.data.likes).toBe(1);
    await del("/articles/human-brain/like", "ben").expect(200);
  });

  it("404s for an unknown story", async () => {
    await put("/articles/nope/like", "ann").expect(404);
    const bad = await put("/articles/Not%20A%20Slug/like", "ann").expect(400);
    expect(bad.body.error.code).toBe("INVALID_SLUG");
  });
});

describe("reading list", () => {
  it("saves once, lists newest first with the full summaries, and removes", async () => {
    await put("/me/bookmarks/think-better", "ann").expect(200);
    await put("/me/bookmarks/think-better", "ann").expect(200); // idempotent
    await put("/me/bookmarks/type-revival", "ann").expect(200);
    const res = (await get("/me/bookmarks", "ann").expect(200)).body;
    expect(res.data.map((a: { slug: string }) => a.slug)).toEqual(["type-revival", "think-better"]);
    expect(res.data[0]).toHaveProperty("authorRef");
    expect(res.page.total).toBe(2);

    await del("/me/bookmarks/think-better", "ann").expect(200);
    expect((await get("/me/bookmarks", "ann").expect(200)).body.page.total).toBe(1);
    // each reader has their own list
    expect((await get("/me/bookmarks", "ben").expect(200)).body.page.total).toBe(0);
    await del("/me/bookmarks/type-revival", "ann").expect(200);
  });

  it("refuses to save what does not exist, and needs an account", async () => {
    await put("/me/bookmarks/nope", "ann").expect(404);
    await api.get("/api/v1/me/bookmarks").expect(401);
  });

  it("merges a browser's local list on sign-in: skips unknown and already-saved, keeps the order", async () => {
    await put("/me/bookmarks/ocean-floor", "ben").expect(200);
    const res = await post("/me/bookmarks/sync", "ben", {
      slugs: ["grid-rebuild", "nope", "ocean-floor", "open-source-money", "grid-rebuild"],
    }).expect(200);
    expect(res.body.data.added).toBe(2);
    const list = (await get("/me/bookmarks", "ben").expect(200)).body.data.map((a: { slug: string }) => a.slug);
    // the first slug of the local list is the newest; the one saved before sync is the oldest
    expect(list).toEqual(["grid-rebuild", "open-source-money", "ocean-floor"]);

    expect((await post("/me/bookmarks/sync", "ben", { slugs: ["grid-rebuild"] }).expect(200)).body.data.added).toBe(0);
    await post("/me/bookmarks/sync", "ben", { slugs: Array.from({ length: 201 }, () => "x") }).expect(400);
  });
});

describe("collections", () => {
  let id = "";

  it("creates, fills, shows and renames a collection", async () => {
    const made = (await post("/me/collections", "ann", { name: "For the train" }).expect(201)).body.data;
    id = made.id;
    expect(made).toMatchObject({ name: "For the train", count: 0 });

    await put(`/me/collections/${id}/articles/think-better`, "ann").expect(200);
    const second = (await put(`/me/collections/${id}/articles/attention-economy`, "ann").expect(200)).body.data;
    expect(second.count).toBe(2);
    expect((await put(`/me/collections/${id}/articles/attention-economy`, "ann").expect(200)).body.data.count).toBe(2); // idempotent

    const detail = (await get(`/me/collections/${id}`, "ann").expect(200)).body.data;
    expect(detail.articles.map((a: { slug: string }) => a.slug)).toEqual(["think-better", "attention-economy"]);

    const renamed = (await api.patch(`/api/v1/me/collections/${id}`).set(as("ann")).send({ name: "Weekend" }).expect(200)).body.data;
    expect(renamed.name).toBe("Weekend");
    expect((await get("/me/collections", "ann").expect(200)).body.data).toHaveLength(1);
  });

  it("is private, and validates", async () => {
    await get(`/me/collections/${id}`, "ben").expect(404);
    await del(`/me/collections/${id}`, "ben").expect(404);
    expect((await get("/me/collections/not-an-id", "ann").expect(400)).body.error.code).toBe("INVALID_ID");
    await post("/me/collections", "ann", { name: "" }).expect(400);
    await put(`/me/collections/${id}/articles/nope`, "ann").expect(404);
  });

  it("removes an article and deletes the collection", async () => {
    expect((await del(`/me/collections/${id}/articles/think-better`, "ann").expect(200)).body.data.count).toBe(1);
    await del(`/me/collections/${id}`, "ann").expect(204);
    await get(`/me/collections/${id}`, "ann").expect(404);
  });

  it("caps how many collections a reader can keep", async () => {
    for (let i = 0; i < 20; i += 1) await post("/me/collections", "ben", { name: `List ${i}` }).expect(201);
    const full = await post("/me/collections", "ben", { name: "One too many" }).expect(409);
    expect(full.body.error.code).toBe("LIST_FULL");
  });
});

describe("follows", () => {
  it("follows an author and a topic, and counts followers on the public page", async () => {
    expect((await put("/me/follows/author/duarte", "ann").expect(200)).body.data).toEqual({ following: true, followers: 1 });
    await put("/me/follows/author/duarte", "ann").expect(200); // idempotent
    expect((await put("/me/follows/author/duarte", "ben").expect(200)).body.data.followers).toBe(2);
    await put("/me/follows/topic/artificial-intelligence", "ann").expect(200);

    expect((await api.get("/api/v1/authors/duarte").expect(200)).body.data.followers).toBe(2);
    expect((await api.get("/api/v1/topics/artificial-intelligence").expect(200)).body.data.followers).toBe(1);

    const mine = (await get("/me/follows", "ann").expect(200)).body.data;
    expect(mine.authors).toEqual([{ slug: "duarte", name: "Elena Duarte" }]);
    expect(mine.topics[0].slug).toBe("artificial-intelligence");
  });

  it("unfollows, and refuses what does not exist", async () => {
    expect((await del("/me/follows/author/duarte", "ann").expect(200)).body.data).toEqual({ following: false, followers: 1 });
    await del("/me/follows/author/duarte", "ben").expect(200);
    await put("/me/follows/author/nobody", "ann").expect(404);
    const bad = await put("/me/follows/podcast/x", "ann").expect(400);
    expect(bad.body.error.code).toBe("INVALID_FOLLOW_KIND");
  });
});

describe("recently viewed", () => {
  it("remembers what a signed-in reader opened, newest first, and forgets on request", async () => {
    const view = (slug: string) => api.post(`/api/v1/articles/${slug}/view`).set(as("ann")).set("User-Agent", BROWSER).expect(200);
    await view("founder-mode");
    await new Promise((r) => setTimeout(r, 20));
    await view("public-transit");
    expect((await view("founder-mode")).body.data.counted).toBe(false); // the same day: not a second view

    const list = (await get("/me/history", "ann").expect(200)).body.data;
    expect(list.map((a: { slug: string }) => a.slug)).toEqual(["founder-mode", "public-transit"]);
    expect(list[0].viewedAt).toBeTruthy();
    expect(list[0]).toHaveProperty("authorRef");

    await del("/me/history", "ann").expect(204);
    expect((await get("/me/history", "ann").expect(200)).body.data).toEqual([]);
    // forgetting does not make the next visit a new view
    expect((await view("founder-mode")).body.data.counted).toBe(false);
  });

  it("keeps anonymous visitors out of anyone's history", async () => {
    expect((await get("/me/history", "ben").expect(200)).body.data).toEqual([]);
  });
});

describe("broken links", () => {
  it("collects reports by path and counts repeats", async () => {
    await api.post("/api/v1/reports/broken-link").send({ path: "/article/old-story?utm=x", referrer: "https://example.com/list" }).expect(202);
    await api.post("/api/v1/reports/broken-link").send({ path: "/article/old-story" }).expect(202);
    const list = (await get("/admin/reports", "editor").expect(200)).body;
    expect(list.data).toHaveLength(1);
    expect(list.data[0]).toMatchObject({ path: "/article/old-story", count: 2, resolved: false });
  });

  it("refuses what is not a page address", async () => {
    await api.post("/api/v1/reports/broken-link").send({ path: "no-slash" }).expect(400);
    const api404 = await api.post("/api/v1/reports/broken-link").send({ path: "/api/v1/x" }).expect(400);
    expect(api404.body.error.code).toBe("INVALID_PATH");
  });

  it("is for editors to read and resolve", async () => {
    await get("/admin/reports", "ann").expect(403);
    const [report] = (await get("/admin/reports", "editor").expect(200)).body.data;
    await post(`/admin/reports/${report.id}/resolve`, "editor").expect(204);
    expect((await get("/admin/reports", "editor").expect(200)).body.data).toHaveLength(0);
    expect((await get("/admin/reports?resolved=true", "editor").expect(200)).body.data).toHaveLength(1);
    // a fresh report reopens it
    await api.post("/api/v1/reports/broken-link").send({ path: "/article/old-story" }).expect(202);
    expect((await get("/admin/reports", "editor").expect(200)).body.data).toHaveLength(1);
  });
});

describe("deleting an account", () => {
  it("takes the reader's likes off the counters and removes their data", async () => {
    const { LikeModel } = await import("../../src/models/like.model.js");
    const { BookmarkModel } = await import("../../src/models/bookmark.model.js");
    const { FollowModel } = await import("../../src/models/follow.model.js");
    const { CollectionModel } = await import("../../src/models/collection.model.js");
    const { purgeReaderData } = await import("../../src/modules/engagement/engagement.service.js");
    const { Types } = await import("mongoose");

    await put("/articles/battery-chemistry/like", "ann").expect(200);
    await put("/articles/battery-chemistry/like", "ben").expect(200);
    await put("/me/bookmarks/battery-chemistry", "ann").expect(200);
    await put("/me/follows/topic/climate", "ann").expect(200);

    await purgeReaderData(new Types.ObjectId(ids.ann));

    expect((await api.get("/api/v1/articles/battery-chemistry/engagement").expect(200)).body.data.likes).toBe(1);
    const mine = { user: new Types.ObjectId(ids.ann) };
    expect(await LikeModel.countDocuments(mine)).toBe(0);
    expect(await BookmarkModel.countDocuments(mine)).toBe(0);
    expect(await FollowModel.countDocuments(mine)).toBe(0);
    expect(await CollectionModel.countDocuments(mine)).toBe(0);
    expect(await LikeModel.countDocuments({ user: new Types.ObjectId(ids.ben) })).toBeGreaterThan(0);
  });
});
