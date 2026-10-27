/**
 * The front page's editorial placement over real HTTP: automatic fill, pinning,
 * validation, and how unpublishing a pinned story is handled.
 *
 * Run: `npm run test:api`
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongod: MongoMemoryServer | undefined;
let api: ReturnType<typeof request>;
const tokens = {} as Record<"reader" | "editor", string>;

const as = (who: keyof typeof tokens) => ({ Authorization: `Bearer ${tokens[who]}` });
const home = async () => (await api.get("/api/v1/placements/home").expect(200)).body.data as Record<string, { slug: string; kind: string }[]>;
const editing = async () => (await api.get("/api/v1/admin/placements/home").set(as("editor")).expect(200)).body.data;
const put = (body: object) => api.put("/api/v1/admin/placements/home").set(as("editor")).send(body);
const slugs = (list: { slug: string }[]) => list.map((a) => a.slug);

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URL = mongod.getUri("nova-placements-tests");

  const { connectDb } = await import("../../src/db/connect.js");
  await connectDb();
  const { seedContent } = await import("../../src/modules/content/content.seed.js");
  await seedContent();

  const { UserModel } = await import("../../src/models/user.model.js");
  const { signAccessToken } = await import("../../src/http/auth.js");
  for (const who of ["reader", "editor"] as const) {
    const user = await UserModel.create({ name: who, email: `${who}@example.com`, passwordHash: "x".repeat(60), role: who, emailVerified: true });
    tokens[who] = signAccessToken(user._id.toString(), who);
  }

  const { createApp } = await import("../../src/app.js");
  api = request(createApp());
}, 120_000);

afterAll(async () => {
  const { disconnectDb } = await import("../../src/db/connect.js");
  await disconnectDb();
  await mongod?.stop();
});

describe("with nothing pinned", () => {
  it("fills every slot with the newest suitable stories, never repeating one", async () => {
    const h = await home();
    expect(h.lead).toHaveLength(1);
    expect(h.secondary).toHaveLength(2);
    expect(h.brief).toHaveLength(4);
    expect(h.picks).toHaveLength(4);
    expect(h.opinion).toHaveLength(4);
    expect(h.longread).toHaveLength(1);

    const all = Object.values(h).flatMap(slugs);
    expect(new Set(all).size).toBe(all.length);
  });

  it("keeps long reads out of the news slots and opinion pieces in the opinion column", async () => {
    const h = await home();
    for (const slot of ["lead", "secondary", "brief", "picks"]) expect(h[slot]!.every((a) => a.kind !== "longread")).toBe(true);
    expect(h.longread![0]!.kind).toBe("longread");
    expect(h.opinion!.every((a) => ["opinion", "interview"].includes(a.kind))).toBe(true);
  });

  it("leads with the newest story", async () => {
    const newest = (await api.get("/api/v1/articles?kind=article,video&limit=1").expect(200)).body.data[0];
    expect((await home()).lead![0]!.slug).toBe(newest.slug);
  });

  it("is cacheable by a CDN and returns full summaries", async () => {
    const res = await api.get("/api/v1/placements/home").expect(200);
    expect(res.headers["cache-control"]).toContain("s-maxage=60");
    expect(res.body.data.lead[0]).toHaveProperty("authorRef");
  });
});

describe("pinning", () => {
  it("is for editors only", async () => {
    await api.get("/api/v1/admin/placements/home").expect(401);
    await api.get("/api/v1/admin/placements/home").set(as("reader")).expect(403);
    await api.put("/api/v1/admin/placements/home").set(as("reader")).send({}).expect(403);
  });

  it("puts a chosen story where the editor says, and fills around it", async () => {
    const res = await put({ lead: ["quiet-office"], secondary: ["slow-fashion", "remote-labs"] }).expect(200);
    expect(res.body.data.pinned.lead).toEqual(["quiet-office"]);

    const h = await home();
    expect(slugs(h.lead!)).toEqual(["quiet-office"]);
    expect(slugs(h.secondary!)).toEqual(["slow-fashion", "remote-labs"]);
    // the pinned stories are not repeated in the slots that fill themselves
    const rest = ["brief", "picks", "opinion", "longread"].flatMap((s) => slugs(h[s]!));
    expect(rest).not.toContain("quiet-office");
    expect(rest).not.toContain("slow-fashion");
  });

  it("tells the editor which stories are pinned and which filled themselves", async () => {
    const e = await editing();
    expect(e.live.lead[0]).toMatchObject({ slug: "quiet-office", pinned: true });
    expect(e.live.brief.every((x: { pinned: boolean }) => x.pinned === false)).toBe(true);
    expect(e.limits).toMatchObject({ lead: 1, secondary: 2, brief: 4, picks: 4, opinion: 4, longread: 1 });
  });

  it("lets a long read lead and an article fill the long-read slot", async () => {
    await put({ lead: ["grid-rebuild"], longread: ["human-brain"] }).expect(200);
    const h = await home();
    expect(slugs(h.lead!)).toEqual(["grid-rebuild"]);
    expect(slugs(h.longread!)).toEqual(["human-brain"]);
  });

  it("keeps the order the editor gave", async () => {
    await put({ brief: ["small-powerful-companies", "chip-shortage", "type-revival"] }).expect(200);
    expect(slugs((await home()).brief!).slice(0, 3)).toEqual(["small-powerful-companies", "chip-shortage", "type-revival"]);
  });

  it("clearing the pins returns the front page to automatic", async () => {
    await put({}).expect(200);
    const e = await editing();
    expect(Object.values(e.pinned as Record<string, string[]>).flat()).toEqual([]);
  });
});

describe("validation", () => {
  it("refuses a story that is not published, naming it", async () => {
    const { ArticleModel } = await import("../../src/models/article.model.js");
    await ArticleModel.updateOne({ slug: "ocean-floor" }, { status: "draft" });
    const res = await put({ picks: ["ocean-floor", "nope"] }).expect(422);
    expect(res.body.error.code).toBe("UNKNOWN_ARTICLE");
    expect(res.body.error.details.map((d: { path: string }) => d.path).sort()).toEqual(["nope", "ocean-floor"]);
    await ArticleModel.updateOne({ slug: "ocean-floor" }, { status: "published" });
  });

  it("refuses too many for a slot, and the same story twice in one slot", async () => {
    await put({ lead: ["quiet-office", "slow-fashion"] }).expect(400);
    const dup = await put({ picks: ["quiet-office", "quiet-office"] }).expect(400);
    expect(dup.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("allows one story in two slots when the editor wants it", async () => {
    await put({ brief: ["think-better"], opinion: ["think-better"] }).expect(200);
    const h = await home();
    expect(slugs(h.brief!)).toContain("think-better");
    expect(slugs(h.opinion!)).toContain("think-better");
    // but nothing fills itself with a story already on the page
    const auto = ["lead", "secondary", "picks", "longread"].flatMap((s) => slugs(h[s]!));
    expect(auto).not.toContain("think-better");
  });

  it("ignores slots it does not know", async () => {
    await put({ lead: ["quiet-office"], sidebar: ["slow-fashion"] }).expect(200);
    expect(Object.keys((await editing()).pinned)).not.toContain("sidebar");
  });
});

describe("when a pinned story stops being published", () => {
  it("drops out of its slot and the slot fills again, with no hole", async () => {
    await put({ lead: ["quiet-office"] }).expect(200);
    const { ArticleModel } = await import("../../src/models/article.model.js");
    await ArticleModel.updateOne({ slug: "quiet-office" }, { status: "archived" });

    const h = await home();
    expect(h.lead).toHaveLength(1);
    expect(slugs(h.lead!)).not.toContain("quiet-office");
    expect((await editing()).live.lead[0].pinned).toBe(false);

    await ArticleModel.updateOne({ slug: "quiet-office" }, { status: "published" });
    expect(slugs((await home()).lead!)).toEqual(["quiet-office"]); // and it is back, without anyone re-pinning it
  });

  it("writes the change to the audit trail", async () => {
    const { AuditLogModel } = await import("../../src/models/audit-log.model.js");
    expect(await AuditLogModel.countDocuments({ action: "placement.update" })).toBeGreaterThan(3);
  });
});
