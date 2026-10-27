/**
 * The public read API over real HTTP against an in-memory MongoDB, loaded
 * from the same seed the site ships with.
 *
 * Run: `npm run test:api`
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongod: MongoMemoryServer | undefined;
let api: ReturnType<typeof request>;

interface Summary {
  slug: string;
  kind: string;
  section: string;
  author: string;
  date: string;
  views: number;
  comments: number;
  tags: string[];
  authorRef: { slug: string; name: string };
  sectionRef: { slug: string; name: string };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URL = mongod.getUri("nova-content-tests");

  const { connectDb } = await import("../../src/db/connect.js");
  await connectDb();
  const { seedContent } = await import("../../src/modules/content/content.seed.js");
  await seedContent();

  const { createApp } = await import("../../src/app.js");
  api = request(createApp());
}, 120_000);

afterAll(async () => {
  const { disconnectDb } = await import("../../src/db/connect.js");
  await disconnectDb();
  await mongod?.stop();
});

const list = async (query = ""): Promise<{ data: Summary[]; page: { nextCursor: string | null } }> =>
  (await api.get(`/api/v1/articles${query}`).expect(200)).body;

describe("seeding", () => {
  it("is idempotent", async () => {
    const { seedContent } = await import("../../src/modules/content/content.seed.js");
    await seedContent();
    expect((await list("?limit=50")).data).toHaveLength(22);
  });
});

describe("sections, topics, authors", () => {
  it("lists the desks in navigation order", async () => {
    const { data } = (await api.get("/api/v1/sections").expect(200)).body;
    expect(data[0].slug).toBe("latest");
    expect(data).toHaveLength(11);
  });

  it("counts the published articles of each desk, and `latest` is every one", async () => {
    const { data } = (await api.get("/api/v1/sections").expect(200)).body;
    const by = Object.fromEntries(data.map((s: { slug: string; count: number }) => [s.slug, s.count]));
    expect(by.latest).toBe(22);
    expect(by.technology).toBe((await list("?section=technology&limit=50")).data.length);
    const sum = data.filter((s: { slug: string }) => s.slug !== "latest").reduce((n: number, s: { count: number }) => n + s.count, 0);
    expect(sum).toBe(22);
    expect((await api.get("/api/v1/sections/design").expect(200)).body.data.count).toBe(by.design);
  });

  it("returns one desk, or 404", async () => {
    expect((await api.get("/api/v1/sections/technology").expect(200)).body.data.name).toBe("Technology");
    const res = await api.get("/api/v1/sections/nope").expect(404);
    expect(res.body.error.code).toBe("SECTION_NOT_FOUND");
  });

  it("counts published articles per topic and per author", async () => {
    const topic = (await api.get("/api/v1/topics/artificial-intelligence").expect(200)).body.data;
    const tagged = (await list("?topic=artificial-intelligence&limit=50")).data;
    expect(topic.count).toBe(tagged.length);
    const duarte = (await api.get("/api/v1/authors/duarte").expect(200)).body.data;
    expect(duarte.count).toBe((await list("?author=duarte&limit=50")).data.length);
    await api.get("/api/v1/authors/nobody").expect(404);
  });
});

describe("GET /articles", () => {
  it("returns summaries with the resolved author and desk, no body", async () => {
    const { data } = await list();
    expect(data).toHaveLength(12);
    const first = data[0]!;
    expect(first).not.toHaveProperty("body");
    expect(first.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(first.authorRef.slug).toBe(first.author);
    expect(first.sectionRef.slug).toBe(first.section);
  });

  it("is newest first", async () => {
    const dates = (await list("?limit=50")).data.map((a) => a.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("filters by desk, kind and exclusion, and treats `latest` as every desk", async () => {
    const tech = (await list("?section=technology&limit=50")).data;
    expect(tech.length).toBeGreaterThan(0);
    expect(tech.every((a) => a.section === "technology")).toBe(true);
    expect((await list("?section=latest&limit=50")).data).toHaveLength(22);

    const opinions = (await list("?kind=opinion&limit=50")).data;
    expect(opinions.every((a) => a.kind === "opinion")).toBe(true);

    const skipped = (await list("?exclude=context-software&limit=50")).data;
    expect(skipped.map((a) => a.slug)).not.toContain("context-software");
  });

  it("sorts by views and by discussion", async () => {
    const views = (await list("?sort=popular&limit=50")).data.map((a) => a.views);
    expect(views).toEqual([...views].sort((a, b) => b - a));
    const talk = (await list("?sort=discussed&limit=50")).data.map((a) => a.comments);
    expect(talk).toEqual([...talk].sort((a, b) => b - a));
  });

  it("walks every page by cursor without gaps or repeats", async () => {
    for (const sort of ["latest", "popular", "discussed"]) {
      const seen: string[] = [];
      let cursor: string | null = null;
      let pages = 0;
      do {
        const query: string = `?sort=${sort}&limit=5${cursor ? `&cursor=${cursor}` : ""}`;
        const page = await list(query);
        seen.push(...page.data.map((a) => a.slug));
        cursor = page.page.nextCursor;
        pages += 1;
      } while (cursor && pages < 10);
      expect(pages).toBe(5);
      expect(new Set(seen).size).toBe(22);
      expect(seen).toEqual((await list(`?sort=${sort}&limit=50`)).data.map((a) => a.slug));
    }
  });

  it("rejects bad queries with the standard envelope", async () => {
    const bad = await api.get("/api/v1/articles?limit=500").expect(400);
    expect(bad.body.error.code).toBe("VALIDATION_ERROR");
    const cursor = await api.get("/api/v1/articles?cursor=garbage").expect(400);
    expect(cursor.body.error.code).toBe("INVALID_CURSOR");
  });

  it("is cacheable by a CDN, and errors are not", async () => {
    const ok = await api.get("/api/v1/articles").expect(200);
    expect(ok.headers["cache-control"]).toContain("s-maxage=60");
    const err = await api.get("/api/v1/articles/nope").expect(404);
    expect(err.headers["cache-control"]).toBe("no-store");
  });
});

describe("GET /articles/:slug", () => {
  it("assembles an ordinary article page", async () => {
    const page = (await api.get("/api/v1/articles/context-software").expect(200)).body.data;
    expect(page.kind).toBe("article");
    expect(page.article.slug).toBe("context-software");
    expect(page.detail.heroAlt).toBeTruthy();
    expect(page.body.length).toBeGreaterThan(3);
    expect(page.tags.map((t: { slug: string }) => t.slug)).toEqual(page.article.tags);
    expect(page.related).toHaveLength(3);
    expect(page.related.map((a: Summary) => a.slug)).not.toContain("context-software");
    expect(page.chapters).toBeUndefined();
  });

  it("resolves each recirc block into real stories", async () => {
    const page = (await api.get("/api/v1/articles/context-software").expect(200)).body.data;
    const recirc = page.body.find((b: { type: string }) => b.type === "recirc");
    expect(recirc.articles.length).toBeGreaterThan(0);
    expect(recirc.articles[0]).toHaveProperty("authorRef");
    expect(recirc).not.toHaveProperty("slugs");
  });

  it("assembles a long read with its chapters and curated related stories", async () => {
    const page = (await api.get("/api/v1/articles/grid-rebuild").expect(200)).body.data;
    expect(page.kind).toBe("longread");
    expect(page.chapters.length).toBeGreaterThan(1);
    expect(page.detail.eyebrow).toBeTruthy();
    expect(page.detail).not.toHaveProperty("related");
    expect(page.related.length).toBeGreaterThan(0);
  });

  it("404s for an unknown story", async () => {
    const res = await api.get("/api/v1/articles/nope").expect(404);
    expect(res.body.error.code).toBe("ARTICLE_NOT_FOUND");
  });

  it("never serves a draft", async () => {
    const { ArticleModel } = await import("../../src/models/article.model.js");
    await ArticleModel.updateOne({ slug: "quiet-office" }, { status: "draft" });
    await api.get("/api/v1/articles/quiet-office").expect(404);
    expect((await list("?limit=50")).data.map((a) => a.slug)).not.toContain("quiet-office");
    await ArticleModel.updateOne({ slug: "quiet-office" }, { status: "published" });
  });
});

describe("boards", () => {
  it("trending is the most-read stories", async () => {
    const { data } = (await api.get("/api/v1/trending?limit=3").expect(200)).body;
    expect(data).toHaveLength(3);
    expect(data[0].views).toBeGreaterThanOrEqual(data[1].views);
  });

  it("most-discussed is ordered by comments", async () => {
    const { data } = (await api.get("/api/v1/most-discussed").expect(200)).body;
    expect(data).toHaveLength(5);
    expect(data[0].comments).toBeGreaterThanOrEqual(data[4].comments);
  });
});
