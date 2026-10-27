/**
 * Comments: reading a thread, posting, editing once, deleting, liking,
 * reporting, and the moderators' queue.
 *
 * `Article.commentCount` counts *published* comments and moves only when a
 * comment actually enters or leaves that state (never by recounting, which
 * would discard the seed's figures), always through `move`/`bump`.
 */
import { isValidObjectId, Types, type QueryFilter } from "mongoose";
import { env } from "../../config/env.js";
import { ArticleModel } from "../../models/article.model.js";
import { AuthorModel } from "../../models/author.model.js";
import {
  CommentLikeModel,
  CommentModel,
  CommentReportModel,
  type CommentShape,
  type CommentStatus,
  type ReportReason,
} from "../../models/comment.model.js";
import { UserModel } from "../../models/user.model.js";
import { badRequest, conflict, notFound, tooManyRequests } from "../../http/errors.js";
import { audit, type Actor } from "../../services/audit.service.js";
import {
  POST_LIMIT,
  POST_WINDOW_MS,
  REPORT_HOLD_THRESHOLD,
  assess,
  editBlocked,
  initialsOf,
  normalizeBody,
} from "./comment-rules.js";
import type { ListCommentsQuery, QueueQuery } from "./comments.schemas.js";

type Doc = CommentShape & { _id: Types.ObjectId };

const oid = (id: string): Types.ObjectId => {
  if (!isValidObjectId(id) || !/^[a-f0-9]{24}$/.test(id)) throw badRequest("Not a valid id", "INVALID_ID");
  return new Types.ObjectId(id);
};

/* — The published count ————————————————————————————————————— */

const countDelta = (from: CommentStatus, to: CommentStatus): number => (to === "published" ? 1 : 0) - (from === "published" ? 1 : 0);

async function bump(article: string, by: number): Promise<void> {
  if (by !== 0) await ArticleModel.updateOne({ slug: article }, { $inc: { commentCount: by } }, { timestamps: false });
}

/** Moves a comment between states atomically (only if it is still in `from`) and keeps the count right. */
async function move(c: Doc, to: CommentStatus, set: Partial<CommentShape> = {}, unset: string[] = []): Promise<Doc | null> {
  const after = await CommentModel.findOneAndUpdate(
    { _id: c._id, status: c.status },
    { $set: { status: to, ...set }, ...(unset.length ? { $unset: Object.fromEntries(unset.map((k) => [k, 1])) } : {}) },
    { returnDocument: "after" },
  ).lean<Doc>();
  if (after) await bump(c.article, countDelta(c.status, to));
  return after;
}

/* — Presentation ———————————————————————————————————————————— */

export interface CommentView {
  id: string;
  parent: string | null;
  /** Null for a removed comment: its author is no longer shown. */
  author: { name: string; initials: string; badge?: "Author" } | null;
  createdAt: Date;
  edited: boolean;
  likes: number;
  liked: boolean;
  mine: boolean;
  /** Waiting for a moderator; only its author sees it. */
  pending: boolean;
  /** Empty for a removed comment. */
  body: string;
  removed: { by: "moderator" | "author"; reason: string } | null;
  /** Edit still open to its author (not yet used, not expired). */
  canEdit: boolean;
  replies: CommentView[];
}

interface Ctx {
  userId?: Types.ObjectId;
  names: Map<string, string>;
  authorUserId?: string;
  liked: Set<string>;
}

function toView(c: Doc, ctx: Ctx): CommentView {
  const mine = ctx.userId?.equals(c.user) ?? false;
  const removed = c.status === "removed";
  const name = ctx.names.get(c.user.toString()) ?? "";
  return {
    id: c._id.toString(),
    parent: c.parent?.toString() ?? null,
    author: removed
      ? null
      : { name, initials: initialsOf(name), ...(ctx.authorUserId === c.user.toString() ? { badge: "Author" as const } : {}) },
    createdAt: c.createdAt,
    edited: c.editCount > 0,
    likes: c.likeCount,
    liked: ctx.liked.has(c._id.toString()),
    mine,
    pending: c.status === "held",
    body: removed ? "" : c.body,
    removed: removed ? { by: c.removedBy ?? "moderator", reason: c.removedReason ?? "" } : null,
    canEdit: mine && editBlocked(c) === null,
    replies: [],
  };
}

async function context(slug: string, docs: Doc[], userId?: Types.ObjectId): Promise<Ctx> {
  const userIds = [...new Set(docs.map((d) => d.user.toString()))];
  const [users, article, likes] = await Promise.all([
    UserModel.find({ _id: { $in: userIds } }, { name: 1 }).lean(),
    ArticleModel.findOne({ slug }, { author: 1 }).lean(),
    userId && docs.length
      ? CommentLikeModel.find({ user: userId, comment: { $in: docs.map((d) => d._id) } }, { comment: 1 }).lean()
      : Promise.resolve([]),
  ]);
  const byline = article ? await AuthorModel.findOne({ slug: article.author }, { userId: 1 }).lean() : null;
  return {
    ...(userId ? { userId } : {}),
    names: new Map(users.map((u) => [u._id.toString(), u.name])),
    ...(byline?.userId ? { authorUserId: byline.userId.toString() } : {}),
    liked: new Set(likes.map((l) => l.comment.toString())),
  };
}

/* — Reading ———————————————————————————————————————————————— */

async function publishedArticle(slug: string) {
  const a = await ArticleModel.findOne({ slug, status: "published" }, { slug: 1, commentCount: 1 }).lean();
  if (!a) throw notFound("Article not found", "ARTICLE_NOT_FOUND");
  return a;
}

/** What a reader may see: everything published or removed, plus their own held comments. */
const visibleTo = (userId?: Types.ObjectId): QueryFilter<CommentShape> => ({
  $or: [
    { status: { $in: ["published", "removed"] as CommentStatus[] } },
    ...(userId ? [{ status: "held" as const, user: userId }] : []),
  ],
});

const ORDER = {
  new: { createdAt: -1, _id: -1 },
  old: { createdAt: 1, _id: 1 },
  top: { likeCount: -1, createdAt: -1, _id: -1 },
} as const;

export async function listComments(slug: string, q: ListCommentsQuery, userId?: Types.ObjectId) {
  const article = await publishedArticle(slug);
  const topFilter = { article: slug, parent: null, ...visibleTo(userId) };

  const [tops, total] = await Promise.all([
    CommentModel.find(topFilter).sort(ORDER[q.sort]).skip((q.page - 1) * q.limit).limit(q.limit).lean<Doc[]>(),
    CommentModel.countDocuments(topFilter),
  ]);
  const replies = tops.length
    ? await CommentModel.find({ article: slug, parent: { $in: tops.map((t) => t._id) }, ...visibleTo(userId) })
        .sort({ createdAt: 1, _id: 1 })
        .lean<Doc[]>()
    : [];

  const ctx = await context(slug, [...tops, ...replies], userId);
  const byParent = new Map<string, CommentView[]>();
  for (const r of replies) {
    const key = r.parent!.toString();
    byParent.set(key, [...(byParent.get(key) ?? []), toView(r, ctx)]);
  }
  const items = tops.map((t) => ({ ...toView(t, ctx), replies: byParent.get(t._id.toString()) ?? [] }));
  // `count` is every published comment and reply, the figure the article's headline shows
  return { items, total, page: q.page, limit: q.limit, count: article.commentCount };
}

/* — Writing ———————————————————————————————————————————————— */

function checkBody(raw: string): string {
  const body = normalizeBody(raw);
  if (body.length === 0) throw badRequest("Write something before posting", "EMPTY_COMMENT");
  if (body.length > 2000) throw badRequest("Comments are limited to 2000 characters", "COMMENT_TOO_LONG");
  return body;
}

export async function createComment(userId: Types.ObjectId, slug: string, input: { body: string; parent?: string }) {
  await publishedArticle(slug);
  const body = checkBody(input.body);

  let parent: Types.ObjectId | null = null;
  if (input.parent) {
    const target = await CommentModel.findOne({ _id: oid(input.parent), article: slug }).lean<Doc>();
    if (!target) throw notFound("Comment not found", "COMMENT_NOT_FOUND");
    // replies indent once and never further: a reply to a reply joins the same thread
    const top = target.parent ? await CommentModel.findById(target.parent).lean<Doc>() : target;
    if (!top || top.status !== "published") throw conflict("That comment can no longer be replied to", "PARENT_UNAVAILABLE");
    parent = top._id;
  }

  const since = new Date(Date.now() - POST_WINDOW_MS);
  // the one limit that is per reader rather than per address; switched off together with the others for automated runs
  if (!env.rateLimitDisabled && (await CommentModel.countDocuments({ user: userId, createdAt: { $gte: since } })) >= POST_LIMIT) {
    throw tooManyRequests("You are commenting very quickly. Wait a few minutes.", "RATE_LIMITED", Math.ceil(POST_WINDOW_MS / 1000));
  }
  const dayAgo = new Date(Date.now() - 24 * 3_600_000);
  if (await CommentModel.exists({ user: userId, article: slug, body, createdAt: { $gte: dayAgo } })) {
    throw conflict("You already posted exactly this", "DUPLICATE_COMMENT");
  }

  const verdict = assess(body, Boolean(await CommentModel.exists({ user: userId, status: "published" })));
  const created = await CommentModel.create({
    article: slug,
    user: userId,
    parent,
    body,
    status: verdict.status,
    ...(verdict.reason ? { heldFor: verdict.reason } : {}),
  });
  await bump(slug, countDelta("held", verdict.status));

  const doc = created.toObject() as unknown as Doc;
  return toView(doc, await context(slug, [doc], userId));
}

/** The author's one edit. Editing a removed comment is reposting it: it goes back to a moderator. */
export async function editComment(userId: Types.ObjectId, id: string, rawBody: string) {
  const c = await CommentModel.findOne({ _id: oid(id), user: userId }).lean<Doc>();
  if (!c) throw notFound("Comment not found", "COMMENT_NOT_FOUND");
  const blocked = editBlocked(c);
  if (blocked === "deleted") throw conflict("A deleted comment cannot be edited", "COMMENT_DELETED");
  if (blocked === "used") throw conflict("A comment can be edited once", "EDIT_USED");
  if (blocked === "expired") throw conflict("A comment can only be edited within a day of posting", "EDIT_EXPIRED");

  const body = checkBody(rawBody);
  const verdict = assess(body, Boolean(await CommentModel.exists({ user: userId, status: "published", _id: { $ne: c._id } })));
  const reposted = c.status === "removed";
  const to: CommentStatus = reposted ? "held" : c.status === "held" ? "held" : verdict.status;

  const after = await move(
    c,
    to,
    {
      body,
      editCount: c.editCount + 1,
      editedAt: new Date(),
      ...(reposted ? { heldFor: "reposted" } : verdict.reason ? { heldFor: verdict.reason } : {}),
    },
    reposted ? ["removedBy", "removedReason"] : to === "published" ? ["heldFor"] : [],
  );
  if (!after) throw conflict("The comment changed while you were editing", "COMMENT_CHANGED");
  return toView(after, await context(after.article, [after], userId));
}

/** Deletes the author's comment: gone entirely, or — if replies hang under it — kept as an empty slot. */
export async function deleteComment(userId: Types.ObjectId, id: string): Promise<void> {
  const c = await CommentModel.findOne({ _id: oid(id), user: userId }).lean<Doc>();
  if (!c) throw notFound("Comment not found", "COMMENT_NOT_FOUND");
  await removeByAuthor(c);
}

async function removeByAuthor(c: Doc): Promise<void> {
  if (await CommentModel.exists({ parent: c._id })) {
    if (c.status !== "removed") await move(c, "removed", { body: "", removedBy: "author", removedReason: "" });
    return;
  }
  const res = await CommentModel.deleteOne({ _id: c._id });
  if (res.deletedCount === 1) {
    await bump(c.article, countDelta(c.status, "removed"));
    await Promise.all([CommentLikeModel.deleteMany({ comment: c._id }), CommentReportModel.deleteMany({ comment: c._id })]);
  }
}

/* — Likes and reports ————————————————————————————————————— */

export async function setCommentLike(userId: Types.ObjectId, id: string, liked: boolean): Promise<{ liked: boolean; likes: number }> {
  const c = await CommentModel.findOne({ _id: oid(id), status: "published" }).lean<Doc>();
  if (!c) throw notFound("Comment not found", "COMMENT_NOT_FOUND");

  let by = 0;
  if (liked) {
    const res = await CommentLikeModel.updateOne({ user: userId, comment: c._id }, { $setOnInsert: {} }, { upsert: true });
    if (res.upsertedCount === 1) by = 1;
  } else {
    const res = await CommentLikeModel.deleteOne({ user: userId, comment: c._id });
    if (res.deletedCount === 1) by = -1;
  }
  const after =
    by === 0
      ? await CommentModel.findById(c._id, { likeCount: 1 }).lean()
      : await CommentModel.findOneAndUpdate({ _id: c._id }, { $inc: { likeCount: by } }, { returnDocument: "after", projection: { likeCount: 1 }, timestamps: false }).lean();
  return { liked, likes: Math.max(0, after?.likeCount ?? 0) };
}

/** Reports a comment. Enough distinct readers reporting pulls it back for a moderator to look at. */
export async function reportComment(userId: Types.ObjectId, id: string, input: { reason: ReportReason; note?: string }): Promise<void> {
  const c = await CommentModel.findOne({ _id: oid(id), status: "published" }).lean<Doc>();
  if (!c) throw notFound("Comment not found", "COMMENT_NOT_FOUND");
  if (c.user.equals(userId)) throw conflict("You cannot report your own comment", "OWN_COMMENT");

  const res = await CommentReportModel.updateOne(
    { comment: c._id, user: userId },
    { $setOnInsert: { reason: input.reason, ...(input.note ? { note: input.note } : {}) } },
    { upsert: true },
  );
  if (res.upsertedCount !== 1) return; // already reported by this reader

  const after = await CommentModel.findOneAndUpdate({ _id: c._id }, { $inc: { reportCount: 1 } }, { returnDocument: "after", timestamps: false }).lean<Doc>();
  if (after && after.status === "published" && after.reportCount >= REPORT_HOLD_THRESHOLD) {
    await move(after, "held", { heldFor: "reports" });
  }
}

/* — Moderation ————————————————————————————————————————————— */

const QUEUE_FILTER: Record<QueueQuery["queue"], Record<string, unknown>> = {
  pending: { $or: [{ status: "held" }, { status: "published", reportCount: { $gt: 0 } }] },
  held: { status: "held" },
  reported: { status: "published", reportCount: { $gt: 0 } },
  removed: { status: "removed" },
  published: { status: "published" },
};

export async function listQueue(q: QueueQuery) {
  const filter = QUEUE_FILTER[q.queue];
  const oldestFirst = q.queue === "pending" || q.queue === "held";
  const [rows, total] = await Promise.all([
    CommentModel.find(filter)
      .sort(oldestFirst ? { reportCount: -1, createdAt: 1, _id: 1 } : { createdAt: -1, _id: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean<Doc[]>(),
    CommentModel.countDocuments(filter),
  ]);
  const [users, reports] = await Promise.all([
    UserModel.find({ _id: { $in: rows.map((r) => r.user) } }, { name: 1, email: 1 }).lean(),
    CommentReportModel.find({ comment: { $in: rows.map((r) => r._id) } }, { comment: 1, reason: 1, note: 1 }).lean(),
  ]);
  const who = new Map(users.map((u) => [u._id.toString(), { id: u._id.toString(), name: u.name, email: u.email }]));
  const why = new Map<string, { reason: string; note?: string }[]>();
  for (const r of reports) {
    const key = r.comment.toString();
    why.set(key, [...(why.get(key) ?? []), { reason: r.reason, ...(r.note ? { note: r.note } : {}) }]);
  }
  return {
    items: rows.map((c) => ({
      id: c._id.toString(),
      article: c.article,
      parent: c.parent?.toString() ?? null,
      status: c.status,
      heldFor: c.heldFor ?? null,
      body: c.body,
      user: who.get(c.user.toString()) ?? null,
      reportCount: c.reportCount,
      reports: why.get(c._id.toString()) ?? [],
      removed: c.status === "removed" ? { by: c.removedBy ?? "moderator", reason: c.removedReason ?? "" } : null,
      createdAt: c.createdAt,
    })),
    total,
    page: q.page,
    limit: q.limit,
  };
}

async function loadForModeration(id: string): Promise<Doc> {
  const c = await CommentModel.findById(oid(id)).lean<Doc>();
  if (!c) throw notFound("Comment not found", "COMMENT_NOT_FOUND");
  return c;
}

/** Puts a held or reported comment on the page, and clears the reports against it. */
export async function approveComment(actor: Actor, id: string) {
  const c = await loadForModeration(id);
  if (c.removedBy === "author") throw conflict("The author deleted this comment", "COMMENT_DELETED");
  const after = c.status === "published" ? c : await move(c, "published", {}, ["heldFor", "removedBy", "removedReason"]);
  if (!after) throw conflict("The comment changed meanwhile", "COMMENT_CHANGED");
  await CommentModel.updateOne({ _id: c._id }, { $set: { reportCount: 0 } }, { timestamps: false });
  await CommentReportModel.deleteMany({ comment: c._id });
  await audit(actor, "comment.approve", "comment", c._id.toString(), { article: c.article, from: c.status });
}

/** Removes a comment but keeps its slot, stating why; its author may edit and repost once. */
export async function removeComment(actor: Actor, id: string, reason: string) {
  const c = await loadForModeration(id);
  if (c.status === "removed") throw conflict("Already removed", "ALREADY_REMOVED");
  const after = await move(c, "removed", { removedBy: "moderator", removedReason: reason }, ["heldFor"]);
  if (!after) throw conflict("The comment changed meanwhile", "COMMENT_CHANGED");
  await audit(actor, "comment.remove", "comment", c._id.toString(), { article: c.article, reason });
}

/* — Account deletion ————————————————————————————————————————— */

/** Takes a deleted reader's likes off the counters and deletes (or empties) their comments. */
export async function purgeCommentData(userId: Types.ObjectId): Promise<void> {
  const likes = await CommentLikeModel.find({ user: userId }, { comment: 1 }).lean();
  if (likes.length > 0) {
    await CommentModel.bulkWrite(
      likes.map((l) => ({ updateOne: { filter: { _id: l.comment, likeCount: { $gt: 0 } }, update: { $inc: { likeCount: -1 } } } })),
      { timestamps: false },
    );
    await CommentLikeModel.deleteMany({ user: userId });
  }
  const reports = await CommentReportModel.find({ user: userId }, { comment: 1 }).lean();
  if (reports.length > 0) {
    await CommentModel.bulkWrite(
      reports.map((r) => ({ updateOne: { filter: { _id: r.comment, reportCount: { $gt: 0 } }, update: { $inc: { reportCount: -1 } } } })),
      { timestamps: false },
    );
    await CommentReportModel.deleteMany({ user: userId });
  }
  for (const c of await CommentModel.find({ user: userId }).lean<Doc[]>()) await removeByAuthor(c);
}
