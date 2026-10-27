/**
 * Account settings and the back-office overview over real HTTP: the devices a
 * person is signed in on, the Dispatch managed from the account, the traffic
 * overview (and what each role may see of it), and the one permission table.
 *
 * Run: `npm run test:api`
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongod: MongoMemoryServer | undefined;
let api: ReturnType<typeof request>;

const PASSWORD = "a-long-passphrase-1";
const CHROME_WIN = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const SAFARI_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

const cookies: Record<string, string> = {};
const ids: Record<string, string> = {};

async function signIn(email: string, agent = CHROME_WIN): Promise<string> {
  const res = await api.post("/api/v1/auth/login").set("User-Agent", agent).send({ email, password: PASSWORD }).expect(200);
  return (res.headers["set-cookie"] as unknown as string[]).map((c) => c.split(";")[0]).join("; ");
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URL = mongod.getUri("nova-account-admin-tests");

  const { connectDb } = await import("../../src/db/connect.js");
  await connectDb();
  const { seedContent } = await import("../../src/modules/content/content.seed.js");
  await seedContent();

  const { UserModel, hashPassword } = await import("../../src/models/user.model.js");
  for (const [key, role] of [["reader", "reader"], ["writer", "writer"], ["editor", "editor"], ["admin", "admin"]] as const) {
    const user = await UserModel.create({
      name: `${key} person`,
      email: `${key}@example.com`,
      passwordHash: await hashPassword(PASSWORD),
      emailVerified: true,
      role,
    });
    ids[key] = user._id.toString();
  }

  const { createApp } = await import("../../src/app.js");
  api = request(createApp());
  for (const key of ["reader", "writer", "editor", "admin"]) cookies[key] = await signIn(`${key}@example.com`);
}, 120_000);

afterAll(async () => {
  const { disconnectDb } = await import("../../src/db/connect.js");
  await disconnectDb();
  await mongod?.stop();
});

const as = (who: string, method: "get" | "put" | "post" | "delete" | "patch", path: string) =>
  api[method](`/api/v1${path}`).set("Cookie", cookies[who]!).set("Origin", "http://localhost:3000");

describe("devices", () => {
  it("lists the account's sessions and marks the one asking", async () => {
    const phone = await signIn("reader@example.com", SAFARI_IOS);
    expect(phone).toContain("nova_rt");

    const res = await as("reader", "get", "/auth/me/sessions").expect(200);
    const devices = res.body.data as { id: string; current: boolean; device: string }[];
    expect(devices).toHaveLength(2);
    expect(devices.filter((d) => d.current)).toHaveLength(1);
    expect(devices.find((d) => d.current)?.device).toBe("Chrome on Windows");
    expect(devices.map((d) => d.device)).toContain("Safari on iOS");
    // nothing that could be replayed
    expect(JSON.stringify(res.body)).not.toMatch(/tokenHash|previousHashes|secret/i);
  });

  it("needs a session", async () => {
    await api.get("/api/v1/auth/me/sessions").expect(401);
  });

  it("signs one device out, and that device can no longer refresh", async () => {
    const phoneCookie = await signIn("reader@example.com", SAFARI_IOS);
    const phoneId = /nova_rt=([a-f0-9]{32})/.exec(phoneCookie)![1];
    const listed = (await as("reader", "get", "/auth/me/sessions").expect(200)).body.data as { id: string }[];
    expect(listed.map((d) => d.id)).toContain(phoneId);
    const phone = { id: phoneId };

    await as("reader", "delete", `/auth/me/sessions/${phone.id}`).expect(204);
    await api.post("/api/v1/auth/refresh").set("Cookie", phoneCookie).set("Origin", "http://localhost:3000").expect(401);

    const after = (await as("reader", "get", "/auth/me/sessions").expect(200)).body.data as { id: string }[];
    expect(after.map((d) => d.id)).not.toContain(phone.id);
  });

  it("does not let one account sign out another's device", async () => {
    const theirs = (await as("writer", "get", "/auth/me/sessions").expect(200)).body.data[0].id as string;
    const res = await as("reader", "delete", `/auth/me/sessions/${theirs}`).expect(404);
    expect(res.body.error.code).toBe("DEVICE_NOT_FOUND");
    await as("writer", "get", "/auth/me/sessions").expect(200);
    await api.post("/api/v1/auth/refresh").set("Cookie", cookies.writer!).expect(200);
  });

  it("signs out every other device but keeps this one", async () => {
    await signIn("reader@example.com");
    await signIn("reader@example.com", SAFARI_IOS);
    const res = await as("reader", "post", "/auth/me/sessions/sign-out-others").expect(200);
    expect(res.body.data.signedOut).toBeGreaterThanOrEqual(2);

    const left = (await as("reader", "get", "/auth/me/sessions").expect(200)).body.data as { current: boolean }[];
    expect(left).toHaveLength(1);
    expect(left[0]?.current).toBe(true);
  });
});

describe("the Dispatch from the account", () => {
  it("starts empty, then subscribes at once (the mailbox is already proven)", async () => {
    expect((await as("reader", "get", "/newsletter/mine").expect(200)).body.data).toBeNull();

    const res = await as("reader", "put", "/newsletter/mine").send({ subscribed: true, topics: ["science"], frequency: "weekly" }).expect(200);
    expect(res.body.data).toMatchObject({ email: "reader@example.com", status: "confirmed", frequency: "weekly", topics: ["science"] });

    const { SubscriberModel } = await import("../../src/models/newsletter.model.js");
    const row = await SubscriberModel.findOne({ email: "reader@example.com" }).lean();
    expect(row?.source).toBe("account");
    expect(row?.confirmedAt).toBeTruthy();
  });

  it("changes topics and frequency without losing the other", async () => {
    const res = await as("reader", "put", "/newsletter/mine").send({ subscribed: true, frequency: "monthly" }).expect(200);
    expect(res.body.data).toMatchObject({ frequency: "monthly", topics: ["science"] });
  });

  it("leaves and comes back", async () => {
    const left = await as("reader", "put", "/newsletter/mine").send({ subscribed: false }).expect(200);
    expect(left.body.data.status).toBe("unsubscribed");
    const back = await as("reader", "put", "/newsletter/mine").send({ subscribed: true }).expect(200);
    expect(back.body.data.status).toBe("confirmed");
  });

  it("leaving with no subscription is a quiet no-op", async () => {
    const res = await as("writer", "put", "/newsletter/mine").send({ subscribed: false }).expect(200);
    expect(res.body.data).toBeNull();
  });

  it("is private to a signed-in reader", async () => {
    await api.get("/api/v1/newsletter/mine").expect(401);
    await api.put("/api/v1/newsletter/mine").send({ subscribed: true }).expect(401);
  });
});

describe("the permission table", () => {
  it("is shown to admins only", async () => {
    for (const who of ["reader", "writer", "editor"]) await as(who, "get", "/admin/permissions").expect(403);
    const res = await as("admin", "get", "/admin/permissions").expect(200);
    const { roles } = res.body.data as { roles: { role: string; permissions: string[] }[] };
    expect(roles.map((r) => r.role)).toEqual(["reader", "writer", "editor", "admin"]);
    expect(roles.find((r) => r.role === "reader")?.permissions).toEqual([]);
  });

  it("grows with the role: what a writer may do, an editor and an admin may too", async () => {
    const { roles } = (await as("admin", "get", "/admin/permissions")).body.data as { roles: { role: string; permissions: string[] }[] };
    const held = (r: string) => new Set(roles.find((x) => x.role === r)!.permissions);
    for (const p of held("writer")) expect(held("editor").has(p)).toBe(true);
    for (const p of held("editor")) expect(held("admin").has(p)).toBe(true);
  });

  it("is what the routes actually enforce", async () => {
    const { permissions } = (await as("admin", "get", "/admin/permissions")).body.data as { permissions: { key: string; roles: string[] }[] };
    const roleOf = (key: string) => permissions.find((p) => p.key === key)!.roles;

    // one probe per guard: allowed roles get past the gate (anything but 401/403), the rest are refused
    const probes: [string, "get" | "post", string][] = [
      ["users.manage", "get", "/admin/users"],
      ["audit.view", "get", "/admin/audit"],
      ["comments.moderate", "get", "/admin/comments"],
      ["reports.manage", "get", "/admin/reports"],
      ["searches.view", "get", "/admin/searches"],
      ["newsletter.manage", "get", "/admin/newsletter/subscribers"],
      ["frontpage.edit", "get", "/admin/placements/home"],
      ["stats.view", "get", "/admin/stats"],
      ["media.upload", "get", "/admin/media"],
    ];
    for (const [permission, method, path] of probes) {
      for (const who of ["reader", "writer", "editor", "admin"]) {
        const res = await as(who, method, path);
        const allowed = roleOf(permission).includes(who);
        if (allowed) expect(res.status, `${who} ${path}`).not.toBe(403);
        else expect(res.status, `${who} ${path}`).toBe(403);
      }
    }
  });
});

describe("the overview", () => {
  beforeAll(async () => {
    const { ReadEventModel } = await import("../../src/models/read-event.model.js");
    const { ArticleModel } = await import("../../src/models/article.model.js");
    const { BrokenLinkModel } = await import("../../src/models/broken-link.model.js");
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    // the writer owns one article; traffic lands on it and on one that is not theirs
    await ArticleModel.updateOne({ slug: "human-brain" }, { $set: { createdBy: ids.writer } });
    const rows = [
      { article: "human-brain", viewer: "v1", day: today, completed: true },
      { article: "human-brain", viewer: "v2", day: today, completed: false },
      { article: "human-brain", viewer: "v1", day: yesterday, completed: true },
      { article: "quiet-revolution", viewer: "v1", day: today, completed: true },
    ];
    await ReadEventModel.insertMany(rows);
    await BrokenLinkModel.create({ path: "/gone", count: 3, firstSeenAt: new Date(), lastSeenAt: new Date() });
  });

  it("counts distinct visitor-days and completed reads over the window, one point per day", async () => {
    const res = await as("editor", "get", "/admin/stats?days=7").expect(200);
    const d = res.body.data;
    expect(d.scope).toBe("newsroom");
    expect(d.traffic.series).toHaveLength(7);
    expect(d.traffic.views).toBe(4);
    expect(d.traffic.reads).toBe(3);
    expect(d.top[0]).toMatchObject({ slug: "human-brain", views: 3, reads: 2 });
  });

  it("gives an editor the queues and subscribers, and an admin accounts as well", async () => {
    const editor = (await as("editor", "get", "/admin/stats").expect(200)).body.data;
    expect(editor.queues.brokenLinks).toBe(1);
    expect(editor.subscribers).toBeTruthy();
    expect(editor.users).toBeUndefined();

    const admin = (await as("admin", "get", "/admin/stats").expect(200)).body.data;
    expect(admin.users.writer).toBe(1);
    expect(typeof admin.newUsers).toBe("number");
  });

  it("shows a writer only their own stories, and no reader-facing queues", async () => {
    const d = (await as("writer", "get", "/admin/stats?days=7").expect(200)).body.data;
    expect(d.scope).toBe("own");
    expect(d.traffic.views).toBe(3);
    expect(d.top.map((t: { slug: string }) => t.slug)).toEqual(["human-brain"]);
    expect(d.queues).toBeUndefined();
    expect(d.subscribers).toBeUndefined();
    expect(d.users).toBeUndefined();
  });

  it("rejects a window it does not offer", async () => {
    await as("editor", "get", "/admin/stats?days=45").expect(400);
  });

  it("is closed to readers", async () => {
    await as("reader", "get", "/admin/stats").expect(403);
  });
});
