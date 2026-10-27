/**
 * The editorial back office over real HTTP: roles, the draft → published →
 * archived workflow, scheduling, revisions, accounts, directories, media, audit.
 *
 * Run: `npm run test:api`
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongod: MongoMemoryServer | undefined;
let api: ReturnType<typeof request>;

type Role = "reader" | "writer" | "editor" | "admin";
const tokens = {} as Record<Role | "writer2", string>;
const ids = {} as Record<Role | "writer2", string>;
let body: unknown[];
let detail: Record<string, unknown>;

const as = (who: keyof typeof tokens) => ({ Authorization: `Bearer ${tokens[who]}` });
const get = (path: string, who: keyof typeof tokens) => api.get(`/api/v1${path}`).set(as(who));
const post = (path: string, who: keyof typeof tokens, data?: object) => api.post(`/api/v1${path}`).set(as(who)).send(data);
const patch = (path: string, who: keyof typeof tokens, data: object) => api.patch(`/api/v1${path}`).set(as(who)).send(data);

/** Everything an article needs before readers may see it. */
const complete = () => ({
  standfirst: "A standfirst long enough to mean something to a reader.",
  image: "/images/context-software.jpg",
  mins: 6,
  tags: ["software"],
  detail,
  body,
});

async function newDraft(who: keyof typeof tokens, title: string, extra: object = {}): Promise<{ id: string; slug: string; version: number }> {
  const res = await post("/admin/articles", who, { kind: "article", section: "technology", title, author: "duarte", ...extra }).expect(201);
  return res.body.data;
}

/** A draft that passes the publish checks. */
async function readyDraft(title: string): Promise<{ id: string; slug: string }> {
  const draft = await newDraft("editor", title);
  await patch(`/admin/articles/${draft.id}`, "editor", complete()).expect(200);
  return draft;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URL = mongod.getUri("nova-admin-tests");
  process.env.CRON_SECRET = "cron-secret-for-tests";

  const { connectDb } = await import("../../src/db/connect.js");
  await connectDb();
  const { seedContent, loadContentSeed } = await import("../../src/modules/content/content.seed.js");
  await seedContent();
  const seed = await loadContentSeed();
  const sample = seed.articles.find((a) => a.kind === "article")!;
  body = sample.body;
  detail = sample.detail as Record<string, unknown>;

  const { UserModel } = await import("../../src/models/user.model.js");
  const { signAccessToken } = await import("../../src/http/auth.js");
  for (const who of ["reader", "writer", "writer2", "editor", "admin"] as const) {
    const role = who === "writer2" ? "writer" : who;
    const user = await UserModel.create({
      name: who,
      email: `${who}@example.com`,
      passwordHash: "x".repeat(60),
      role,
      emailVerified: true,
    });
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

describe("access", () => {
  it("needs a staff account", async () => {
    await api.get("/api/v1/admin/articles").expect(401);
    const res = await get("/admin/articles", "reader").expect(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("is never cached", async () => {
    const res = await get("/admin/articles", "editor").expect(200);
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("keeps account management for admins", async () => {
    await get("/admin/users", "editor").expect(403);
    await get("/admin/audit", "writer").expect(403);
    await get("/admin/users", "admin").expect(200);
  });
});

describe("creating", () => {
  it("makes a draft with a slug built from the title, and a first revision", async () => {
    const draft = await newDraft("editor", "Plain Words About Grids");
    expect(draft.slug).toBe("plain-words-about-grids");
    expect(draft.version).toBe(1);
    const revs = (await get(`/admin/articles/${draft.id}/revisions`, "editor").expect(200)).body.data;
    expect(revs.map((r: { version: number }) => r.version)).toEqual([1]);
  });

  it("numbers a repeated title and refuses a taken explicit slug", async () => {
    const first = await newDraft("editor", "Twin Title");
    const second = await newDraft("editor", "Twin Title");
    expect(first.slug).toBe("twin-title");
    expect(second.slug).toBe("twin-title-2");
    const clash = await post("/admin/articles", "editor", { kind: "article", section: "technology", title: "x", slug: "twin-title", author: "duarte" }).expect(409);
    expect(clash.body.error.code).toBe("SLUG_TAKEN");
  });

  it("asks for a slug when the title cannot make one", async () => {
    const res = await post("/admin/articles", "editor", { kind: "article", section: "technology", title: "سرمقاله", author: "duarte" }).expect(400);
    expect(res.body.error.code).toBe("SLUG_REQUIRED");
  });

  it("rejects an unknown desk or byline", async () => {
    const section = await post("/admin/articles", "editor", { kind: "article", section: "nope", title: "T", author: "duarte" }).expect(400);
    expect(section.body.error.code).toBe("UNKNOWN_SECTION");
    const author = await post("/admin/articles", "editor", { kind: "article", section: "technology", title: "T", author: "nobody" }).expect(400);
    expect(author.body.error.code).toBe("UNKNOWN_AUTHOR");
  });

  it("ignores status, views and ownership sent by the client", async () => {
    const res = await post("/admin/articles", "editor", {
      kind: "article",
      section: "technology",
      title: "Forged",
      author: "duarte",
      status: "published",
      views: 9_000_000,
      createdBy: ids.admin,
    }).expect(201);
    expect(res.body.data.status).toBe("draft");
    expect(res.body.data.views).toBe(0);
    expect(res.body.data.createdBy).toBe(ids.editor);
  });
});

describe("writers", () => {
  it("need a byline linked to their account", async () => {
    const res = await post("/admin/articles", "writer", { kind: "article", section: "technology", title: "Mine" }).expect(400);
    expect(res.body.error.code).toBe("AUTHOR_REQUIRED");

    await post("/admin/authors", "editor", {
      slug: "wanda-writer",
      name: "Wanda Writer",
      initials: "WW",
      role: "Reporter",
      since: 2026,
      bio: "Writes.",
      userId: ids.writer,
    }).expect(201);
    const ok = await post("/admin/articles", "writer", { kind: "article", section: "technology", title: "Mine" }).expect(201);
    expect(ok.body.data.author).toBe("wanda-writer");
  });

  it("see and edit only their own drafts", async () => {
    const mine = await newDraft("writer", "Writer Draft", { author: "wanda-writer" });
    await get(`/admin/articles/${mine.id}`, "writer2").expect(404);
    await patch(`/admin/articles/${mine.id}`, "writer2", { title: "Hijack" }).expect(404);
    await patch(`/admin/articles/${mine.id}`, "writer", { title: "Writer Draft, revised" }).expect(200);

    const list = (await get("/admin/articles?limit=100", "writer").expect(200)).body;
    expect(list.data.every((a: { createdBy: string }) => a.createdBy === ids.writer)).toBe(true);
    expect(list.data.map((a: { id: string }) => a.id)).toContain(mine.id);
  });

  it("cannot publish, schedule or archive", async () => {
    const mine = await newDraft("writer", "Not Yours To Publish", { author: "wanda-writer" });
    const res = await post(`/admin/articles/${mine.id}/status`, "writer", { status: "published" }).expect(403);
    expect(res.body.error.code).toBe("FORBIDDEN"); // stopped by the route gate
  });

  it("lose the pen once an editor has published their piece", async () => {
    const mine = await newDraft("writer", "Goes Live", { author: "wanda-writer" });
    await patch(`/admin/articles/${mine.id}`, "editor", complete()).expect(200);
    await post(`/admin/articles/${mine.id}/status`, "editor", { status: "published" }).expect(200);
    const res = await patch(`/admin/articles/${mine.id}`, "writer", { title: "Sneaky edit" }).expect(403);
    expect(res.body.error.code).toBe("ARTICLE_LOCKED");
  });
});

describe("publishing", () => {
  it("refuses an incomplete article and says what is missing", async () => {
    const draft = await newDraft("editor", "Half Done");
    const res = await post(`/admin/articles/${draft.id}/status`, "editor", { status: "published" }).expect(422);
    expect(res.body.error.code).toBe("ARTICLE_INCOMPLETE");
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(["standfirst", "image"]));
  });

  it("refuses a picture nobody described, and accepts it once marked decorative", async () => {
    const draft = await newDraft("editor", "Pictures Without Words");
    const figure = { type: "figure", src: "/images/context-software.jpg", alt: "", width: 1600, height: 1067, caption: "A caption" };
    await patch(`/admin/articles/${draft.id}`, "editor", { ...complete(), body: [...body, figure] }).expect(200);

    const refused = await post(`/admin/articles/${draft.id}/status`, "editor", { status: "published" }).expect(422);
    const paths = refused.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual([`body.${body.length}.alt`]);

    // marked ornamental, it needs no description
    await patch(`/admin/articles/${draft.id}`, "editor", { body: [...body, { ...figure, decorative: true }] }).expect(200);
    await post(`/admin/articles/${draft.id}/status`, "editor", { status: "published" }).expect(200);
  });

  it("puts a finished article on the public site, and takes it off again", async () => {
    const draft = await readyDraft("Public Debut");
    await api.get(`/api/v1/articles/${draft.slug}`).expect(404);

    const live = (await post(`/admin/articles/${draft.id}/status`, "editor", { status: "published" }).expect(200)).body.data;
    expect(live.status).toBe("published");
    expect(live.publishedAt).toBeTruthy();

    const page = (await api.get(`/api/v1/articles/${draft.slug}`).expect(200)).body.data;
    expect(page.article.title).toBe("Public Debut");
    const list = (await api.get("/api/v1/articles?limit=50").expect(200)).body.data;
    expect(list.map((a: { slug: string }) => a.slug)).toContain(draft.slug);

    await post(`/admin/articles/${draft.id}/status`, "editor", { status: "draft" }).expect(200);
    await api.get(`/api/v1/articles/${draft.slug}`).expect(404);
  });

  it("keeps the original date when an archived piece is revived", async () => {
    const draft = await readyDraft("Second Life");
    const first = (await post(`/admin/articles/${draft.id}/status`, "editor", { status: "published" }).expect(200)).body.data;
    await post(`/admin/articles/${draft.id}/status`, "editor", { status: "archived" }).expect(200);
    await api.get(`/api/v1/articles/${draft.slug}`).expect(404);
    const again = (await post(`/admin/articles/${draft.id}/status`, "editor", { status: "published" }).expect(200)).body.data;
    expect(again.publishedAt).toBe(first.publishedAt);
  });

  it("refuses moves the workflow does not allow", async () => {
    const draft = await readyDraft("Straight To Archive");
    const res = await post(`/admin/articles/${draft.id}/status`, "editor", { status: "archived" }).expect(409);
    expect(res.body.error.code).toBe("INVALID_TRANSITION");
  });

  it("will not let a live article be edited into an unpublishable state", async () => {
    const draft = await readyDraft("Stays Whole");
    await post(`/admin/articles/${draft.id}/status`, "editor", { status: "published" }).expect(200);
    const res = await patch(`/admin/articles/${draft.id}`, "editor", { image: "" }).expect(422);
    expect(res.body.error.code).toBe("ARTICLE_INCOMPLETE");
    expect((await api.get(`/api/v1/articles/${draft.slug}`).expect(200)).body.data.article.image).toBe("/images/context-software.jpg");
  });

  it("locks the slug once an article has been public", async () => {
    const draft = await readyDraft("Fixed Address");
    await patch(`/admin/articles/${draft.id}`, "editor", { slug: "new-address-while-draft" }).expect(200);
    await post(`/admin/articles/${draft.id}/status`, "editor", { status: "published" }).expect(200);
    const res = await patch(`/admin/articles/${draft.id}`, "editor", { slug: "moved-again" }).expect(409);
    expect(res.body.error.code).toBe("SLUG_LOCKED");
  });
});

describe("scheduling", () => {
  it("rejects a time that is too soon", async () => {
    const draft = await readyDraft("Too Eager");
    const res = await post(`/admin/articles/${draft.id}/status`, "editor", {
      status: "scheduled",
      scheduledFor: new Date(Date.now() + 5_000).toISOString(),
    }).expect(400);
    expect(res.body.error.code).toBe("SCHEDULE_TOO_SOON");
  });

  it("goes live when its time comes, through the cron endpoint", async () => {
    const draft = await readyDraft("On A Timer");
    const when = new Date(Date.now() + 3_600_000).toISOString();
    const scheduled = (await post(`/admin/articles/${draft.id}/status`, "editor", { status: "scheduled", scheduledFor: when }).expect(200)).body.data;
    expect(scheduled.status).toBe("scheduled");
    await api.get(`/api/v1/articles/${draft.slug}`).expect(404);

    // not due yet
    await api.get("/api/v1/internal/publish-due").set("Authorization", "Bearer cron-secret-for-tests").expect(200);
    await api.get(`/api/v1/articles/${draft.slug}`).expect(404);

    // time passes
    const { ArticleModel } = await import("../../src/models/article.model.js");
    await ArticleModel.updateOne({ slug: draft.slug }, { publishedAt: new Date(Date.now() - 1000) });
    const run = (await api.get("/api/v1/internal/publish-due").set("Authorization", "Bearer cron-secret-for-tests").expect(200)).body.data;
    expect(run.published).toContain(draft.slug);
    await api.get(`/api/v1/articles/${draft.slug}`).expect(200);
  });

  it("goes live on the first public read after its time, with no cron at all", async () => {
    const draft = await readyDraft("Lazy Sweep");
    await post(`/admin/articles/${draft.id}/status`, "editor", {
      status: "scheduled",
      scheduledFor: new Date(Date.now() + 3_600_000).toISOString(),
    }).expect(200);
    const { ArticleModel } = await import("../../src/models/article.model.js");
    await ArticleModel.updateOne({ slug: draft.slug }, { publishedAt: new Date(Date.now() - 1000) });
    const { resetSweepThrottle } = await import("../../src/modules/admin/articles.service.js");
    resetSweepThrottle();
    await api.get(`/api/v1/articles/${draft.slug}`).expect(200);
  });

  it("keeps the cron endpoint closed to everyone without the secret", async () => {
    await api.get("/api/v1/internal/publish-due").expect(401);
    await api.get("/api/v1/internal/publish-due").set("Authorization", "Bearer wrong").expect(401);
  });
});

describe("revisions and conflicts", () => {
  it("snapshots each save and restores an old version as a new one", async () => {
    const draft = await newDraft("editor", "Version One Title");
    await patch(`/admin/articles/${draft.id}`, "editor", { title: "Version Two Title" }).expect(200);
    const v3 = (await patch(`/admin/articles/${draft.id}`, "editor", { title: "Version Three Title" }).expect(200)).body.data;
    expect(v3.version).toBe(3);

    const revs = (await get(`/admin/articles/${draft.id}/revisions`, "editor").expect(200)).body.data;
    expect(revs.map((r: { version: number }) => r.version)).toEqual([3, 2, 1]);
    const old = (await get(`/admin/articles/${draft.id}/revisions/1`, "editor").expect(200)).body.data;
    expect(old.snapshot.title).toBe("Version One Title");

    const restored = (await post(`/admin/articles/${draft.id}/revisions/1/restore`, "editor").expect(200)).body.data;
    expect(restored.title).toBe("Version One Title");
    expect(restored.version).toBe(4);
    await get(`/admin/articles/${draft.id}/revisions/99`, "editor").expect(404);
  });

  it("does not bump the version when nothing changed", async () => {
    const draft = await newDraft("editor", "Unchanged");
    const res = await patch(`/admin/articles/${draft.id}`, "editor", { title: "Unchanged" }).expect(200);
    expect(res.body.data.version).toBe(1);
  });

  it("catches two people saving the same version", async () => {
    const draft = await newDraft("editor", "Contested");
    await patch(`/admin/articles/${draft.id}`, "editor", { title: "Mine", baseVersion: 1 }).expect(200);
    const res = await patch(`/admin/articles/${draft.id}`, "admin", { title: "Theirs", baseVersion: 1 }).expect(409);
    expect(res.body.error.code).toBe("VERSION_CONFLICT");
    expect(res.body.error.details.currentVersion).toBe(2);
  });

  it("validates ids", async () => {
    const res = await get("/admin/articles/not-an-id", "editor").expect(400);
    expect(res.body.error.code).toBe("INVALID_ID");
    await get("/admin/articles/aaaaaaaaaaaaaaaaaaaaaaaa", "editor").expect(404);
  });
});

describe("deleting", () => {
  it("is for admins only", async () => {
    const draft = await newDraft("editor", "Doomed");
    await api.delete(`/api/v1/admin/articles/${draft.id}`).set(as("editor")).expect(403);
    await api.delete(`/api/v1/admin/articles/${draft.id}`).set(as("admin")).expect(204);
    await get(`/admin/articles/${draft.id}`, "admin").expect(404);
  });
});

describe("accounts", () => {
  it("changes a role, but never your own", async () => {
    const res = await patch(`/admin/users/${ids.reader}`, "admin", { role: "writer" }).expect(200);
    expect(res.body.data.role).toBe("writer");
    await patch(`/admin/users/${ids.reader}`, "admin", { role: "reader" }).expect(200);
    const self = await patch(`/admin/users/${ids.admin}`, "admin", { role: "reader" }).expect(409);
    expect(self.body.error.code).toBe("SELF_CHANGE");
  });

  it("locks a suspended account out at once", async () => {
    await get("/admin/articles", "writer2").expect(200);
    await patch(`/admin/users/${ids.writer2}`, "admin", { status: "suspended" }).expect(200);
    const res = await get("/admin/articles", "writer2").expect(403);
    expect(res.body.error.code).toBe("ACCOUNT_SUSPENDED");
    await patch(`/admin/users/${ids.writer2}`, "admin", { status: "active" }).expect(200);
  });

  it("lists and filters accounts", async () => {
    const res = (await get("/admin/users?role=editor", "admin").expect(200)).body;
    expect(res.data.map((u: { email: string }) => u.email)).toEqual(["editor@example.com"]);
    expect(res.data[0]).not.toHaveProperty("passwordHash");
    expect(res.page.total).toBe(1);
  });
});

describe("directories", () => {
  it("creates, edits and removes a topic", async () => {
    await post("/admin/topics", "editor", { slug: "fresh-topic", name: "Fresh Topic" }).expect(201);
    const clash = await post("/admin/topics", "editor", { slug: "fresh-topic", name: "Again" }).expect(409);
    expect(clash.body.error.code).toBe("SLUG_TAKEN");
    const edited = (await patch("/admin/topics/fresh-topic", "editor", { blurb: "About it." }).expect(200)).body.data;
    expect(edited.blurb).toBe("About it.");
    await api.delete("/api/v1/admin/topics/fresh-topic").set(as("editor")).expect(204);
    await api.get("/api/v1/topics/fresh-topic").expect(404);
  });

  it("refuses to delete what articles still use", async () => {
    const res = await api.delete("/api/v1/admin/sections/technology").set(as("editor")).expect(409);
    expect(res.body.error.code).toBe("IN_USE");
    const latest = await api.delete("/api/v1/admin/sections/latest").set(as("editor")).expect(409);
    expect(latest.body.error.code).toBe("BUILT_IN");
  });

  it("appends a new desk to the navigation", async () => {
    const desk = (await post("/admin/sections", "editor", { slug: "travel", name: "Travel" }).expect(201)).body.data;
    expect(desk.order).toBeGreaterThan(0);
    const names = (await api.get("/api/v1/sections").expect(200)).body.data.map((s: { slug: string }) => s.slug);
    expect(names.at(-1)).toBe("travel");
  });

  it("is closed to writers", async () => {
    await post("/admin/topics", "writer", { slug: "nope", name: "Nope" }).expect(403);
  });

  it("links and unlinks a byline from an account", async () => {
    const unlinked = (await patch("/admin/authors/wanda-writer", "editor", { userId: null }).expect(200)).body.data;
    expect(unlinked.userId).toBeUndefined();
    await patch("/admin/authors/wanda-writer", "editor", { userId: ids.writer }).expect(200);
  });
});

describe("media", () => {
  it("answers 503 for signing when no provider is configured", async () => {
    const res = await post("/admin/media/sign", "writer").expect(503);
    expect(res.body.error.code).toBe("MEDIA_NOT_CONFIGURED");
  });

  it("records an image with its alt text and credit, once", async () => {
    const image = { url: "https://cdn.example.com/a.jpg", width: 1600, height: 1067, alt: "A corridor of servers", credit: "Photo: NOVA" };
    const saved = (await post("/admin/media", "writer", image).expect(201)).body.data;
    expect(saved.alt).toBe("A corridor of servers");
    await post("/admin/media", "writer", image).expect(409);
    await post("/admin/media", "writer", { ...image, url: "http://insecure.example.com/b.jpg" }).expect(400);
    const list = (await get("/admin/media", "editor").expect(200)).body;
    expect(list.page.total).toBe(1);
  });

  it("will not take an image nobody described, unless it is marked decorative", async () => {
    const base = { url: "https://cdn.example.com/c.jpg", width: 800, height: 600 };
    const none = await post("/admin/media", "writer", { ...base, alt: "   " }).expect(400);
    expect(JSON.stringify(none.body)).toContain("Describe the image");
    await post("/admin/media", "writer", base).expect(400);
    // a description on an image declared ornamental is a contradiction
    await post("/admin/media", "writer", { ...base, alt: "x", decorative: true }).expect(400);
    const ok = await post("/admin/media", "writer", { ...base, alt: "", decorative: true }).expect(201);
    expect(ok.body.data).toMatchObject({ alt: "", decorative: true });
  });
});

describe("audit trail", () => {
  it("records who did what", async () => {
    const res = (await get("/admin/audit?action=article.status&limit=100", "admin").expect(200)).body;
    expect(res.data.length).toBeGreaterThan(3);
    expect(res.data[0]).toMatchObject({ action: "article.status", actorRole: expect.any(String) });
    const created = (await get("/admin/audit?action=article.create&limit=100", "admin").expect(200)).body;
    expect(created.page.total).toBeGreaterThan(5);
  });
});
