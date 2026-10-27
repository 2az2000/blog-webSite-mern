/**
 * The NOVA Dispatch over real HTTP: double opt-in, leaving from any e-mail, and the
 * editors' issues — built, tested, scheduled and sent in resumable batches to exactly
 * the people they are for.
 *
 * Run: `npm run test:api`
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import type { mailOutbox as mailOutboxFn } from "../../src/services/email/email.service.js";

let mongod: MongoMemoryServer | undefined;
let api: ReturnType<typeof request>;
let editorToken = "";
let readerToken = "";
let adminToken = "";
let editorId = "";

let mailOutbox: typeof mailOutboxFn;
let clearMail: () => void;
let manageToken: (id: string) => string;

const editorGet = (path: string) => api.get(`/api/v1${path}`).set("Authorization", `Bearer ${editorToken}`);
const editorPost = (path: string, body?: object) => api.post(`/api/v1${path}`).set("Authorization", `Bearer ${editorToken}`).send(body);
const sign = (email: string, extra: object = {}) => api.post("/api/v1/newsletter/subscribe").send({ email, ...extra });

/** The confirmation token the e-mail carries. */
const confirmTokenFor = (email: string): string => {
  const mail = [...mailOutbox()].reverse().find((m) => m.to === email && m.subject.startsWith("Confirm"));
  const token = mail?.text.match(/token=([A-Za-z0-9_-]+)/)?.[1];
  if (!token) throw new Error(`no confirmation mail for ${email}`);
  return token;
};

const subscriberId = async (email: string): Promise<string> => {
  const { SubscriberModel } = await import("../../src/models/newsletter.model.js");
  return (await SubscriberModel.findOne({ email }))!._id.toString();
};

/** A confirmed subscriber, made directly (the opt-in flow has its own tests). */
const confirmed = async (email: string, extra: Record<string, unknown> = {}) => {
  const { SubscriberModel } = await import("../../src/models/newsletter.model.js");
  return SubscriberModel.create({ email, status: "confirmed", consentAt: new Date(), confirmedAt: new Date(), ...extra });
};

const newIssue = async (kind: string, articles: string[], extra: object = {}) =>
  (await editorPost("/admin/newsletter/issues", { kind, subject: `Issue ${kind}`, note: "Hello.\n\nSecond paragraph.", articles, ...extra }).expect(201)).body.data as {
    id: string;
  };

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URL = mongod.getUri("nova-newsletter-tests");
  process.env.CRON_SECRET = "cron-secret-for-tests";

  const { connectDb } = await import("../../src/db/connect.js");
  await connectDb();
  const { seedContent } = await import("../../src/modules/content/content.seed.js");
  await seedContent();

  const mail = await import("../../src/services/email/email.service.js");
  mailOutbox = mail.mailOutbox;
  clearMail = mail.clearMailOutboxForTests;
  manageToken = (await import("../../src/modules/newsletter/newsletter-rules.js")).manageToken;

  const { UserModel } = await import("../../src/models/user.model.js");
  const { signAccessToken } = await import("../../src/http/auth.js");
  for (const who of ["reader", "editor", "admin"] as const) {
    const user = await UserModel.create({ name: who, email: `${who}@example.com`, passwordHash: "x".repeat(60), role: who, emailVerified: true });
    const token = signAccessToken(user._id.toString(), who);
    if (who === "reader") readerToken = token;
    if (who === "editor") {
      editorToken = token;
      editorId = user._id.toString();
    }
    if (who === "admin") adminToken = token;
  }

  const { createApp } = await import("../../src/app.js");
  api = request(createApp());
}, 120_000);

afterAll(async () => {
  const { disconnectDb } = await import("../../src/db/connect.js");
  await disconnectDb();
  await mongod?.stop();
});

beforeEach(() => {
  clearMail();
});

describe("subscribing (double opt-in)", () => {
  it("answers the same, and sends a confirmation, for a new address", async () => {
    const res = await sign("ann@example.com", { topics: ["technology"], frequency: "weekly", source: "band" }).expect(202);
    expect(res.body).toEqual({ data: { ok: true } });
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(mailOutbox()).toHaveLength(1);
    expect(mailOutbox()[0]).toMatchObject({ to: "ann@example.com", subject: "Confirm your NOVA Dispatch subscription" });

    const { SubscriberModel } = await import("../../src/models/newsletter.model.js");
    const sub = await SubscriberModel.findOne({ email: "ann@example.com" });
    expect(sub).toMatchObject({ status: "pending", frequency: "weekly", topics: ["technology"], source: "band" });
  });

  it("sends nothing until the address confirms: a pending address is not on the list", async () => {
    await sign("pending@example.com").expect(202);
    const { SubscriberModel } = await import("../../src/models/newsletter.model.js");
    expect(await SubscriberModel.countDocuments({ email: "pending@example.com", status: "confirmed" })).toBe(0);
  });

  it("does not mail a pending address twice in a row, but takes its newest choices", async () => {
    await sign("twice@example.com", { frequency: "both" }).expect(202);
    clearMail();
    await sign("twice@example.com", { frequency: "monthly", topics: ["design"] }).expect(202);
    expect(mailOutbox()).toHaveLength(0);
    const { SubscriberModel } = await import("../../src/models/newsletter.model.js");
    expect(await SubscriberModel.findOne({ email: "twice@example.com" })).toMatchObject({ frequency: "monthly", topics: ["design"] });
  });

  it("gives away nothing about an address that is already subscribed", async () => {
    await confirmed("known@example.com");
    const known = await sign("known@example.com").expect(202);
    const fresh = await sign("stranger@example.com").expect(202);
    expect(known.body).toEqual(fresh.body);
    expect(mailOutbox().map((m) => m.to)).not.toContain("known@example.com");
  });

  it("says so, with a 503, when the confirmation e-mail cannot be sent", async () => {
    const { mailer } = await import("../../src/services/email/email.service.js");
    const spy = vi.spyOn(mailer, "send").mockRejectedValueOnce(new Error("provider down"));
    try {
      const res = await sign("undeliverable@example.com").expect(503);
      expect(res.body.error.code).toBe("EMAIL_UNAVAILABLE");
    } finally {
      spy.mockRestore();
    }
  });

  it("validates the address and the choices", async () => {
    expect((await sign("not-an-email").expect(400)).body.error.code).toBe("VALIDATION_ERROR");
    await sign("a@b.co", { frequency: "daily" }).expect(400);
    await sign("a@b.co", { topics: Array.from({ length: 13 }, (_, i) => `t${i}`) }).expect(400);
  });
});

describe("confirming", () => {
  it("turns a pending address into a subscriber, and tolerates more clicks", async () => {
    await sign("click@example.com").expect(202);
    const token = confirmTokenFor("click@example.com");
    const first = await api.post("/api/v1/newsletter/confirm").send({ token }).expect(200);
    expect(first.body.data).toMatchObject({ email: "click@example.com", status: "confirmed", frequency: "both" });
    // the site offers "choose your topics" straight away, using a link key for this subscriber
    const { readManageToken } = await import("../../src/modules/newsletter/newsletter-rules.js");
    expect(readManageToken(first.body.data.manageToken)).toBe(await subscriberId("click@example.com"));
    // a mail scanner may have opened the link first: the reader’s own click must still work
    expect((await api.post("/api/v1/newsletter/confirm").send({ token }).expect(200)).body.data.status).toBe("confirmed");
    // but once they leave, the old link no longer brings them back
    await api.post("/api/v1/newsletter/unsubscribe").send({ token: first.body.data.manageToken }).expect(200);
    expect((await api.post("/api/v1/newsletter/confirm").send({ token }).expect(400)).body.error.code).toBe("CONFIRM_TOKEN_INVALID");
  });

  it("refuses an unknown token", async () => {
    const res = await api.post("/api/v1/newsletter/confirm").send({ token: "x".repeat(40) }).expect(400);
    expect(res.body.error.code).toBe("CONFIRM_TOKEN_INVALID");
  });

  it("refuses an expired link", async () => {
    await sign("late@example.com").expect(202);
    const token = confirmTokenFor("late@example.com");
    const { SubscriberModel } = await import("../../src/models/newsletter.model.js");
    await SubscriberModel.collection.updateOne({ email: "late@example.com" }, { $set: { confirmSentAt: new Date(Date.now() - 8 * 86_400_000) } });
    expect((await api.post("/api/v1/newsletter/confirm").send({ token }).expect(400)).body.error.code).toBe("CONFIRM_TOKEN_EXPIRED");
  });
});

describe("managing and leaving, from any e-mail", () => {
  let id = "";
  let token = "";
  beforeAll(async () => {
    await confirmed("manage@example.com", { frequency: "both", topics: [] });
    id = await subscriberId("manage@example.com");
    token = manageToken(id);
  });

  it("shows the preferences the link belongs to", async () => {
    const res = await api.post("/api/v1/newsletter/manage").send({ token }).expect(200);
    expect(res.body.data).toEqual({ email: "manage@example.com", status: "confirmed", frequency: "both", topics: [] });
  });

  it("refuses a forged or foreign link", async () => {
    const other = (await confirmed("other@example.com"))._id.toString();
    const forged = `${other}.${token.split(".")[1]}`;
    expect((await api.post("/api/v1/newsletter/manage").send({ token: forged }).expect(404)).body.error.code).toBe("SUBSCRIPTION_NOT_FOUND");
    await api.post("/api/v1/newsletter/manage").send({ token: "garbage-token-value" }).expect(404);
  });

  it("changes frequency and topics", async () => {
    const res = await api.patch("/api/v1/newsletter/manage").send({ token, frequency: "weekly", topics: ["opinion", "longreads"] }).expect(200);
    expect(res.body.data).toMatchObject({ frequency: "weekly", topics: ["opinion", "longreads"] });
    await api.patch("/api/v1/newsletter/manage").send({ token }).expect(400);
  });

  it("leaves in one click from the mail client (RFC 8058: token in the query, form body)", async () => {
    const res = await api
      .post(`/api/v1/newsletter/unsubscribe?token=${encodeURIComponent(token)}`)
      .type("form")
      .send("List-Unsubscribe=One-Click")
      .expect(200);
    expect(res.body.data.status).toBe("unsubscribed");
  });

  it("leaves again, harmlessly, from the site's own button", async () => {
    expect((await api.post("/api/v1/newsletter/unsubscribe").send({ token }).expect(200)).body.data.status).toBe("unsubscribed");
    await api.post("/api/v1/newsletter/unsubscribe").expect(400);
  });

  it("comes back with the same link, and signing up fresh after leaving needs a new confirmation", async () => {
    expect((await api.post("/api/v1/newsletter/resubscribe").send({ token }).expect(200)).body.data.status).toBe("confirmed");
    await api.post("/api/v1/newsletter/unsubscribe").send({ token }).expect(200);
    clearMail();
    await sign("manage@example.com").expect(202);
    expect(mailOutbox().map((m) => m.to)).toContain("manage@example.com");
    const { SubscriberModel } = await import("../../src/models/newsletter.model.js");
    expect((await SubscriberModel.findOne({ email: "manage@example.com" }))?.status).toBe("pending");
  });
});

describe("building an issue (editors)", () => {
  it("is for editors only", async () => {
    await api.get("/api/v1/admin/newsletter/issues").expect(401);
    await api.get("/api/v1/admin/newsletter/issues").set("Authorization", `Bearer ${readerToken}`).expect(403);
  });

  it("creates a draft from published stories only", async () => {
    const issue = await newIssue("friday", ["context-software", "human-brain"]);
    const got = (await editorGet(`/admin/newsletter/issues/${issue.id}`).expect(200)).body.data;
    expect(got).toMatchObject({ kind: "friday", status: "draft", articles: ["context-software", "human-brain"], sent: 0 });

    const { ArticleModel } = await import("../../src/models/article.model.js");
    await ArticleModel.updateOne({ slug: "ocean-floor" }, { status: "draft" });
    const res = await editorPost("/admin/newsletter/issues", { kind: "friday", subject: "S", articles: ["ocean-floor", "nope"] }).expect(422);
    expect(res.body.error.code).toBe("UNKNOWN_ARTICLE");
    await ArticleModel.updateOne({ slug: "ocean-floor" }, { status: "published" });
  });

  it("validates the shape", async () => {
    await editorPost("/admin/newsletter/issues", { kind: "daily", subject: "S" }).expect(400);
    await editorPost("/admin/newsletter/issues", { kind: "friday", subject: "" }).expect(400);
    const nine = Array.from({ length: 9 }, (_, i) => `s-${i}`);
    await editorPost("/admin/newsletter/issues", { kind: "friday", subject: "S", articles: nine }).expect(400);
  });

  it("edits a draft, and sends a test to the editor only", async () => {
    const issue = await newIssue("tuesday", ["quiet-office"]);
    await api.patch(`/api/v1/admin/newsletter/issues/${issue.id}`).set("Authorization", `Bearer ${editorToken}`).send({ subject: "Renamed", articles: ["quiet-office", "slow-fashion"] }).expect(200);
    const res = await editorPost(`/admin/newsletter/issues/${issue.id}/test`).expect(200);
    expect(res.body.data).toEqual({ to: "editor@example.com" });
    expect(mailOutbox()).toHaveLength(1);
    expect(mailOutbox()[0]).toMatchObject({ to: "editor@example.com", subject: "[TEST] Renamed" });
    expect(mailOutbox()[0]!.text).toContain("slow-fashion");
  });

  it("will not send or schedule an issue with no stories", async () => {
    const empty = await newIssue("friday", []);
    expect((await editorPost(`/admin/newsletter/issues/${empty.id}/send`).expect(422)).body.error.code).toBe("ISSUE_INCOMPLETE");
    expect((await editorPost(`/admin/newsletter/issues/${empty.id}/schedule`, { at: new Date(Date.now() + 3_600_000).toISOString() }).expect(422)).body.error.code).toBe("ISSUE_INCOMPLETE");
  });

  it("schedules at least five minutes ahead, and can take a schedule back", async () => {
    const issue = await newIssue("friday", ["context-software"]);
    expect((await editorPost(`/admin/newsletter/issues/${issue.id}/schedule`, { at: new Date(Date.now() + 60_000).toISOString() }).expect(400)).body.error.code).toBe("SCHEDULE_TOO_SOON");
    const scheduled = await editorPost(`/admin/newsletter/issues/${issue.id}/schedule`, { at: new Date(Date.now() + 3_600_000).toISOString() }).expect(200);
    expect(scheduled.body.data.status).toBe("scheduled");
    const back = await editorPost(`/admin/newsletter/issues/${issue.id}/unschedule`).expect(200);
    expect(back.body.data).toMatchObject({ status: "draft", scheduledFor: null });
  });

  it("deletes only drafts", async () => {
    const issue = await newIssue("friday", ["context-software"]);
    await api.delete(`/api/v1/admin/newsletter/issues/${issue.id}`).set("Authorization", `Bearer ${editorToken}`).expect(204);
    await editorGet(`/admin/newsletter/issues/${issue.id}`).expect(404);
  });
});

describe("sending", () => {
  beforeAll(async () => {
    const { SubscriberModel, IssueModel, DeliveryModel } = await import("../../src/models/newsletter.model.js");
    await Promise.all([SubscriberModel.deleteMany({}), IssueModel.deleteMany({}), DeliveryModel.deleteMany({})]);
    await confirmed("both@example.com", { frequency: "both" });
    await confirmed("weekly@example.com", { frequency: "weekly" });
    await confirmed("monthly@example.com", { frequency: "monthly" });
    await confirmed("tech@example.com", { frequency: "both", topics: ["technology"] });
    await confirmed("opinion@example.com", { frequency: "both", topics: ["opinion"] });
    await SubscriberModel.create({ email: "left@example.com", status: "unsubscribed", frequency: "both", consentAt: new Date() });
    await SubscriberModel.create({ email: "waiting@example.com", status: "pending", frequency: "both", consentAt: new Date() });
  });

  it("sends a Friday issue to 'both' and 'weekly' who want its topics, and to nobody else", async () => {
    // context-software is a technology story: the opinion-only subscriber is not interested
    const issue = await newIssue("friday", ["context-software"]);
    const res = await editorPost(`/admin/newsletter/issues/${issue.id}/send`).expect(200);
    expect(res.body.data).toMatchObject({ status: "sent", sent: 3, failed: 0, skipped: 1 });
    expect(mailOutbox().map((m) => m.to).sort()).toEqual(["both@example.com", "tech@example.com", "weekly@example.com"]);

    // every message carries its own manage link and one-click unsubscribe
    const mail = mailOutbox().find((m) => m.to === "both@example.com")!;
    const id = await subscriberId("both@example.com");
    expect(mail.text).toContain(`token=${encodeURIComponent(manageToken(id))}`);
    expect(mail.headers?.["List-Unsubscribe"]).toContain(encodeURIComponent(manageToken(id)));
    expect(mail.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(mail.subject).toBe("Issue friday");
  });

  it("will not send a sent issue again, or let it be edited", async () => {
    const { IssueModel } = await import("../../src/models/newsletter.model.js");
    const sent = (await IssueModel.findOne({ status: "sent" }))!._id.toString();
    expect((await editorPost(`/admin/newsletter/issues/${sent}/send`).expect(409)).body.error.code).toBe("ISSUE_LOCKED");
    await api.patch(`/api/v1/admin/newsletter/issues/${sent}`).set("Authorization", `Bearer ${editorToken}`).send({ subject: "x" }).expect(409);
    await api.delete(`/api/v1/admin/newsletter/issues/${sent}`).set("Authorization", `Bearer ${editorToken}`).expect(409);
  });

  it("sends the monthly digest only to monthly subscribers", async () => {
    clearMail();
    const issue = await newIssue("monthly", ["grid-rebuild"]);
    await editorPost(`/admin/newsletter/issues/${issue.id}/send`).expect(200);
    expect(mailOutbox().map((m) => m.to)).toEqual(["monthly@example.com"]);
  });

  it("matches a long-read issue to the 'longreads' topic", async () => {
    const { SubscriberModel } = await import("../../src/models/newsletter.model.js");
    await confirmed("longreads@example.com", { frequency: "monthly", topics: ["longreads"] });
    await confirmed("design@example.com", { frequency: "monthly", topics: ["design"] });
    clearMail();
    const issue = await newIssue("monthly", ["grid-rebuild"]);
    await editorPost(`/admin/newsletter/issues/${issue.id}/send`).expect(200);
    expect(mailOutbox().map((m) => m.to).sort()).toEqual(["longreads@example.com", "monthly@example.com"]);
    await SubscriberModel.deleteMany({ email: { $in: ["longreads@example.com", "design@example.com"] } });
  });

  it("works through a long list in resumable batches, and never mails anyone twice", async () => {
    const { SubscriberModel, DeliveryModel, IssueModel } = await import("../../src/models/newsletter.model.js");
    const { advanceIssue } = await import("../../src/modules/newsletter/newsletter.service.js");
    const { Types } = await import("mongoose");
    await SubscriberModel.deleteMany({});
    for (let i = 0; i < 7; i += 1) await confirmed(`batch${i}@example.com`, { frequency: "both" });
    clearMail();

    const issue = await newIssue("tuesday", ["context-software"]);
    await IssueModel.updateOne({ _id: issue.id }, { status: "sending", startedAt: new Date() });
    const id = new Types.ObjectId(issue.id);

    expect(await advanceIssue(id, 3)).toEqual({ handled: 3, done: false });
    expect(mailOutbox()).toHaveLength(3);
    // a second worker running at the same moment: the deliveries already claimed are skipped, not repeated
    await IssueModel.updateOne({ _id: id }, { $unset: { cursor: 1 } });
    expect((await advanceIssue(id, 3)).handled).toBe(3);
    expect(mailOutbox()).toHaveLength(3);
    await IssueModel.updateOne({ _id: id }, { $set: { cursor: (await DeliveryModel.find({ issue: id }).sort({ subscriber: 1 }).limit(3).lean()).at(-1)!.subscriber } });

    expect(await advanceIssue(id, 3)).toEqual({ handled: 3, done: false });
    expect(await advanceIssue(id, 3)).toEqual({ handled: 1, done: true });
    expect(mailOutbox()).toHaveLength(7);
    expect(new Set(mailOutbox().map((m) => m.to)).size).toBe(7);
    expect(await DeliveryModel.countDocuments({ issue: id })).toBe(7);
    expect(await IssueModel.findById(id)).toMatchObject({ status: "sent", sent: 7 });
  });

  it("records a failed delivery and carries on with everyone else", async () => {
    const { SubscriberModel, DeliveryModel } = await import("../../src/models/newsletter.model.js");
    const { mailer } = await import("../../src/services/email/email.service.js");
    await SubscriberModel.deleteMany({});
    await confirmed("fine1@example.com");
    await confirmed("broken@example.com");
    await confirmed("fine2@example.com");
    const real = mailer.send.bind(mailer);
    const spy = vi.spyOn(mailer, "send").mockImplementation(async (m) => {
      if (m.to === "broken@example.com") throw new Error("mailbox unavailable");
      return real(m);
    });
    try {
      clearMail();
      const issue = await newIssue("tuesday", ["human-brain"]);
      const res = await editorPost(`/admin/newsletter/issues/${issue.id}/send`).expect(200);
      expect(res.body.data).toMatchObject({ status: "sent", sent: 2, failed: 1 });
      expect(await DeliveryModel.findOne({ status: "failed" })).toMatchObject({ error: "mailbox unavailable" });
    } finally {
      spy.mockRestore();
    }
  });
});

describe("scheduled issues and the cron", () => {
  it("keeps the cron endpoint closed without the secret", async () => {
    await api.get("/api/v1/internal/run-issues").expect(401);
    await api.get("/api/v1/internal/run-issues").set("Authorization", "Bearer nope").expect(401);
  });

  it("starts an issue whose time has come, and sends it", async () => {
    const { SubscriberModel, IssueModel } = await import("../../src/models/newsletter.model.js");
    await SubscriberModel.deleteMany({});
    await confirmed("cron1@example.com");
    await confirmed("cron2@example.com");
    clearMail();

    const issue = await newIssue("tuesday", ["quiet-office"]);
    await editorPost(`/admin/newsletter/issues/${issue.id}/schedule`, { at: new Date(Date.now() + 3_600_000).toISOString() }).expect(200);

    // not due yet: nothing goes out
    const early = await api.get("/api/v1/internal/run-issues").set("Authorization", "Bearer cron-secret-for-tests").expect(200);
    expect(early.body.data).toMatchObject({ started: 0, handled: 0 });
    expect(mailOutbox()).toHaveLength(0);

    await IssueModel.updateOne({ _id: issue.id }, { scheduledFor: new Date(Date.now() - 1000) });
    const run = await api.get("/api/v1/internal/run-issues").set("Authorization", "Bearer cron-secret-for-tests").expect(200);
    expect(run.body.data).toMatchObject({ started: 1, handled: 2, pending: 0 });
    expect(mailOutbox().map((m) => m.to).sort()).toEqual(["cron1@example.com", "cron2@example.com"]);
    expect((await editorGet(`/admin/newsletter/issues/${issue.id}`)).body.data.status).toBe("sent");
  });
});

describe("what readers and editors see", () => {
  it("shows the latest sent issue publicly, with its stories", async () => {
    const res = await api.get("/api/v1/newsletter/issues/latest").expect(200);
    expect(res.headers["cache-control"]).toContain("s-maxage=60");
    expect(res.body.data).toMatchObject({ subject: "Issue tuesday", kind: "tuesday" });
    expect(res.body.data.articles[0]).toHaveProperty("authorRef");
  });

  it("is null before anything has been sent", async () => {
    const { IssueModel } = await import("../../src/models/newsletter.model.js");
    const keep = await IssueModel.find({ status: "sent" }).lean();
    await IssueModel.deleteMany({ status: "sent" });
    expect((await api.get("/api/v1/newsletter/issues/latest").expect(200)).body.data).toBeNull();
    await IssueModel.insertMany(keep);
  });

  it("lists subscribers with counts by status, searchable", async () => {
    const { SubscriberModel } = await import("../../src/models/newsletter.model.js");
    await SubscriberModel.create({ email: "gone@example.com", status: "unsubscribed", consentAt: new Date() });
    const res = await editorGet("/admin/newsletter/subscribers?limit=100").expect(200);
    expect(res.body.page.counts).toMatchObject({ confirmed: expect.any(Number), unsubscribed: expect.any(Number) });
    expect(res.body.data[0]).not.toHaveProperty("confirmTokenHash");
    const one = await editorGet("/admin/newsletter/subscribers?q=gone@").expect(200);
    expect(one.body.data.map((s: { email: string }) => s.email)).toEqual(["gone@example.com"]);
    expect((await editorGet("/admin/newsletter/subscribers?status=unsubscribed").expect(200)).body.data.every((s: { status: string }) => s.status === "unsubscribed")).toBe(true);
  });

  it("lets only an admin erase an address", async () => {
    const id = await subscriberId("gone@example.com");
    await api.delete(`/api/v1/admin/newsletter/subscribers/${id}`).set("Authorization", `Bearer ${editorToken}`).expect(403);
    await api.delete(`/api/v1/admin/newsletter/subscribers/${id}`).set("Authorization", `Bearer ${adminToken}`).expect(204);
    const { SubscriberModel } = await import("../../src/models/newsletter.model.js");
    expect(await SubscriberModel.exists({ email: "gone@example.com" })).toBeNull();
  });

  it("writes the editors' decisions to the audit trail", async () => {
    const { AuditLogModel } = await import("../../src/models/audit-log.model.js");
    expect(await AuditLogModel.countDocuments({ action: "newsletter.issue.send" })).toBeGreaterThan(0);
    expect(await AuditLogModel.countDocuments({ action: "newsletter.issue.create", actor: editorId })).toBeGreaterThan(0);
  });
});

