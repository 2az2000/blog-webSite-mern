/**
 * Search over real HTTP: whole words and stems, prefixes, writers, topics, sorting,
 * paging, hostile input, and the log of what readers look for.
 *
 * Run: `npm run test:api`
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongod: MongoMemoryServer | undefined;
let api: ReturnType<typeof request>;
let editor = "";
let reader = "";

const BROWSER = "Mozilla/5.0 (test) AppleWebKit/537.36 Chrome/120";
const find = (q: string, extra = "") => api.get(`/api/v1/search?q=${encodeURIComponent(q)}${extra}`).set("User-Agent", BROWSER);
const slugs = (res: { body: { data: { articles: { slug: string }[] } } }) => res.body.data.articles.map((a) => a.slug);

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URL = mongod.getUri("nova-search-tests");

  const { connectDb } = await import("../../src/db/connect.js");
  await connectDb();
  const { seedContent } = await import("../../src/modules/content/content.seed.js");
  await seedContent();

  const { UserModel } = await import("../../src/models/user.model.js");
  const { signAccessToken } = await import("../../src/http/auth.js");
  for (const who of ["editor", "reader"] as const) {
    const user = await UserModel.create({ name: who, email: `${who}@example.com`, passwordHash: "x".repeat(60), role: who, emailVerified: true });
    const token = signAccessToken(user._id.toString(), who);
    if (who === "editor") editor = token;
    else reader = token;
  }

  const { createApp } = await import("../../src/app.js");
  api = request(createApp());
}, 120_000);

afterAll(async () => {
  const { disconnectDb } = await import("../../src/db/connect.js");
  await disconnectDb();
  await mongod?.stop();
});

describe("finding stories", () => {
  it("finds a whole word in a headline", async () => {
    const res = await find("grid").expect(200);
    expect(slugs(res)).toContain("grid-rebuild");
    expect(res.body.page.totals.articles).toBeGreaterThan(0);
  });

  it("matches word stems: 'batteries' finds the battery story", async () => {
    expect(slugs(await find("batteries").expect(200))).toContain("battery-chemistry");
  });

  it("finds stories by topic tag", async () => {
    const res = await find("artificial intelligence").expect(200);
    expect(slugs(res)).toEqual(expect.arrayContaining(["context-software", "ai-labour", "think-better"]));
  });

  it("falls back to word prefixes when no whole word matches", async () => {
    const res = await find("batter").expect(200);
    expect(slugs(res)).toContain("battery-chemistry");
    const typing = await find("archi").expect(200);
    expect(slugs(typing)).toEqual(expect.arrayContaining(["type-revival", "archive-fever"]));
  });

  it("finds a writer's stories by the writer's name", async () => {
    const res = await find("lindqvist").expect(200);
    expect(slugs(res).sort()).toEqual(["city-night", "grid-rebuild"]);
    expect(res.body.data.authors.map((a: { slug: string }) => a.slug)).toEqual(["lindqvist"]);
  });

  it("ranks a headline match above a standfirst match", async () => {
    const res = await find("memory").expect(200);
    // 'memory' is a tag of human-brain, internet-remember and archive-fever; all outrank stories that merely mention it
    expect(slugs(res).slice(0, 3).sort()).toEqual(["archive-fever", "human-brain", "internet-remember"]);
  });

  it("returns full summaries and never an unpublished story", async () => {
    const { ArticleModel } = await import("../../src/models/article.model.js");
    await ArticleModel.updateOne({ slug: "grid-rebuild" }, { status: "draft" });
    const res = await find("grid").expect(200);
    expect(slugs(res)).not.toContain("grid-rebuild");
    await ArticleModel.updateOne({ slug: "grid-rebuild" }, { status: "published" });
    const first = (await find("battery").expect(200)).body.data.articles[0];
    expect(first).toHaveProperty("authorRef");
    expect(first).not.toHaveProperty("body");
  });

  it("answers an empty result, not an error, when nothing matches", async () => {
    const res = await find("zzzxqv").expect(200);
    expect(res.body.data.articles).toEqual([]);
    expect(res.body.page.totals).toEqual({ articles: 0, authors: 0, topics: 0 });
  });
});

describe("authors and topics", () => {
  it("lists matching writers and topics with their counts", async () => {
    const res = await find("design").expect(200);
    expect(res.body.data.topics.map((t: { slug: string }) => t.slug)).toContain("design-systems");
    const writers = await find("critic").expect(200);
    expect(writers.body.data.authors[0]).toMatchObject({ slug: "okonkwo", count: 4 });
  });
});

describe("sorting and paging", () => {
  it("sorts by newest and by popularity", async () => {
    const newest = (await find("the", "&sort=newest&limit=50").expect(200)).body.data.articles.map((a: { date: string }) => a.date);
    expect(newest).toEqual([...newest].sort().reverse());
    const popular = (await find("the", "&sort=popular&limit=50").expect(200)).body.data.articles.map((a: { views: number }) => a.views);
    expect(popular).toEqual([...popular].sort((a, b) => b - a));
  });

  it("pages through all the results without gaps or repeats", async () => {
    const all = await find("work", "&sort=newest&limit=50").expect(200);
    const total = all.body.page.totals.articles as number;
    expect(total).toBeGreaterThan(2);
    const seen: string[] = [];
    for (let page = 1; page <= Math.ceil(total / 2); page += 1) seen.push(...slugs(await find("work", `&sort=newest&limit=2&page=${page}`).expect(200)));
    expect(seen).toEqual(slugs(all));
  });
});

describe("hostile and odd input", () => {
  it("requires a query and bounds the page size", async () => {
    expect((await api.get("/api/v1/search").expect(400)).body.error.code).toBe("VALIDATION_ERROR");
    await api.get("/api/v1/search?q=%20%20").expect(400);
    await api.get("/api/v1/search?q=x&limit=500").expect(400);
  });

  it("cannot exclude with a minus, force a phrase, or inject a regex", async () => {
    // "-grid" would exclude 'grid' in a raw $text query and match nearly everything
    expect(slugs(await find("-grid").expect(200))).toContain("grid-rebuild");
    await find('"grid').expect(200);
    await find(".*").expect(200);
    await find("(((").expect(200);
    await find("a".repeat(150)).expect(200);
    await find("a".repeat(500)).expect(400); // longer than any real search
  });

  it("searches Persian text without failing", async () => {
    const res = await find("شبکه برق").expect(200);
    expect(res.body.data.articles).toEqual([]);
  });

  it("is cacheable by a CDN", async () => {
    expect((await find("grid")).headers["cache-control"]).toContain("s-maxage=60");
  });
});

describe("what readers search for", () => {
  it("counts terms, and tells the editors which find nothing", async () => {
    await find("lithium").expect(200);
    await find("lithium").expect(200);
    await find("unobtainium").expect(200);
    const top = (await api.get("/api/v1/admin/searches").set({ Authorization: `Bearer ${editor}` }).expect(200)).body.data;
    expect(top.find((t: { term: string }) => t.term === "lithium")).toMatchObject({ count: 2 });
    const empty = (await api.get("/api/v1/admin/searches?kind=empty").set({ Authorization: `Bearer ${editor}` }).expect(200)).body.data;
    expect(empty.map((t: { term: string }) => t.term)).toContain("unobtainium");
    expect(empty.map((t: { term: string }) => t.term)).not.toContain("lithium");
  });

  it("does not count 'show more', re-sorting, crawlers, or searches with no browser", async () => {
    await find("sortedonce").expect(200);
    await find("sortedonce", "&sort=newest").expect(200);
    await find("sortedonce", "&page=2").expect(200);
    await api.get("/api/v1/search?q=crawled").set("User-Agent", "Googlebot/2.1").expect(200);
    await api.get("/api/v1/search?q=nobrowser").set("User-Agent", "").expect(200);
    const top = (await api.get("/api/v1/admin/searches?limit=100").set({ Authorization: `Bearer ${editor}` }).expect(200)).body.data;
    expect(top.find((t: { term: string }) => t.term === "sortedonce")).toMatchObject({ count: 1 });
    expect(top.map((t: { term: string }) => t.term)).not.toContain("crawled");
    expect(top.map((t: { term: string }) => t.term)).not.toContain("nobrowser");
  });

  it("offers the popular terms that found something, as suggestions", async () => {
    const popular = (await api.get("/api/v1/search/popular?limit=5").expect(200)).body.data as string[];
    expect(popular).toContain("lithium");
    expect(popular).not.toContain("unobtainium");
  });

  it("keeps the term list for editors", async () => {
    await api.get("/api/v1/admin/searches").expect(401);
    await api.get("/api/v1/admin/searches").set({ Authorization: `Bearer ${reader}` }).expect(403);
  });
});
