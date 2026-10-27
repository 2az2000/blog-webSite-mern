/**
 * What readers do with articles: be counted as a view or a finished read,
 * like, save to a reading list or collection, follow authors and topics, look
 * back at what they read, and report a broken link.
 *
 * Every write is idempotent (saving twice saves once) and every counter moves
 * only when the underlying fact actually changed, so a double click, a retry
 * or a replayed request can never skew a number.
 */
import { createHash } from "node:crypto";
import { isValidObjectId, Types } from "mongoose";
import { env } from "../../config/env.js";
import { ArticleModel } from "../../models/article.model.js";
import { AuthorModel } from "../../models/author.model.js";
import { BookmarkModel } from "../../models/bookmark.model.js";
import { BrokenLinkModel } from "../../models/broken-link.model.js";
import { CollectionModel, MAX_COLLECTIONS, MAX_COLLECTION_ARTICLES } from "../../models/collection.model.js";
import { FollowModel, type FollowKind } from "../../models/follow.model.js";
import { LikeModel } from "../../models/like.model.js";
import { ReadEventModel } from "../../models/read-event.model.js";
import { TopicModel } from "../../models/topic.model.js";
import { badRequest, conflict, notFound } from "../../http/errors.js";
import { summariesBySlugs, type ArticleSummary } from "../content/content.service.js";
import type { ListQuery } from "./engagement.schemas.js";

const MAX_BOOKMARKS = 1000;
const MAX_FOLLOWS = 200;

/* — Helpers ————————————————————————————————————————————— */

async function published(slug: string): Promise<{ _id: Types.ObjectId; slug: string }> {
  const a = await ArticleModel.findOne({ slug, status: "published" }, { slug: 1 }).lean();
  if (!a) throw notFound("Article not found", "ARTICLE_NOT_FOUND");
  return a;
}

function objectId(id: string): Types.ObjectId {
  if (!isValidObjectId(id) || !/^[a-f0-9]{24}$/.test(id)) throw badRequest("Not a valid id", "INVALID_ID");
  return new Types.ObjectId(id);
}

const today = (): string => new Date().toISOString().slice(0, 10);

const isDuplicate = (err: unknown): boolean => typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;

/* — Views and finished reads ———————————————————————————————— */

export interface Viewer {
  userId?: Types.ObjectId;
  ip: string;
  userAgent: string;
}

/** Crawlers, link previews and monitors are not readers. */
const NOT_A_READER = /bot|crawl|spider|slurp|headless|preview|monitor|curl|wget|python-requests/i;

/**
 * Who is looking, without storing who they are: a signed-in reader is `u:<id>`;
 * an anonymous one is a salted hash of address and browser that changes every
 * day, so it can count one visit but never follow a person from day to day.
 */
function viewerKey(v: Viewer, day: string): string {
  if (v.userId) return `u:${v.userId.toString()}`;
  return createHash("sha256").update(`${env.accessTokenSecret}:${day}:${v.ip}:${v.userAgent}`).digest("hex").slice(0, 32);
}

/** Makes sure today's visit row exists; returns whether this was the first view today. */
async function touchVisit(v: Viewer, slug: string, day: string): Promise<{ viewer: string; fresh: boolean }> {
  const viewer = viewerKey(v, day);
  const res = await ReadEventModel.updateOne(
    { article: slug, viewer, day },
    { $setOnInsert: { completed: false }, ...(v.userId ? { $set: { user: v.userId } } : {}) },
    { upsert: true },
  );
  return { viewer, fresh: res.upsertedCount === 1 };
}

/** One view per viewer per article per day. */
export async function recordView(v: Viewer, slug: string): Promise<{ counted: boolean }> {
  const article = await published(slug);
  if (!v.userAgent || NOT_A_READER.test(v.userAgent)) return { counted: false };
  const { fresh } = await touchVisit(v, slug, today());
  if (fresh) await ArticleModel.updateOne({ _id: article._id }, { $inc: { views: 1 } }, { timestamps: false });
  return { counted: fresh };
}

/** The reader reached the end. Counts once per viewer per article per day and feeds the trending board. */
export async function recordRead(v: Viewer, slug: string): Promise<{ counted: boolean }> {
  const article = await published(slug);
  if (!v.userAgent || NOT_A_READER.test(v.userAgent)) return { counted: false };
  const day = today();
  const { viewer, fresh } = await touchVisit(v, slug, day);
  if (fresh) await ArticleModel.updateOne({ _id: article._id }, { $inc: { views: 1 } }, { timestamps: false });
  const done = await ReadEventModel.updateOne({ article: slug, viewer, day, completed: false }, { $set: { completed: true } });
  if (done.modifiedCount === 1) await ArticleModel.updateOne({ _id: article._id }, { $inc: { readCount: 1 } }, { timestamps: false });
  return { counted: done.modifiedCount === 1 };
}

export async function getEngagement(slug: string, userId?: Types.ObjectId) {
  const a = await ArticleModel.findOne(
    { slug, status: "published" },
    { views: 1, likeCount: 1, readCount: 1, commentCount: 1 },
  ).lean();
  if (!a) throw notFound("Article not found", "ARTICLE_NOT_FOUND");
  const viewer = userId
    ? {
        liked: Boolean(await LikeModel.exists({ user: userId, article: slug })),
        bookmarked: Boolean(await BookmarkModel.exists({ user: userId, article: slug })),
      }
    : null;
  return { views: a.views, likes: a.likeCount, reads: a.readCount, comments: a.commentCount, viewer };
}

/* — Likes ——————————————————————————————————————————————— */

export async function setLike(userId: Types.ObjectId, slug: string, liked: boolean): Promise<{ liked: boolean; likes: number }> {
  const article = await published(slug);
  let delta = 0;
  if (liked) {
    const res = await LikeModel.updateOne({ user: userId, article: slug }, { $setOnInsert: {} }, { upsert: true });
    if (res.upsertedCount === 1) delta = 1;
  } else {
    const res = await LikeModel.deleteOne({ user: userId, article: slug });
    if (res.deletedCount === 1) delta = -1;
  }
  // counters are not edits: `updatedAt` (the back office’s "last changed") must not move
  const after =
    delta === 0
      ? await ArticleModel.findById(article._id, { likeCount: 1 }).lean()
      : await ArticleModel.findOneAndUpdate(
          { _id: article._id },
          { $inc: { likeCount: delta } },
          { returnDocument: "after", projection: { likeCount: 1 }, timestamps: false },
        ).lean();
  return { liked, likes: Math.max(0, after?.likeCount ?? 0) };
}

/* — Reading list ———————————————————————————————————————————— */

export async function setBookmark(userId: Types.ObjectId, slug: string, saved: boolean): Promise<{ saved: boolean }> {
  if (!saved) {
    await BookmarkModel.deleteOne({ user: userId, article: slug });
    return { saved };
  }
  await published(slug);
  if ((await BookmarkModel.countDocuments({ user: userId })) >= MAX_BOOKMARKS && !(await BookmarkModel.exists({ user: userId, article: slug }))) {
    throw conflict("Your reading list is full", "LIST_FULL");
  }
  await BookmarkModel.updateOne({ user: userId, article: slug }, { $setOnInsert: {} }, { upsert: true });
  return { saved };
}

export async function listBookmarks(userId: Types.ObjectId, q: ListQuery) {
  const [rows, total] = await Promise.all([
    BookmarkModel.find({ user: userId }).sort({ createdAt: -1, _id: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    BookmarkModel.countDocuments({ user: userId }),
  ]);
  const items = await summariesBySlugs(rows.map((r) => r.article));
  return { items, total, page: q.page, limit: q.limit };
}

/**
 * Merges the reading list a visitor kept in their browser into their account.
 * The first slug in the list ends up newest. Slugs that are unknown, not live
 * or already saved are skipped.
 */
export async function syncBookmarks(userId: Types.ObjectId, slugs: string[]): Promise<{ added: number }> {
  const wanted = [...new Set(slugs)];
  const [live, have] = await Promise.all([
    ArticleModel.find({ slug: { $in: wanted }, status: "published" }, { slug: 1 }).lean(),
    BookmarkModel.find({ user: userId, article: { $in: wanted } }, { article: 1 }).lean(),
  ]);
  const liveSet = new Set(live.map((a) => a.slug));
  const haveSet = new Set(have.map((b) => b.article));
  const fresh = wanted.filter((s) => liveSet.has(s) && !haveSet.has(s));

  const room = MAX_BOOKMARKS - (await BookmarkModel.countDocuments({ user: userId }));
  const take = fresh.slice(0, Math.max(0, room));
  if (take.length === 0) return { added: 0 };

  const now = Date.now();
  try {
    await BookmarkModel.insertMany(
      take.map((article, i) => ({ user: userId, article, createdAt: new Date(now - i) })),
      { ordered: false, timestamps: false },
    );
  } catch (err) {
    // a concurrent sync saved some of these first; the rest were still written
    if (!isDuplicate(err) && !(err as { writeErrors?: unknown[] }).writeErrors) throw err;
  }
  return { added: take.length };
}

/* — Collections ——————————————————————————————————————————— */

const toMeta = (c: { _id: Types.ObjectId; name: string; articles: string[]; updatedAt: Date }) => ({
  id: c._id.toString(),
  name: c.name,
  count: c.articles.length,
  updatedAt: c.updatedAt,
});

async function ownCollection(userId: Types.ObjectId, id: string) {
  const c = await CollectionModel.findOne({ _id: objectId(id), user: userId }).lean();
  if (!c) throw notFound("Collection not found", "COLLECTION_NOT_FOUND");
  return c;
}

export async function listCollections(userId: Types.ObjectId) {
  const rows = await CollectionModel.find({ user: userId }).sort({ updatedAt: -1, _id: -1 }).lean();
  return rows.map(toMeta);
}

export async function createCollection(userId: Types.ObjectId, name: string) {
  if ((await CollectionModel.countDocuments({ user: userId })) >= MAX_COLLECTIONS) {
    throw conflict(`You can keep ${MAX_COLLECTIONS} collections`, "LIST_FULL");
  }
  return toMeta((await CollectionModel.create({ user: userId, name })).toObject());
}

export async function renameCollection(userId: Types.ObjectId, id: string, name: string) {
  const c = await CollectionModel.findOneAndUpdate({ _id: objectId(id), user: userId }, { $set: { name } }, { returnDocument: "after" }).lean();
  if (!c) throw notFound("Collection not found", "COLLECTION_NOT_FOUND");
  return toMeta(c);
}

export async function deleteCollection(userId: Types.ObjectId, id: string): Promise<void> {
  const res = await CollectionModel.deleteOne({ _id: objectId(id), user: userId });
  if (res.deletedCount !== 1) throw notFound("Collection not found", "COLLECTION_NOT_FOUND");
}

export async function getCollection(userId: Types.ObjectId, id: string) {
  const c = await ownCollection(userId, id);
  return { ...toMeta(c), articles: await summariesBySlugs(c.articles) };
}

export async function setInCollection(userId: Types.ObjectId, id: string, slug: string, present: boolean) {
  const c = await ownCollection(userId, id);
  if (present) {
    await published(slug);
    if (c.articles.length >= MAX_COLLECTION_ARTICLES && !c.articles.includes(slug)) {
      throw conflict("This collection is full", "LIST_FULL");
    }
  }
  const updated = await CollectionModel.findOneAndUpdate(
    { _id: c._id },
    present ? { $addToSet: { articles: slug } } : { $pull: { articles: slug } },
    { returnDocument: "after" },
  ).lean();
  return toMeta(updated!);
}

/* — Follows ————————————————————————————————————————————— */

export async function setFollow(userId: Types.ObjectId, kind: FollowKind, slug: string, on: boolean) {
  if (on) {
    const exists = kind === "author" ? await AuthorModel.exists({ slug }) : await TopicModel.exists({ slug });
    if (!exists) throw notFound(kind === "author" ? "Author not found" : "Topic not found", kind === "author" ? "AUTHOR_NOT_FOUND" : "TOPIC_NOT_FOUND");
    if ((await FollowModel.countDocuments({ user: userId })) >= MAX_FOLLOWS && !(await FollowModel.exists({ user: userId, kind, slug }))) {
      throw conflict("You follow as many as you can", "LIST_FULL");
    }
    await FollowModel.updateOne({ user: userId, kind, slug }, { $setOnInsert: {} }, { upsert: true });
  } else {
    await FollowModel.deleteOne({ user: userId, kind, slug });
  }
  return { following: on, followers: await FollowModel.countDocuments({ kind, slug }) };
}

export async function listFollows(userId: Types.ObjectId) {
  const rows = await FollowModel.find({ user: userId }).sort({ createdAt: -1, _id: -1 }).lean();
  const authors = rows.filter((r) => r.kind === "author").map((r) => r.slug);
  const topics = rows.filter((r) => r.kind === "topic").map((r) => r.slug);
  const [a, t] = await Promise.all([
    AuthorModel.find({ slug: { $in: authors } }, { slug: 1, name: 1 }).lean(),
    TopicModel.find({ slug: { $in: topics } }, { slug: 1, name: 1 }).lean(),
  ]);
  const name = (list: { slug: string; name: string }[]) => new Map(list.map((x) => [x.slug, x.name]));
  const an = name(a);
  const tn = name(t);
  return {
    authors: authors.flatMap((slug) => (an.has(slug) ? [{ slug, name: an.get(slug)! }] : [])),
    topics: topics.flatMap((slug) => (tn.has(slug) ? [{ slug, name: tn.get(slug)! }] : [])),
  };
}

/* — Recently viewed ————————————————————————————————————————— */

export async function listHistory(userId: Types.ObjectId, limit: number): Promise<(ArticleSummary & { viewedAt: Date })[]> {
  const rows = await ReadEventModel.aggregate<{ _id: string; viewedAt: Date }>([
    { $match: { user: userId } },
    { $group: { _id: "$article", viewedAt: { $max: "$updatedAt" } } },
    { $sort: { viewedAt: -1, _id: 1 } },
    { $limit: limit },
  ]);
  const items = await summariesBySlugs(rows.map((r) => r._id));
  const when = new Map(rows.map((r) => [r._id, r.viewedAt]));
  return items.map((a) => ({ ...a, viewedAt: when.get(a.slug)! }));
}

/** Forgets what a reader looked at. The visit rows stay (unlinked), so a view is not counted twice. */
export async function clearHistory(userId: Types.ObjectId): Promise<void> {
  await ReadEventModel.updateMany({ user: userId }, { $unset: { user: 1 } });
}

/* — Broken links ———————————————————————————————————————————— */

export async function reportBrokenLink(input: { path: string; referrer?: string }): Promise<void> {
  let path: string;
  try {
    path = new URL(input.path, "http://nova.invalid").pathname;
  } catch {
    throw badRequest("Not a valid path", "INVALID_PATH");
  }
  if (path.startsWith("/api") || path.length > 300) throw badRequest("Not a page address", "INVALID_PATH");
  const now = new Date();
  await BrokenLinkModel.updateOne(
    { path },
    {
      $inc: { count: 1 },
      $set: { lastSeenAt: now, resolved: false, ...(input.referrer ? { referrer: input.referrer } : {}) },
      $setOnInsert: { firstSeenAt: now },
    },
    { upsert: true },
  );
}

export async function listBrokenLinks(q: { page: number; limit: number; resolved?: boolean }) {
  const filter = { resolved: q.resolved ?? false };
  const [items, total] = await Promise.all([
    BrokenLinkModel.find(filter).sort({ count: -1, lastSeenAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    BrokenLinkModel.countDocuments(filter),
  ]);
  return { items: items.map((b) => ({ id: b._id.toString(), ...b, _id: undefined })), total, page: q.page, limit: q.limit };
}

export async function resolveBrokenLink(id: string): Promise<void> {
  const res = await BrokenLinkModel.updateOne({ _id: objectId(id) }, { $set: { resolved: true } });
  if (res.matchedCount !== 1) throw notFound("Report not found", "REPORT_NOT_FOUND");
}

/* — Account deletion ———————————————————————————————————————— */

/** Removes everything a reader did, and takes their likes back off the counters. */
export async function purgeReaderData(userId: Types.ObjectId): Promise<void> {
  const likes = await LikeModel.find({ user: userId }, { article: 1 }).lean();
  if (likes.length > 0) {
    await ArticleModel.bulkWrite(
      likes.map((l) => ({ updateOne: { filter: { slug: l.article, likeCount: { $gt: 0 } }, update: { $inc: { likeCount: -1 } } } })),
      { timestamps: false },
    );
  }
  await Promise.all([
    LikeModel.deleteMany({ user: userId }),
    BookmarkModel.deleteMany({ user: userId }),
    FollowModel.deleteMany({ user: userId }),
    CollectionModel.deleteMany({ user: userId }),
    ReadEventModel.updateMany({ user: userId }, { $unset: { user: 1 } }),
  ]);
}
