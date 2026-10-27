/**
 * The NOVA Dispatch: subscribing with double opt-in, managing or leaving from
 * any e-mail without an account, and the editors' issues — built, scheduled,
 * tested and sent in batches that can be resumed.
 *
 * Nothing here ever sends to an address that has not confirmed itself, to one
 * that left, or twice to the same one.
 */
import { randomBytes } from "node:crypto";
import { Types } from "mongoose";
import { env } from "../../config/env.js";
import { POLICY_VERSION } from "../../config/legal.js";
import { ArticleModel } from "../../models/article.model.js";
import {
  DeliveryModel,
  IssueModel,
  SubscriberModel,
  type Frequency,
  type IssueShape,
  type SubscriberShape,
} from "../../models/newsletter.model.js";
import { UserModel } from "../../models/user.model.js";
import { AppError, badRequest, conflict, notFound } from "../../http/errors.js";
import { audit, type Actor } from "../../services/audit.service.js";
import { mailer } from "../../services/email/email.service.js";
import { revalidate } from "../../services/revalidate.service.js";
import { confirmationMail, issueMail, type IssueStory } from "../../services/email/newsletter-mail.js";
import { hashToken } from "../../services/token.service.js";
import { summariesBySlugs } from "../content/content.service.js";
import {
  CONFIRM_RESEND_AFTER_MS,
  CONFIRM_TTL_MS,
  frequenciesFor,
  issueFitsTopics,
  manageToken,
  readManageToken,
  topicsOfIssue,
} from "./newsletter-rules.js";
import type { IssueInput, SubscribeInput } from "./newsletter.schemas.js";

type SubDoc = SubscriberShape & { _id: Types.ObjectId };
type IssueDoc = IssueShape & { _id: Types.ObjectId };

const oid = (id: string): Types.ObjectId => {
  if (!/^[a-f0-9]{24}$/.test(id)) throw badRequest("Not a valid id", "INVALID_ID");
  return new Types.ObjectId(id);
};

/* — Subscribing ————————————————————————————————————————— */

/** A fresh confirmation token; only its hash is stored. */
async function sendConfirmation(sub: SubDoc): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  await SubscriberModel.updateOne({ _id: sub._id }, { $set: { confirmTokenHash: hashToken(token), confirmSentAt: new Date() } });
  try {
    await mailer.send(confirmationMail(sub.email, token));
  } catch {
    // say so: a sign-up that silently sends nothing would leave the reader waiting for a mail that never comes
    throw new AppError(503, "EMAIL_UNAVAILABLE", "We could not send the confirmation e-mail. Try again in a little while.");
  }
}

/**
 * Asks for the Dispatch. The answer never says whether the address was already
 * known (that would tell anyone with an e-mail address who reads us): a new or
 * pending address is sent a confirmation; one already confirmed is left alone.
 * Someone who left and signs up again starts over and must confirm again.
 */
export async function subscribe(input: SubscribeInput): Promise<void> {
  const now = new Date();
  const existing = await SubscriberModel.findOne({ email: input.email }).lean<SubDoc>();

  if (existing?.status === "confirmed") return;

  if (existing?.status === "pending") {
    // keep what they ask for now; resend the link, but not in a flood
    await SubscriberModel.updateOne({ _id: existing._id }, { $set: { topics: input.topics, frequency: input.frequency } });
    if (!existing.confirmSentAt || now.getTime() - existing.confirmSentAt.getTime() >= CONFIRM_RESEND_AFTER_MS) {
      await sendConfirmation({ ...existing, topics: input.topics, frequency: input.frequency });
    }
    return;
  }

  const sub = await SubscriberModel.findOneAndUpdate(
    { email: input.email },
    {
      $set: { status: "pending", topics: input.topics, frequency: input.frequency, source: input.source, consentAt: now, consentVersion: POLICY_VERSION },
      $unset: { unsubscribedAt: 1, confirmedAt: 1 },
    },
    { upsert: true, returnDocument: "after" },
  ).lean<SubDoc>();
  await sendConfirmation(sub!);
}

export interface Preferences {
  email: string;
  status: SubscriberShape["status"];
  frequency: Frequency;
  topics: string[];
}

const prefsOf = (s: SubDoc): Preferences => ({ email: s.email, status: s.status, frequency: s.frequency, topics: s.topics });

/** The e-mail link the browser landed on: confirms the subscription it was sent for. */
/** The preferences, plus the link key the site needs to offer "choose your topics" right after confirming. */
export async function confirm(token: string): Promise<Preferences & { manageToken: string }> {
  const sub = await SubscriberModel.findOne({ confirmTokenHash: hashToken(token) }, "+confirmTokenHash").lean<SubDoc>();
  const invalid = () => new AppError(400, "CONFIRM_TOKEN_INVALID", "This confirmation link is not valid. Ask for a new one.");
  if (!sub) throw invalid();
  if (sub.status === "unsubscribed") throw invalid();
  if (sub.status === "pending" && (!sub.confirmSentAt || Date.now() - sub.confirmSentAt.getTime() > CONFIRM_TTL_MS)) {
    throw new AppError(400, "CONFIRM_TOKEN_EXPIRED", "This confirmation link has expired. Sign up again for a new one.");
  }
  if (sub.status === "pending") {
    const done = await SubscriberModel.findOneAndUpdate(
      { _id: sub._id, status: "pending" },
      // the link keeps working after the first click: mail scanners open links before the reader does
      { $set: { status: "confirmed", confirmedAt: new Date() } },
      { returnDocument: "after" },
    ).lean<SubDoc>();
    const now = done ?? sub;
    return { ...prefsOf(now), manageToken: manageToken(now._id.toString()) };
  }
  return { ...prefsOf(sub), manageToken: manageToken(sub._id.toString()) }; // clicked twice: still confirmed
}

/* — Managing, from any issue ———————————————————————————————— */

async function bySubscriberToken(token: string): Promise<SubDoc> {
  const id = readManageToken(token);
  const sub = id ? await SubscriberModel.findById(id).lean<SubDoc>() : null;
  if (!sub) throw new AppError(404, "SUBSCRIPTION_NOT_FOUND", "This link is not valid. Use the one in your most recent issue.");
  return sub;
}

export async function getPreferences(token: string): Promise<Preferences> {
  return prefsOf(await bySubscriberToken(token));
}

export async function updatePreferences(token: string, patch: { topics?: string[]; frequency?: Frequency }): Promise<Preferences> {
  const sub = await bySubscriberToken(token);
  const updated = await SubscriberModel.findOneAndUpdate({ _id: sub._id }, { $set: patch }, { returnDocument: "after" }).lean<SubDoc>();
  return prefsOf(updated!);
}

/** Leaving takes one request, from the e-mail's own link, with nothing to answer first. */
export async function unsubscribe(token: string): Promise<Preferences> {
  const sub = await bySubscriberToken(token);
  if (sub.status === "unsubscribed") return prefsOf(sub);
  const updated = await SubscriberModel.findOneAndUpdate(
    { _id: sub._id },
    { $set: { status: "unsubscribed", unsubscribedAt: new Date() }, $unset: { confirmTokenHash: 1 } },
    { returnDocument: "after" },
  ).lean<SubDoc>();
  return prefsOf(updated!);
}

/** Coming back after leaving. The link proves the mailbox is theirs, so no second confirmation. */
export async function resubscribe(token: string): Promise<Preferences> {
  const sub = await bySubscriberToken(token);
  if (sub.status === "confirmed") return prefsOf(sub);
  const updated = await SubscriberModel.findOneAndUpdate(
    { _id: sub._id },
    { $set: { status: "confirmed", confirmedAt: new Date(), consentAt: new Date(), consentVersion: POLICY_VERSION }, $unset: { unsubscribedAt: 1, confirmTokenHash: 1 } },
    { returnDocument: "after" },
  ).lean<SubDoc>();
  return prefsOf(updated!);
}

/* — From a signed-in account ——————————————————————————————— */

/**
 * The Dispatch as the account's own address sees it, or null if that address never asked.
 * A signed-in reader has proved the mailbox (sign-in needs the verified address), so
 * managing the subscription here needs no link from an e-mail.
 */
export async function mySubscription(email: string): Promise<Preferences | null> {
  const sub = await SubscriberModel.findOne({ email }).lean<SubDoc>();
  return sub ? prefsOf(sub) : null;
}

export async function setMySubscription(
  email: string,
  input: { subscribed: boolean; topics?: string[]; frequency?: Frequency },
): Promise<Preferences | null> {
  const now = new Date();
  const existing = await SubscriberModel.findOne({ email }).lean<SubDoc>();

  if (!input.subscribed) {
    if (!existing || existing.status === "unsubscribed") return existing ? prefsOf(existing) : null;
    const left = await SubscriberModel.findOneAndUpdate(
      { _id: existing._id },
      { $set: { status: "unsubscribed", unsubscribedAt: now }, $unset: { confirmTokenHash: 1 } },
      { returnDocument: "after" },
    ).lean<SubDoc>();
    return prefsOf(left!);
  }

  const topics = input.topics ?? existing?.topics ?? [];
  const frequency = input.frequency ?? existing?.frequency ?? "both";
  const sub = await SubscriberModel.findOneAndUpdate(
    { email },
    {
      $set: {
        status: "confirmed",
        topics,
        frequency,
        // asking again while already subscribed keeps the original consent; coming (back) in records it afresh
        ...(existing?.status === "confirmed" ? {} : { consentAt: now, consentVersion: POLICY_VERSION, confirmedAt: now }),
      },
      $setOnInsert: { source: "account" },
      $unset: { unsubscribedAt: 1, confirmTokenHash: 1 },
    },
    { upsert: true, returnDocument: "after" },
  ).lean<SubDoc>();
  return prefsOf(sub!);
}

/* — Issues: reading ————————————————————————————————————————— */

const issueView = (i: IssueDoc) => ({
  id: i._id.toString(),
  kind: i.kind,
  subject: i.subject,
  note: i.note,
  articles: i.articles,
  status: i.status,
  scheduledFor: i.scheduledFor ?? null,
  startedAt: i.startedAt ?? null,
  sentAt: i.sentAt ?? null,
  sent: i.sent,
  failed: i.failed,
  skipped: i.skipped,
  updatedAt: i.updatedAt,
});

/** The most recently sent issue, with its stories resolved — the "A recent issue" section. */
export async function latestIssue() {
  const issue = await IssueModel.findOne({ status: "sent" }).sort({ sentAt: -1, _id: -1 }).lean<IssueDoc>();
  if (!issue) return null;
  return { subject: issue.subject, note: issue.note, kind: issue.kind, sentAt: issue.sentAt ?? null, articles: await summariesBySlugs(issue.articles) };
}

/* — Issues: the editors' side ———————————————————————————————— */

async function loadIssue(id: string): Promise<IssueDoc> {
  const issue = await IssueModel.findById(oid(id)).lean<IssueDoc>();
  if (!issue) throw notFound("Issue not found", "ISSUE_NOT_FOUND");
  return issue;
}

/** Only published stories may go into an issue, so a link in an e-mail never leads to a 404. */
async function assertPublished(slugs: string[]): Promise<void> {
  if (slugs.length === 0) return;
  const live = await ArticleModel.find({ slug: { $in: slugs }, status: "published" }, { slug: 1 }).lean();
  const ok = new Set(live.map((a) => a.slug));
  const missing = slugs.filter((s) => !ok.has(s));
  if (missing.length > 0) {
    throw new AppError(422, "UNKNOWN_ARTICLE", "Only published stories can go into an issue", missing.map((path) => ({ path, message: "not a published article" })));
  }
}

const editable = (i: IssueDoc) => i.status === "draft" || i.status === "scheduled";

export async function listIssues(q: { page: number; limit: number }) {
  const [rows, total] = await Promise.all([
    IssueModel.find().sort({ updatedAt: -1, _id: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean<IssueDoc[]>(),
    IssueModel.countDocuments(),
  ]);
  return { items: rows.map(issueView), total, page: q.page, limit: q.limit };
}

export async function getIssue(id: string) {
  return issueView(await loadIssue(id));
}

export async function createIssue(actor: Actor, input: IssueInput) {
  await assertPublished(input.articles);
  const created = await IssueModel.create({ ...input, status: "draft", createdBy: actor.id });
  await audit(actor, "newsletter.issue.create", "newsletter-issue", created._id.toString(), { subject: input.subject });
  return issueView(created.toObject() as unknown as IssueDoc);
}

export async function updateIssue(actor: Actor, id: string, patch: Partial<IssueInput>) {
  const issue = await loadIssue(id);
  if (!editable(issue)) throw conflict("An issue that is sending or sent cannot be changed", "ISSUE_LOCKED");
  if (patch.articles) await assertPublished(patch.articles);
  const updated = await IssueModel.findOneAndUpdate({ _id: issue._id, status: issue.status }, { $set: patch }, { returnDocument: "after" }).lean<IssueDoc>();
  if (!updated) throw conflict("The issue changed while you were editing", "ISSUE_CHANGED");
  await audit(actor, "newsletter.issue.update", "newsletter-issue", id, { fields: Object.keys(patch) });
  return issueView(updated);
}

export async function deleteIssue(actor: Actor, id: string): Promise<void> {
  const issue = await loadIssue(id);
  if (issue.status !== "draft") throw conflict("Only a draft can be deleted", "ISSUE_LOCKED");
  await IssueModel.deleteOne({ _id: issue._id, status: "draft" });
  await audit(actor, "newsletter.issue.delete", "newsletter-issue", id, { subject: issue.subject });
}

/** An issue is ready to leave the building only with a note or stories, and every story live. */
function assertSendable(issue: IssueDoc): void {
  if (issue.articles.length === 0) throw new AppError(422, "ISSUE_INCOMPLETE", "Add at least one story before sending", [{ path: "articles", message: "no stories" }]);
}

/** Sends the issue to one address — the editor's own — to read it as a subscriber would. */
export async function sendTest(actor: Actor, id: string): Promise<{ to: string }> {
  const issue = await loadIssue(id);
  const user = await UserModel.findById(actor.id, { email: 1 }).lean();
  if (!user) throw notFound("Account not found", "ACCOUNT_NOT_FOUND");
  assertSendable(issue);
  await assertPublished(issue.articles);
  const stories = await storiesOf(issue);
  // a test link points at nobody real: it carries a token that matches no subscriber
  await mailer.send(issueMail(user.email, manageToken("0".repeat(24)), { subject: `[TEST] ${issue.subject}`, note: issue.note }, stories));
  await audit(actor, "newsletter.issue.test", "newsletter-issue", id, { to: user.email });
  return { to: user.email };
}

const MIN_LEAD_MS = 5 * 60_000;

export async function scheduleIssue(actor: Actor, id: string, at: Date) {
  const issue = await loadIssue(id);
  if (!editable(issue)) throw conflict("This issue has already gone out", "ISSUE_LOCKED");
  assertSendable(issue);
  await assertPublished(issue.articles);
  if (at.getTime() < Date.now() + MIN_LEAD_MS) throw badRequest("Schedule at least five minutes ahead", "SCHEDULE_TOO_SOON");
  const updated = await IssueModel.findOneAndUpdate({ _id: issue._id, status: issue.status }, { $set: { status: "scheduled", scheduledFor: at } }, { returnDocument: "after" }).lean<IssueDoc>();
  if (!updated) throw conflict("The issue changed meanwhile", "ISSUE_CHANGED");
  await audit(actor, "newsletter.issue.schedule", "newsletter-issue", id, { at });
  return issueView(updated);
}

export async function unscheduleIssue(actor: Actor, id: string) {
  const issue = await loadIssue(id);
  if (issue.status !== "scheduled") throw conflict("Only a scheduled issue can be taken back", "ISSUE_LOCKED");
  const updated = await IssueModel.findOneAndUpdate({ _id: issue._id, status: "scheduled" }, { $set: { status: "draft" }, $unset: { scheduledFor: 1 } }, { returnDocument: "after" }).lean<IssueDoc>();
  await audit(actor, "newsletter.issue.unschedule", "newsletter-issue", id);
  return issueView(updated!);
}

/** Starts sending now and sends the first batch; the rest continues from the cron or the next call. */
export async function sendIssue(actor: Actor, id: string, batch = BATCH_SIZE) {
  const issue = await loadIssue(id);
  if (issue.status === "sent") throw conflict("This issue has already been sent", "ISSUE_LOCKED");
  assertSendable(issue);
  await assertPublished(issue.articles);
  if (issue.status !== "sending") {
    await IssueModel.updateOne({ _id: issue._id, status: { $in: ["draft", "scheduled"] } }, { $set: { status: "sending", startedAt: new Date() }, $unset: { scheduledFor: 1 } });
    await audit(actor, "newsletter.issue.send", "newsletter-issue", id);
  }
  await advanceIssue(issue._id, batch);
  return issueView(await loadIssue(id));
}

/* — Sending ————————————————————————————————————————————————— */

/** Messages per call: small enough to finish inside a serverless function's time limit. */
export const BATCH_SIZE = 25;
/** Time one cron call spends sending before it stops and leaves the rest for the next: inside a Hobby function’s 10 s. */
const DEFAULT_BUDGET_MS = 8_000;
/** How many e-mails are in flight at once within a batch. */
const SEND_CONCURRENCY = 5;

async function storiesOf(issue: IssueDoc): Promise<IssueStory[]> {
  const found = await summariesBySlugs(issue.articles);
  const base = env.webAppUrl.replace(/\/$/, "");
  return found.map((a) => ({
    title: a.title,
    standfirst: a.standfirst,
    author: a.authorRef.name,
    mins: a.mins,
    url: `${base}/${a.kind === "longread" ? "longform" : "article"}/${a.slug}`,
  }));
}

/**
 * Sends the next batch of a `sending` issue: confirmed subscribers who want this
 * kind of issue, in id order after the last one handled. The unique
 * (issue, subscriber) delivery makes two overlapping runs safe: whoever loses
 * the race skips that subscriber. Marks the issue sent when the list runs out.
 */
export async function advanceIssue(issueId: Types.ObjectId, batch = BATCH_SIZE): Promise<{ handled: number; done: boolean }> {
  const issue = await IssueModel.findById(issueId).lean<IssueDoc>();
  if (!issue || issue.status !== "sending") return { handled: 0, done: true };

  const found = await summariesBySlugs(issue.articles);
  const topics = topicsOfIssue(found);
  const stories = await storiesOf(issue);

  const subs = await SubscriberModel.find({
    status: "confirmed",
    frequency: { $in: frequenciesFor(issue.kind) },
    ...(issue.cursor ? { _id: { $gt: issue.cursor } } : {}),
  })
    .sort({ _id: 1 })
    .limit(batch)
    .lean<SubDoc[]>();

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  // Claim before sending: the unique (issue, subscriber) delivery is what stops a second run, or a retry, mailing anyone twice.
  const claimed: SubDoc[] = [];
  for (const sub of subs) {
    if (!issueFitsTopics(sub.topics, topics)) {
      skipped += 1;
      continue;
    }
    try {
      await DeliveryModel.create({ issue: issue._id, subscriber: sub._id, status: "sent", at: new Date() });
      claimed.push(sub);
    } catch {
      // another run already took this one
    }
  }

  for (let i = 0; i < claimed.length; i += SEND_CONCURRENCY) {
    await Promise.all(
      claimed.slice(i, i + SEND_CONCURRENCY).map(async (sub) => {
        try {
          await mailer.send(issueMail(sub.email, manageToken(sub._id.toString()), issue, stories));
          sent += 1;
        } catch (err) {
          failed += 1;
          await DeliveryModel.updateOne(
            { issue: issue._id, subscriber: sub._id },
            { $set: { status: "failed", error: (err instanceof Error ? err.message : "send failed").slice(0, 300) } },
          );
        }
      }),
    );
  }

  const last = subs.at(-1);
  const done = subs.length < batch;
  await IssueModel.updateOne(
    { _id: issue._id },
    {
      $inc: { sent, failed, skipped },
      ...(last ? { $set: { cursor: last._id, ...(done ? { status: "sent", sentAt: new Date() } : {}) } } : done ? { $set: { status: "sent", sentAt: new Date() } } : {}),
    },
  );
  // the site’s "A recent issue" section reads the last sent issue
  if (done) await revalidate(["newsletter"]);
  return { handled: subs.length, done };
}

/**
 * Starts every scheduled issue whose time has come, then keeps sending batches
 * of every sending issue until the list runs out or `budgetMs` is spent — so
 * one cron call can mail a few hundred readers, and the next carries on.
 */
export async function runIssues(
  now = new Date(),
  opts: { batch?: number; budgetMs?: number } = {},
): Promise<{ started: number; handled: number; pending: number }> {
  const batch = opts.batch ?? BATCH_SIZE;
  const until = Date.now() + (opts.budgetMs ?? DEFAULT_BUDGET_MS);
  const due = await IssueModel.updateMany({ status: "scheduled", scheduledFor: { $lte: now } }, { $set: { status: "sending", startedAt: now }, $unset: { scheduledFor: 1 } });
  const sending = await IssueModel.find({ status: "sending" }, { _id: 1 }).lean();
  let handled = 0;
  let pending = 0;
  for (const i of sending) {
    for (;;) {
      const step = await advanceIssue(i._id, batch);
      handled += step.handled;
      if (step.done) break;
      if (Date.now() >= until) {
        pending += 1;
        break;
      }
    }
  }
  return { started: due.modifiedCount, handled, pending };
}

/* — Subscribers (editors) ——————————————————————————————————— */

export async function listSubscribers(q: { status?: SubscriberShape["status"]; q?: string; page: number; limit: number }) {
  const filter: Record<string, unknown> = {};
  if (q.status) filter.status = q.status;
  if (q.q) filter.email = { $regex: q.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  const [rows, total, byStatus] = await Promise.all([
    SubscriberModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean<SubDoc[]>(),
    SubscriberModel.countDocuments(filter),
    SubscriberModel.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
  ]);
  return {
    items: rows.map((s) => ({
      id: s._id.toString(),
      email: s.email,
      status: s.status,
      frequency: s.frequency,
      topics: s.topics,
      source: s.source,
      createdAt: s.createdAt,
      confirmedAt: s.confirmedAt ?? null,
    })),
    total,
    page: q.page,
    limit: q.limit,
    counts: Object.fromEntries(byStatus.map((r) => [r._id, r.n])) as Record<string, number>,
  };
}

/** Removing someone's address entirely — for a request to be forgotten (not the same as leaving). */
export async function deleteSubscriber(actor: Actor, id: string): Promise<void> {
  const res = await SubscriberModel.deleteOne({ _id: oid(id) });
  if (res.deletedCount !== 1) throw notFound("Subscriber not found", "SUBSCRIBER_NOT_FOUND");
  await DeliveryModel.deleteMany({ subscriber: oid(id) });
  await audit(actor, "newsletter.subscriber.delete", "newsletter-subscriber", id);
}

