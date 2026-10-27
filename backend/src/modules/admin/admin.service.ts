/** Admin-only data: accounts, the byline/desk/topic directories, the media library, the audit trail. */
import { createHash } from "node:crypto";
import { Types } from "mongoose";
import { env } from "../../config/env.js";
import { ArticleModel } from "../../models/article.model.js";
import { AuditLogModel } from "../../models/audit-log.model.js";
import { AuthorModel, type AuthorShape } from "../../models/author.model.js";
import { MediaModel } from "../../models/media.model.js";
import { SectionModel } from "../../models/section.model.js";
import { TopicModel } from "../../models/topic.model.js";
import { UserModel } from "../../models/user.model.js";
import { AppError, badRequest, conflict, notFound } from "../../http/errors.js";
import { audit, type Actor } from "../../services/audit.service.js";
import { revalidate } from "../../services/revalidate.service.js";
import { revokeAllForUser } from "../../services/session.service.js";
import type { z } from "zod";
import type {
  authorBodySchema,
  authorPatchSchema,
  registerMediaSchema,
  sectionBodySchema,
  sectionPatchSchema,
  topicBodySchema,
  topicPatchSchema,
  updateUserSchema,
} from "./admin.schemas.js";

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function objectId(id: string): Types.ObjectId {
  if (!/^[a-f0-9]{24}$/.test(id)) throw badRequest("Not a valid id", "INVALID_ID");
  return new Types.ObjectId(id);
}

/* — Users ———————————————————————————————————————————————— */

export async function listUsers(q: { role?: string; q?: string; page: number; limit: number }) {
  const filter: Record<string, unknown> = {};
  if (q.role) filter.role = q.role;
  if (q.q) {
    const rx = { $regex: escapeRegex(q.q), $options: "i" };
    filter.$or = [{ email: rx }, { name: rx }];
  }
  const [rows, total] = await Promise.all([
    UserModel.find(filter, { name: 1, email: 1, role: 1, status: 1, emailVerified: 1, createdAt: 1 })
      .sort({ createdAt: -1, _id: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean(),
    UserModel.countDocuments(filter),
  ]);
  return {
    items: rows.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      emailVerified: u.emailVerified,
      createdAt: u.createdAt,
    })),
    total,
    page: q.page,
    limit: q.limit,
  };
}

export async function updateUser(actor: Actor, id: string, patch: z.infer<typeof updateUserSchema>) {
  const target = await UserModel.findById(objectId(id));
  if (!target) throw notFound("User not found", "USER_NOT_FOUND");
  // The only guard against an admin locking every admin out, themselves included.
  if (target._id.equals(actor.id)) throw conflict("You cannot change your own role or status", "SELF_CHANGE");

  const before = { role: target.role, status: target.status };
  if (patch.role) target.role = patch.role;
  if (patch.status) target.status = patch.status;
  await target.save();

  if (target.status === "suspended") await revokeAllForUser(target._id.toString(), "admin-action");
  await audit(actor, "user.update", "user", target._id.toString(), { before, after: { role: target.role, status: target.status } });
  return { id: target._id.toString(), name: target.name, email: target.email, role: target.role, status: target.status };
}

/* — Directories ———————————————————————————————————————————— */

const duplicate = (err: unknown): boolean => typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;

async function guardInUse(field: "author" | "section" | "tags", slug: string, what: string): Promise<void> {
  const used = await ArticleModel.countDocuments({ [field]: slug });
  if (used > 0) throw conflict(`${what} is used by ${used} article(s)`, "IN_USE", { articles: used });
}

export async function createAuthor(actor: Actor, body: z.infer<typeof authorBodySchema>) {
  const { userId, ...rest } = body;
  try {
    const doc = await AuthorModel.create({ ...rest, ...(userId ? { userId: objectId(userId) } : {}) });
    await audit(actor, "author.create", "author", doc.slug);
    return doc.toObject();
  } catch (err) {
    if (duplicate(err)) throw conflict("That slug or account is already in use", "DUPLICATE");
    throw err;
  }
}

export async function updateAuthor(actor: Actor, slug: string, patch: z.infer<typeof authorPatchSchema>) {
  const { userId, ...rest } = patch;
  const set: Record<string, unknown> = { ...rest };
  if (typeof userId === "string") set.userId = objectId(userId);
  const update: Record<string, unknown> = {};
  if (Object.keys(set).length > 0) update.$set = set;
  if (userId === null) update.$unset = { userId: 1 }; // null unlinks the account

  try {
    const doc = await AuthorModel.findOneAndUpdate({ slug }, update, { returnDocument: "after" }).lean<AuthorShape>();
    if (!doc) throw notFound("Author not found", "AUTHOR_NOT_FOUND");
    await audit(actor, "author.update", "author", slug, { fields: Object.keys(patch) });
    await revalidate([`author:${slug}`]);
    return doc;
  } catch (err) {
    if (duplicate(err)) throw conflict("That account already has a byline", "DUPLICATE");
    throw err;
  }
}

export async function deleteAuthor(actor: Actor, slug: string): Promise<void> {
  await guardInUse("author", slug, "This author");
  if (!(await AuthorModel.findOneAndDelete({ slug }))) throw notFound("Author not found", "AUTHOR_NOT_FOUND");
  await audit(actor, "author.delete", "author", slug);
}

export async function createSection(actor: Actor, body: z.infer<typeof sectionBodySchema>) {
  try {
    const order = body.order ?? (await SectionModel.countDocuments());
    const doc = await SectionModel.create({ ...body, order });
    await audit(actor, "section.create", "section", doc.slug);
    await revalidate(["sections"]);
    return doc.toObject();
  } catch (err) {
    if (duplicate(err)) throw conflict("That slug is taken", "SLUG_TAKEN");
    throw err;
  }
}

export async function updateSection(actor: Actor, slug: string, patch: z.infer<typeof sectionPatchSchema>) {
  const doc = await SectionModel.findOneAndUpdate({ slug }, { $set: patch }, { returnDocument: "after" }).lean();
  if (!doc) throw notFound("Section not found", "SECTION_NOT_FOUND");
  await audit(actor, "section.update", "section", slug, { fields: Object.keys(patch) });
  await revalidate(["sections", `section:${slug}`]);
  return doc;
}

export async function deleteSection(actor: Actor, slug: string): Promise<void> {
  if (slug === "latest") throw conflict("The Latest desk is built in", "BUILT_IN");
  await guardInUse("section", slug, "This section");
  if (!(await SectionModel.findOneAndDelete({ slug }))) throw notFound("Section not found", "SECTION_NOT_FOUND");
  await audit(actor, "section.delete", "section", slug);
  await revalidate(["sections"]);
}

export async function createTopic(actor: Actor, body: z.infer<typeof topicBodySchema>) {
  try {
    const doc = await TopicModel.create(body);
    await audit(actor, "topic.create", "topic", doc.slug);
    return doc.toObject();
  } catch (err) {
    if (duplicate(err)) throw conflict("That slug is taken", "SLUG_TAKEN");
    throw err;
  }
}

export async function updateTopic(actor: Actor, slug: string, patch: z.infer<typeof topicPatchSchema>) {
  const doc = await TopicModel.findOneAndUpdate({ slug }, { $set: patch }, { returnDocument: "after" }).lean();
  if (!doc) throw notFound("Topic not found", "TOPIC_NOT_FOUND");
  await audit(actor, "topic.update", "topic", slug, { fields: Object.keys(patch) });
  await revalidate([`topic:${slug}`]);
  return doc;
}

export async function deleteTopic(actor: Actor, slug: string): Promise<void> {
  await guardInUse("tags", slug, "This topic");
  if (!(await TopicModel.findOneAndDelete({ slug }))) throw notFound("Topic not found", "TOPIC_NOT_FOUND");
  await audit(actor, "topic.delete", "topic", slug);
}

/* — Media —————————————————————————————————————————————————— */


/**
 * What may be uploaded. Signed into the request, so a forged form cannot add a
 * format; SVG is left out on purpose (it can carry script), and so is anything
 * that is not a still picture the site can serve in several sizes.
 */
export const ALLOWED_IMAGE_FORMATS = "jpg,jpeg,png,webp,avif,gif";

/**
 * Signed parameters for a direct browser → Cloudinary upload: the file never
 * passes through this API (or its body limit), and the API secret never leaves it.
 */
export function signUpload() {
  const { cloudName, apiKey, apiSecret } = env.cloudinary;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new AppError(503, "MEDIA_NOT_CONFIGURED", "Image uploads are not configured on this server");
  }
  const timestamp = Math.floor(Date.now() / 1000);
  // Cloudinary signs the parameters sorted by name
  const folder = env.cloudinary.folder;
  const toSign = `allowed_formats=${ALLOWED_IMAGE_FORMATS}&folder=${folder}&timestamp=${timestamp}`;
  const signature = createHash("sha1").update(toSign + apiSecret).digest("hex");
  return { uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, apiKey, timestamp, folder, allowedFormats: ALLOWED_IMAGE_FORMATS, signature };
}

/** Records an uploaded image with its dimensions, alt text and credit. */
export async function registerMedia(actor: Actor, body: z.infer<typeof registerMediaSchema>) {
  const { cloudName } = env.cloudinary;
  if (cloudName && !body.url.startsWith(`https://res.cloudinary.com/${cloudName}/`)) {
    throw badRequest("The image must be hosted on this site's media account", "FOREIGN_MEDIA");
  }
  try {
    const doc = await MediaModel.create({ ...body, uploadedBy: actor.id });
    await audit(actor, "media.create", "media", doc._id.toString(), { url: body.url });
    return doc.toObject();
  } catch (err) {
    if (duplicate(err)) throw conflict("That image is already in the library", "DUPLICATE");
    throw err;
  }
}

export async function listMedia(q: { page: number; limit: number }) {
  const [items, total] = await Promise.all([
    MediaModel.find().sort({ createdAt: -1, _id: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    MediaModel.countDocuments(),
  ]);
  return { items, total, page: q.page, limit: q.limit };
}

/* — Audit trail ———————————————————————————————————————————— */

export async function listAudit(q: { entity?: string; entityId?: string; action?: string; page: number; limit: number }) {
  const filter: Record<string, unknown> = {};
  if (q.entity) filter.entity = q.entity;
  if (q.entityId) filter.entityId = q.entityId;
  if (q.action) filter.action = q.action;
  const [items, total] = await Promise.all([
    AuditLogModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    AuditLogModel.countDocuments(filter),
  ]);
  return { items, total, page: q.page, limit: q.limit };
}
