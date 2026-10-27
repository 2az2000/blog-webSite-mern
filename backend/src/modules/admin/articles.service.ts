/**
 * Editorial write side: create, edit, move through the workflow, restore.
 *
 * Every mutation is a conditional `findOneAndUpdate` on the version (or status)
 * the caller saw, so two editors can never silently overwrite each other, and
 * every one is followed by a revision snapshot, an audit line and — when the
 * live site is affected — a revalidation ping.
 */
import { isValidObjectId, type Types } from "mongoose";
import { ArticleModel, type ArticleShape, type ArticleStatus } from "../../models/article.model.js";
import { ArticleRevisionModel, type ArticleRevisionShape } from "../../models/article-revision.model.js";
import { AuthorModel } from "../../models/author.model.js";
import { SectionModel } from "../../models/section.model.js";
import { AppError, badRequest, conflict, forbidden, notFound } from "../../http/errors.js";
import { audit, type Actor } from "../../services/audit.service.js";
import { articleTags, revalidate } from "../../services/revalidate.service.js";
import { articleInputSchema } from "../content/content.schemas.js";
import type { AdminListQuery, ChangeStatusInput, CreateArticleInput, UpdateArticleInput } from "./admin.schemas.js";
import { blocksMissingAlt, canEditArticle, canTransition, canViewArticle, defaultDetail, isEditorial, slugify, uniqueSlug } from "./article-workflow.js";

export type ArticleDoc = ArticleShape & { _id: Types.ObjectId; createdAt: Date; updatedAt: Date };

/** Minimum lead for a schedule, so "scheduled" can never mean "already due". */
const MIN_LEAD_MS = 60_000;

const CONTENT_FIELDS = ["slug", "kind", "section", "title", "standfirst", "author", "mins", "image", "tags", "detail", "body"] as const;
type ContentField = (typeof CONTENT_FIELDS)[number];

const actorKey = (actor: Actor) => ({ id: actor.id.toString(), role: actor.role });

function parseId(id: string): string {
  if (!isValidObjectId(id) || !/^[a-f0-9]{24}$/.test(id)) throw badRequest("Not a valid id", "INVALID_ID");
  return id;
}

/* — Presentation —————————————————————————————————————————— */

export interface AdminArticleRow {
  id: string;
  slug: string;
  title: string;
  kind: ArticleShape["kind"];
  section: string;
  author: string;
  status: ArticleStatus;
  publishedAt: Date | null;
  createdBy: string | null;
  version: number;
  updatedAt: Date;
}

const toRow = (a: ArticleDoc): AdminArticleRow => ({
  id: a._id.toString(),
  slug: a.slug,
  title: a.title,
  kind: a.kind,
  section: a.section,
  author: a.author,
  status: a.status,
  publishedAt: a.publishedAt,
  createdBy: a.createdBy?.toString() ?? null,
  version: a.version,
  updatedAt: a.updatedAt,
});

/** The whole editable article, as the editor loads it. */
export const toFull = (a: ArticleDoc) => ({
  ...toRow(a),
  standfirst: a.standfirst,
  mins: a.mins,
  image: a.image,
  tags: a.tags,
  views: a.views,
  comments: a.commentCount,
  trend: a.trend,
  detail: a.detail,
  body: a.body,
  createdAt: a.createdAt,
});

const snapshotOf = (a: Pick<ArticleDoc, ContentField>): ArticleRevisionShape["snapshot"] => ({
  slug: a.slug,
  kind: a.kind,
  section: a.section,
  title: a.title,
  standfirst: a.standfirst,
  author: a.author,
  mins: a.mins,
  image: a.image,
  tags: a.tags,
  detail: a.detail,
  body: a.body,
});

/* — Loading and permissions ———————————————————————————————— */

async function load(id: string): Promise<ArticleDoc> {
  const doc = await ArticleModel.findById(parseId(id)).lean<ArticleDoc>();
  if (!doc) throw notFound("Article not found", "ARTICLE_NOT_FOUND");
  return doc;
}

/** A writer asking for someone else's article gets the same 404 as for a missing one. */
async function loadViewable(actor: Actor, id: string): Promise<ArticleDoc> {
  const doc = await load(id);
  if (!canViewArticle(actorKey(actor), doc)) throw notFound("Article not found", "ARTICLE_NOT_FOUND");
  return doc;
}

async function loadEditable(actor: Actor, id: string): Promise<ArticleDoc> {
  const doc = await loadViewable(actor, id);
  if (!canEditArticle(actorKey(actor), doc)) {
    throw forbidden(
      isEditorial(actor.role) ? "You cannot edit this article" : "Writers can only edit their own drafts",
      "ARTICLE_LOCKED",
    );
  }
  return doc;
}

async function assertReferences(fields: { section?: string; author?: string }): Promise<void> {
  const [section, author] = await Promise.all([
    fields.section ? SectionModel.exists({ slug: fields.section }) : true,
    fields.author ? AuthorModel.exists({ slug: fields.author }) : true,
  ]);
  if (!section) throw badRequest("Unknown section", "UNKNOWN_SECTION");
  if (!author) throw badRequest("Unknown author", "UNKNOWN_AUTHOR");
}

/** A byline needs words, a picture and a body before readers can see it. */
async function assertPublishable(a: ArticleDoc, publishedAt: Date): Promise<void> {
  const result = articleInputSchema.safeParse({
    ...snapshotOf(a),
    publishedAt,
    views: a.views,
    commentCount: a.commentCount,
    trend: a.trend,
    status: "published",
  });
  if (!result.success) {
    throw new AppError(
      422,
      "ARTICLE_INCOMPLETE",
      "The article is not ready to go live",
      result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    );
  }
  const noAlt = blocksMissingAlt(a.body);
  if (noAlt.length > 0) {
    throw new AppError(
      422,
      "ARTICLE_INCOMPLETE",
      "The article is not ready to go live",
      noAlt.map((path) => ({ path, message: "Describe the image, or mark it decorative" })),
    );
  }
  await assertReferences({ section: a.section, author: a.author });
}

/* — Reading ———————————————————————————————————————————————— */

export async function listArticles(actor: Actor, q: AdminListQuery) {
  const filter: Record<string, unknown> = {};
  if (!isEditorial(actor.role)) filter.createdBy = actor.id;
  if (q.status) filter.status = q.status;
  if (q.section) filter.section = q.section;
  if (q.author) filter.author = q.author;
  if (q.q) filter.title = { $regex: q.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };

  const [rows, total] = await Promise.all([
    ArticleModel.find(filter, { body: 0, detail: 0 })
      .sort({ updatedAt: -1, _id: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean<ArticleDoc[]>(),
    ArticleModel.countDocuments(filter),
  ]);
  return { items: rows.map(toRow), total, page: q.page, limit: q.limit };
}

export async function getArticle(actor: Actor, id: string) {
  return toFull(await loadViewable(actor, id));
}

/* — Create ————————————————————————————————————————————————— */

async function freeSlug(base: string): Promise<string> {
  const rows = await ArticleModel.find({ slug: { $regex: `^${base}(-\\d+)?$` } }, { slug: 1 }).lean();
  return uniqueSlug(base, new Set(rows.map((r) => r.slug)));
}

export async function createArticle(actor: Actor, input: CreateArticleInput) {
  let author = input.author;
  if (!author) {
    const linked = await AuthorModel.findOne({ userId: actor.id }, { slug: 1 }).lean();
    if (!linked) throw badRequest("Choose an author: your account has no byline", "AUTHOR_REQUIRED");
    author = linked.slug;
  }
  await assertReferences({ section: input.section, author });

  let slug: string;
  if (input.slug) {
    if (await ArticleModel.exists({ slug: input.slug })) throw conflict("That slug is taken", "SLUG_TAKEN");
    slug = input.slug;
  } else {
    const base = slugify(input.title);
    if (!base) throw badRequest("Give a slug: the title has no Latin letters to build one from", "SLUG_REQUIRED");
    slug = await freeSlug(base);
  }

  const created = await ArticleModel.create({
    slug,
    kind: input.kind,
    section: input.section,
    title: input.title,
    standfirst: input.standfirst ?? "",
    author,
    mins: input.mins ?? 1,
    image: input.image ?? "",
    tags: input.tags ?? [],
    detail: input.detail ?? defaultDetail(input.kind, input.section),
    body: input.body ?? [],
    status: "draft",
    publishedAt: null,
    createdBy: actor.id,
    version: 1,
  });

  const doc = created.toObject() as unknown as ArticleDoc;
  await ArticleRevisionModel.create({ article: doc._id, version: 1, snapshot: snapshotOf(doc), editedBy: actor.id });
  await audit(actor, "article.create", "article", doc._id.toString(), { slug });
  return toFull(doc);
}

/* — Update ————————————————————————————————————————————————— */

/** Shared by PATCH and by restoring a revision. Returns the saved article. */
async function applyContent(
  actor: Actor,
  before: ArticleDoc,
  patch: Partial<Pick<ArticleDoc, ContentField>>,
  baseVersion: number | undefined,
  action: string,
  meta: Record<string, unknown> = {},
) {
  if (baseVersion !== undefined && baseVersion !== before.version) {
    throw conflict("Someone saved this article after you opened it", "VERSION_CONFLICT", { currentVersion: before.version });
  }

  const changed = CONTENT_FIELDS.filter((f) => patch[f] !== undefined && JSON.stringify(patch[f]) !== JSON.stringify(before[f]));
  if (changed.length === 0) return toFull(before);

  if (changed.includes("slug")) {
    if (before.publishedAt) throw conflict("A slug cannot change once the article has been published", "SLUG_LOCKED");
    if (await ArticleModel.exists({ slug: patch.slug })) throw conflict("That slug is taken", "SLUG_TAKEN");
  }
  await assertReferences({ section: changed.includes("section") ? patch.section : undefined, author: changed.includes("author") ? patch.author : undefined });

  const set = Object.fromEntries(changed.map((f) => [f, patch[f]]));
  // an article that is (or will be) live may not be edited into an unpublishable state
  if (before.status === "published" || before.status === "scheduled") {
    await assertPublishable({ ...before, ...set } as ArticleDoc, before.publishedAt ?? new Date());
  }

  const after = await ArticleModel.findOneAndUpdate(
    { _id: before._id, version: before.version },
    { $set: set, $inc: { version: 1 } },
    { returnDocument: "after" },
  ).lean<ArticleDoc>();
  if (!after) throw conflict("Someone saved this article after you opened it", "VERSION_CONFLICT");

  await ArticleRevisionModel.create({ article: after._id, version: after.version, snapshot: snapshotOf(after), editedBy: actor.id });
  await audit(actor, action, "article", after._id.toString(), { version: after.version, fields: changed, ...meta });
  if (after.status === "published") await revalidate([...articleTags(before), ...articleTags(after)]);
  return toFull(after);
}

export async function updateArticle(actor: Actor, id: string, input: UpdateArticleInput) {
  const before = await loadEditable(actor, id);
  const { baseVersion, ...patch } = input;
  return applyContent(actor, before, patch, baseVersion, "article.update");
}

/* — Status workflow ————————————————————————————————————————— */

export async function changeStatus(actor: Actor, id: string, input: ChangeStatusInput) {
  if (!isEditorial(actor.role)) throw forbidden("Only editors can publish, schedule or archive", "NOT_EDITOR");
  const before = await load(id);
  const from = before.status;
  const to = input.status;
  if (!canTransition(from, to)) {
    throw conflict(`An article cannot go from ${from} to ${to}`, "INVALID_TRANSITION", { from, to });
  }

  const now = new Date();
  let publishedAt: Date | null = before.publishedAt;

  if (to === "scheduled") {
    const when = input.scheduledFor!;
    if (when.getTime() < now.getTime() + MIN_LEAD_MS) throw badRequest("Schedule at least a minute ahead", "SCHEDULE_TOO_SOON");
    publishedAt = when;
  } else if (to === "published") {
    // publishing now: a scheduled or never-published article goes live at this moment;
    // one that was live before keeps its original date
    publishedAt = from === "scheduled" || !before.publishedAt ? now : before.publishedAt;
  } else if (to === "draft" && from === "scheduled") {
    publishedAt = null;
  }

  if (to === "published" || to === "scheduled") await assertPublishable(before, publishedAt ?? now);

  const after = await ArticleModel.findOneAndUpdate(
    { _id: before._id, status: from },
    { $set: { status: to, publishedAt } },
    { returnDocument: "after" },
  ).lean<ArticleDoc>();
  if (!after) throw conflict("The article changed while you were working", "VERSION_CONFLICT");

  await audit(actor, "article.status", "article", after._id.toString(), { from, to, publishedAt });
  if (from === "published" || to === "published") await revalidate(articleTags(after));
  return toFull(after);
}

/* — Scheduled publishing ———————————————————————————————————— */

/** Flips every due `scheduled` article to `published`; returns their slugs. */
export async function publishDue(now = new Date()): Promise<string[]> {
  const due = await ArticleModel.find({ status: "scheduled", publishedAt: { $lte: now } }, { slug: 1, section: 1, author: 1 }).lean();
  if (due.length === 0) return [];
  await ArticleModel.updateMany({ _id: { $in: due.map((d) => d._id) }, status: "scheduled" }, { $set: { status: "published" } });
  await revalidate(due.flatMap(articleTags));
  return due.map((d) => d.slug);
}

let lastSweep = 0;
const SWEEP_EVERY_MS = 30_000;

/**
 * Keeps scheduled publishing honest on plain serverless hosting (Vercel Hobby
 * crons run only daily): public reads trigger the sweep, at most every 30 s.
 */
export async function sweepDue(): Promise<void> {
  const now = Date.now();
  if (now - lastSweep < SWEEP_EVERY_MS) return;
  lastSweep = now;
  await publishDue(new Date(now));
}

/** Test seam: forget the throttle. */
export const resetSweepThrottle = (): void => {
  lastSweep = 0;
};

/* — Revisions ——————————————————————————————————————————————— */

export async function listRevisions(actor: Actor, id: string) {
  const article = await loadViewable(actor, id);
  const rows = await ArticleRevisionModel.find({ article: article._id }, { snapshot: 0 })
    .sort({ version: -1 })
    .limit(200)
    .lean();
  return rows.map((r) => ({ version: r.version, editedBy: r.editedBy?.toString() ?? null, createdAt: r.createdAt }));
}

export async function getRevision(actor: Actor, id: string, version: number) {
  const article = await loadViewable(actor, id);
  const rev = await ArticleRevisionModel.findOne({ article: article._id, version }).lean();
  if (!rev) throw notFound("Revision not found", "REVISION_NOT_FOUND");
  return { version: rev.version, editedBy: rev.editedBy?.toString() ?? null, createdAt: rev.createdAt, snapshot: rev.snapshot };
}

/** Restores an earlier version's content as a new version (history is never rewritten). */
export async function restoreRevision(actor: Actor, id: string, version: number) {
  const before = await loadEditable(actor, id);
  const rev = await ArticleRevisionModel.findOne({ article: before._id, version }).lean();
  if (!rev) throw notFound("Revision not found", "REVISION_NOT_FOUND");
  const { slug: _slug, ...content } = rev.snapshot; // the address never rolls back
  void _slug;
  return applyContent(actor, before, content as Partial<Pick<ArticleDoc, ContentField>>, undefined, "article.restore", { restoredFrom: version });
}

/* — Delete ————————————————————————————————————————————————— */

export async function deleteArticle(actor: Actor, id: string): Promise<void> {
  if (actor.role !== "admin") throw forbidden("Only an admin can delete an article; archive it instead", "NOT_ADMIN");
  const doc = await load(id);
  await Promise.all([ArticleModel.deleteOne({ _id: doc._id }), ArticleRevisionModel.deleteMany({ article: doc._id })]);
  await audit(actor, "article.delete", "article", doc._id.toString(), { slug: doc.slug, status: doc.status });
  if (doc.status === "published") await revalidate(articleTags(doc));
}
