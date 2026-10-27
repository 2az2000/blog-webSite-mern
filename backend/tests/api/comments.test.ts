/**
 * Comments over real HTTP: threads, posting and the hold rules, the single
 * edit, deleting, likes, reports, the moderators' queue, and the article's count.
 *
 * Run: `npm run test:api`
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongod: MongoMemoryServer | undefined;
let api: ReturnType<typeof request>;

type Who = "ann" | "ben" | "cat" | "dan" | "eve" | "editor" | "authorUser";
const WHO: Who[] = ["ann", "ben", "cat", "dan", "eve", "editor", "authorUser"];
const tokens = {} as Record<Who, string>;
const ids = {} as Record<Who, string>;

const as = (who: Who) => ({ Authorization: `Bearer ${tokens[who]}` });
const get = (path: string, who?: Who) => (who ? api.get(`/api/v1${path}`).set(as(who)) : api.get(`/api/v1${path}`));
const post = (path: string, who: Who, body?: object) => api.post(`/api/v1${path}`).set(as(who)).send(body);
const patch = (path: string, who: Who, body: object) => api.patch(`/api/v1${path}`).set(as(who)).send(body);
const put = (path: string, who: Who) => api.put(`/api/v1${path}`).set(as(who));
const del = (path: string, who: Who) => api.delete(`/api/v1${path}`).set(as(who));

const SLUG = "context-software";
const GOOD = "A thoughtful comment that is comfortably long enough.";
let n = 0;
/** A comment text that is long enough and never repeats (duplicates are refused). */
const text = (label = "note") => `${GOOD} (${label} ${(n += 1)})`;

const thread = async (who?: Who, query = "") => (await get(`/articles/${SLUG}/comments${query}`, who).expect(200)).body;
const count = async () => (await api.get(`/api/v1/articles/${SLUG}/engagement`).expect(200)).body.data.comments as number;
const comment = async (who: Who, body = text(), parent?: string) =>
  (await post(`/articles/${SLUG}/comments`, who, { body, ...(parent ? { parent } : {}) }).expect(201)).body.data;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URL = mongod.getUri("nova-comments-tests");

  const { connectDb } = await import("../../src/db/connect.js");
  await connectDb();
  const { seedContent } = await import("../../src/modules/content/content.seed.js");
  await seedContent();

  const { UserModel } = await import("../../src/models/user.model.js");
  const { signAccessToken } = await import("../../src/http/auth.js");
  for (const who of WHO) {
    const role = who === "editor" ? "editor" : "reader";
    const user = await UserModel.create({ name: `${who} Person`, email: `${who}@example.com`, passwordHash: "x".repeat(60), role, emailVerified: true });
    ids[who] = user._id.toString();
    tokens[who] = signAccessToken(ids[who], role);
  }

  // the article's byline belongs to one of the accounts, so its replies carry the Author badge
  const { AuthorModel } = await import("../../src/models/author.model.js");
  await AuthorModel.updateOne({ slug: "duarte" }, { userId: ids.authorUser });

  const { createApp } = await import("../../src/app.js");
  api = request(createApp());
}, 120_000);

afterAll(async () => {
  const { disconnectDb } = await import("../../src/db/connect.js");
  await disconnectDb();
  await mongod?.stop();
});

describe("posting", () => {
  it("needs an account, and an existing story", async () => {
    await api.post(`/api/v1/articles/${SLUG}/comments`).send({ body: GOOD }).expect(401);
    await post("/articles/nope/comments", "ann", { body: GOOD }).expect(404);
  });

  it("publishes a good comment at once, and the article's count moves", async () => {
    const before = await count();
    const c = await comment("ann", text("first"));
    expect(c).toMatchObject({ pending: false, mine: true, likes: 0, edited: false, replies: [] });
    expect(c.author).toMatchObject({ name: "ann Person", initials: "AP" });
    expect(await count()).toBe(before + 1);
  });

  it("holds a short comment and shows it only to its author", async () => {
    const before = await count();
    const c = await comment("ben", "too short");
    expect(c.pending).toBe(true);
    expect(await count()).toBe(before); // held comments are not counted
    const mine = (await thread("ben")).data.map((x: { id: string }) => x.id);
    expect(mine).toContain(c.id);
    expect((await thread()).data.map((x: { id: string }) => x.id)).not.toContain(c.id);
    expect((await thread("cat")).data.map((x: { id: string }) => x.id)).not.toContain(c.id);
  });

  it("holds more than two links, and a first comment with a link", async () => {
    const links = await comment("cat", `${text()} https://a.example https://b.example https://c.example`);
    expect(links.pending).toBe(true);
    const first = await comment("dan", `${text()} https://source.example/report`);
    expect(first.pending).toBe(true);
  });

  it("rejects empty, over-long and duplicate comments", async () => {
    expect((await post(`/articles/${SLUG}/comments`, "ann", { body: "   \n  " }).expect(400)).body.error.code).toBe("EMPTY_COMMENT");
    expect((await post(`/articles/${SLUG}/comments`, "ann", { body: "x".repeat(2001) }).expect(400)).body.error.code).toBe("COMMENT_TOO_LONG");
    const body = text("dup");
    await comment("eve", body);
    expect((await post(`/articles/${SLUG}/comments`, "eve", { body }).expect(409)).body.error.code).toBe("DUPLICATE_COMMENT");
  });

  it("slows a reader who posts too fast", async () => {
    const { env } = await import("../../src/config/env.js");
    const mutable = env as { rateLimitDisabled: boolean };
    mutable.rateLimitDisabled = false; // the suite runs with limits off; this one test wants them
    try {
      for (let i = 0; i < 4; i += 1) await comment("eve"); // plus the one above makes five
      const res = await post(`/articles/${SLUG}/comments`, "eve", { body: text() }).expect(429);
      expect(res.body.error.code).toBe("RATE_LIMITED");
    } finally {
      mutable.rateLimitDisabled = true;
    }
  });

  it("is never cached", async () => {
    expect((await get(`/articles/${SLUG}/comments`)).headers["cache-control"]).toBe("no-store");
  });
});

describe("threads", () => {
  let top: { id: string };

  it("nests replies one level deep and flattens a reply to a reply", async () => {
    top = await comment("ann", text("thread"));
    const r1 = await comment("ben", text("reply"), top.id);
    expect(r1.parent).toBe(top.id);
    const r2 = await comment("cat", text("reply to reply"), r1.id);
    expect(r2.parent).toBe(top.id); // joined the same thread, not a third level

    const found = (await thread()).data.find((c: { id: string }) => c.id === top.id);
    expect(found.replies.map((r: { id: string }) => r.id)).toEqual([r1.id, r2.id]); // oldest first
    expect(found.replies.every((r: { replies: unknown[] }) => r.replies.length === 0)).toBe(true);
  });

  it("badges the article's own author", async () => {
    const reply = await comment("authorUser", text("from the author"), top.id);
    expect(reply.author.badge).toBe("Author");
    expect((await comment("ann", text("ordinary"))).author.badge).toBeUndefined();
  });

  it("sorts by newest, oldest and most liked, and pages", async () => {
    const a = await comment("dan", text("sort-a"));
    await put(`/comments/${a.id}/like`, "ben").expect(200);
    await put(`/comments/${a.id}/like`, "cat").expect(200);

    const newest = (await thread(undefined, "?sort=new")).data;
    const oldest = (await thread(undefined, "?sort=old&limit=50")).data;
    const topSorted = (await thread(undefined, "?sort=top")).data;
    expect(topSorted[0].id).toBe(a.id);
    expect(newest[0].id).toBe(a.id);
    expect(oldest.at(-1).id).toBe(a.id);

    const page1 = await thread(undefined, "?limit=2");
    expect(page1.data).toHaveLength(2);
    expect(page1.page.total).toBeGreaterThan(2);
    expect(page1.page.count).toBe(await count());
  });

  it("refuses a reply to something that is not there or not live", async () => {
    await post(`/articles/${SLUG}/comments`, "ann", { body: text(), parent: "aaaaaaaaaaaaaaaaaaaaaaaa" }).expect(404);
    const held = await comment("ben", "short");
    const res = await post(`/articles/${SLUG}/comments`, "ann", { body: text(), parent: held.id }).expect(409);
    expect(res.body.error.code).toBe("PARENT_UNAVAILABLE");
  });
});

describe("editing", () => {
  it("allows one edit, marks it, and then closes", async () => {
    const c = await comment("cat", text("to edit"));
    expect(c.canEdit).toBe(true);
    const edited = (await patch(`/comments/${c.id}`, "cat", { body: text("edited") }).expect(200)).body.data;
    expect(edited).toMatchObject({ edited: true, canEdit: false });
    const again = await patch(`/comments/${c.id}`, "cat", { body: text("again") }).expect(409);
    expect(again.body.error.code).toBe("EDIT_USED");
  });

  it("is only for the author", async () => {
    const c = await comment("dan", text("not yours"));
    await patch(`/comments/${c.id}`, "ann", { body: text() }).expect(404);
  });

  it("refuses an edit a day after posting", async () => {
    const c = await comment("ben", text("old"));
    const { CommentModel } = await import("../../src/models/comment.model.js");
    const { Types } = await import("mongoose");
    // createdAt is immutable through the model, so age the document with the driver
    await CommentModel.collection.updateOne({ _id: new Types.ObjectId(c.id) }, { $set: { createdAt: new Date(Date.now() - 25 * 3_600_000) } });
    expect((await patch(`/comments/${c.id}`, "ben", { body: text() }).expect(409)).body.error.code).toBe("EDIT_EXPIRED");
  });

  it("holds an edit that turns a comment into link spam, and takes it off the count", async () => {
    const c = await comment("ann", text("innocent"));
    const before = await count();
    const edited = (await patch(`/comments/${c.id}`, "ann", { body: `${text()} https://a.example https://b.example https://c.example` }).expect(200)).body.data;
    expect(edited.pending).toBe(true);
    expect(await count()).toBe(before - 1);
  });
});

describe("deleting", () => {
  it("removes a comment with no replies completely", async () => {
    const before = await count();
    const c = await comment("dan", text("bye"));
    await del(`/comments/${c.id}`, "dan").expect(204);
    expect((await thread(undefined, "?limit=50")).data.map((x: { id: string }) => x.id)).not.toContain(c.id);
    expect(await count()).toBe(before);
  });

  it("keeps an empty slot when replies hang under it", async () => {
    const top = await comment("ann", text("has replies"));
    const reply = await comment("ben", text("reply"), top.id);
    await del(`/comments/${top.id}`, "ann").expect(204);
    const found = (await thread(undefined, "?limit=50")).data.find((x: { id: string }) => x.id === top.id);
    expect(found).toMatchObject({ author: null, body: "", removed: { by: "author" } });
    expect(found.replies.map((r: { id: string }) => r.id)).toEqual([reply.id]);
    // a deleted comment cannot be edited back to life
    expect((await patch(`/comments/${top.id}`, "ann", { body: text() }).expect(409)).body.error.code).toBe("COMMENT_DELETED");
  });

  it("is only for the author", async () => {
    const c = await comment("cat", text("mine"));
    await del(`/comments/${c.id}`, "ann").expect(404);
  });
});

describe("likes", () => {
  it("moves the count only when the fact changes", async () => {
    const c = await comment("ann", text("likeable"));
    expect((await put(`/comments/${c.id}/like`, "ben").expect(200)).body.data).toEqual({ liked: true, likes: 1 });
    expect((await put(`/comments/${c.id}/like`, "ben").expect(200)).body.data.likes).toBe(1);
    expect((await put(`/comments/${c.id}/like`, "cat").expect(200)).body.data.likes).toBe(2);
    const seen = (await thread("ben", "?limit=50")).data.find((x: { id: string }) => x.id === c.id);
    expect(seen).toMatchObject({ liked: true, likes: 2 });
    expect((await del(`/comments/${c.id}/like`, "ben").expect(200)).body.data).toEqual({ liked: false, likes: 1 });
    expect((await del(`/comments/${c.id}/like`, "ben").expect(200)).body.data.likes).toBe(1);
  });

  it("needs an account and a live comment", async () => {
    const c = await comment("ann", text());
    await api.put(`/api/v1/comments/${c.id}/like`).expect(401);
    await put("/comments/aaaaaaaaaaaaaaaaaaaaaaaa/like", "ben").expect(404);
    expect((await put("/comments/not-an-id/like", "ben").expect(400)).body.error.code).toBe("INVALID_ID");
  });
});

describe("reports and moderation", () => {
  it("lets a reader report once, but not their own comment", async () => {
    const c = await comment("ann", text("reportable"));
    await post(`/comments/${c.id}/report`, "ann", { reason: "spam" }).expect(409);
    await post(`/comments/${c.id}/report`, "ben", { reason: "abuse", note: "personal attack" }).expect(202);
    await post(`/comments/${c.id}/report`, "ben", { reason: "abuse" }).expect(202); // the repeat changes nothing
    await post(`/comments/${c.id}/report`, "ben", { reason: "weird" }).expect(400);

    const queue = (await get("/admin/comments?queue=reported", "editor").expect(200)).body.data;
    const row = queue.find((q: { id: string }) => q.id === c.id);
    expect(row).toMatchObject({ reportCount: 1, status: "published" });
    expect(row.reports).toEqual([{ reason: "abuse", note: "personal attack" }]);
  });

  it("pulls a comment back for review after three different readers report it", async () => {
    const before = await count();
    const c = await comment("dan", text("contested"));
    expect(await count()).toBe(before + 1);
    for (const who of ["ann", "ben", "cat"] as const) await post(`/comments/${c.id}/report`, who, { reason: "spam" }).expect(202);
    expect(await count()).toBe(before);
    expect((await thread(undefined, "?limit=50")).data.map((x: { id: string }) => x.id)).not.toContain(c.id);
    const held = (await get("/admin/comments?queue=held", "editor").expect(200)).body.data.find((q: { id: string }) => q.id === c.id);
    expect(held.heldFor).toBe("reports");

    // the moderator reads it and puts it back; the reports are cleared
    await post(`/admin/comments/${c.id}/approve`, "editor").expect(204);
    expect(await count()).toBe(before + 1);
    const back = (await get("/admin/comments?queue=published", "editor").expect(200)).body.data.find((q: { id: string }) => q.id === c.id);
    expect(back).toMatchObject({ reportCount: 0, reports: [] });
  });

  it("is for editors only", async () => {
    await get("/admin/comments", "ann").expect(403);
    const c = await comment("ann", text());
    await post(`/admin/comments/${c.id}/remove`, "ann", { reason: "x" }).expect(403);
  });

  it("approves a held comment, which then counts", async () => {
    const before = await count();
    const c = await comment("dan", "short one");
    expect(c.pending).toBe(true);
    const queue = (await get("/admin/comments", "editor").expect(200)).body.data;
    expect(queue.map((q: { id: string }) => q.id)).toContain(c.id);
    await post(`/admin/comments/${c.id}/approve`, "editor").expect(204);
    expect(await count()).toBe(before + 1);
    expect((await thread(undefined, "?limit=50")).data.map((x: { id: string }) => x.id)).toContain(c.id);
  });

  it("removes a comment with a stated reason, keeping its slot; the author may repost once", async () => {
    const c = await comment("cat", text("rude"));
    const before = await count();
    await post(`/admin/comments/${c.id}/remove`, "editor", { reason: "personal abuse" }).expect(204);
    expect(await count()).toBe(before - 1);
    const slot = (await thread(undefined, "?limit=50")).data.find((x: { id: string }) => x.id === c.id);
    expect(slot).toMatchObject({ author: null, body: "", removed: { by: "moderator", reason: "personal abuse" } });
    expect((await post(`/admin/comments/${c.id}/remove`, "editor", { reason: "again" }).expect(409)).body.error.code).toBe("ALREADY_REMOVED");

    // the author edits and reposts: it goes back to a moderator rather than straight to the page
    const mine = (await thread("cat", "?limit=50")).data.find((x: { id: string }) => x.id === c.id);
    expect(mine.canEdit).toBe(true);
    const reposted = (await patch(`/comments/${c.id}`, "cat", { body: text("reposted, civilly") }).expect(200)).body.data;
    expect(reposted).toMatchObject({ pending: true, removed: null });
    const row = (await get("/admin/comments?queue=held", "editor").expect(200)).body.data.find((q: { id: string }) => q.id === c.id);
    expect(row.heldFor).toBe("reposted");
    expect((await patch(`/comments/${c.id}`, "cat", { body: text() }).expect(409)).body.error.code).toBe("EDIT_USED");
  });

  it("writes the moderators' decisions to the audit trail", async () => {
    const { AuditLogModel } = await import("../../src/models/audit-log.model.js");
    expect(await AuditLogModel.countDocuments({ action: "comment.remove" })).toBeGreaterThan(0);
    expect(await AuditLogModel.countDocuments({ action: "comment.approve" })).toBeGreaterThan(0);
  });
});

describe("deleting an account", () => {
  it("deletes or empties the reader's comments and takes back their likes", async () => {
    const { purgeCommentData } = await import("../../src/modules/comments/comments.service.js");
    const { Types } = await import("mongoose");
    const { CommentModel, CommentLikeModel } = await import("../../src/models/comment.model.js");

    const loose = await comment("dan", text("loose"));
    const parent = await comment("dan", text("parent"));
    await comment("ann", text("child"), parent.id);
    const other = await comment("ann", text("liked by dan"));
    await put(`/comments/${other.id}/like`, "dan").expect(200);
    const before = await count();

    await purgeCommentData(new Types.ObjectId(ids.dan));

    expect(await CommentModel.countDocuments({ user: new Types.ObjectId(ids.dan), body: { $ne: "" } })).toBe(0);
    expect(await CommentModel.exists({ _id: loose.id })).toBeNull(); // no replies: gone
    expect(await CommentModel.findById(parent.id).lean()).toMatchObject({ status: "removed", removedBy: "author", body: "" }); // replies: slot kept
    expect(await CommentLikeModel.countDocuments({ user: new Types.ObjectId(ids.dan) })).toBe(0);
    expect((await CommentModel.findById(other.id).lean())?.likeCount).toBe(0);
    expect(await count()).toBeLessThan(before);
  });
});
