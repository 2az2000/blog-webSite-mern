/** Request contracts of the admin API. Content shapes come from the public contract. */
import { z } from "zod";
import { ARTICLE_KINDS, ARTICLE_STATUSES } from "../../models/article.model.js";
import { ROLES, USER_STATUSES } from "../../models/user.model.js";
import { bodyBlockSchema, slugSchema } from "../content/content.schemas.js";

export { queueQuery, removeCommentSchema } from "../comments/comments.schemas.js";
export { homePlacementSchema } from "../placements/placements.schemas.js";
export { termsQuery } from "../search/search.schemas.js";
export { issueInputSchema, issuePatchSchema, issuesQuery, scheduleSchema, subscribersQuery } from "../newsletter/newsletter.schemas.js";

/* — Articles ————————————————————————————————————————————— */

/*
 * No `.default()` in these: `.partial()` would still apply it and an update
 * would silently reset fields. Defaults are applied by the service on create.
 */
const articleFields = {
  slug: slugSchema,
  kind: z.enum(ARTICLE_KINDS),
  section: slugSchema,
  title: z.string().trim().min(1).max(240),
  standfirst: z.string().trim().max(600),
  author: slugSchema,
  mins: z.number().int().positive().max(240),
  image: z.string().trim().max(500),
  tags: z.array(slugSchema).max(12),
  detail: z.record(z.string(), z.unknown()),
  body: z.array(bodyBlockSchema).max(400),
};

/** A new article starts as a draft; only what identifies it is mandatory. */
export const createArticleSchema = z.object({
  kind: articleFields.kind,
  section: articleFields.section,
  title: articleFields.title,
  slug: articleFields.slug.optional(),
  standfirst: articleFields.standfirst.optional(),
  author: articleFields.author.optional(),
  mins: articleFields.mins.optional(),
  image: articleFields.image.optional(),
  tags: articleFields.tags.optional(),
  detail: articleFields.detail.optional(),
  body: articleFields.body.optional(),
});

export const updateArticleSchema = z
  .object(articleFields)
  .partial()
  .extend({
    /** The version the editor was looking at; a mismatch means someone saved in between. */
    baseVersion: z.number().int().positive().optional(),
  })
  .refine((v) => Object.keys(v).some((k) => k !== "baseVersion"), { message: "Nothing to update" });

export const changeStatusSchema = z
  .object({
    status: z.enum(ARTICLE_STATUSES),
    scheduledFor: z.coerce.date().optional(),
  })
  .refine((v) => v.status !== "scheduled" || v.scheduledFor !== undefined, {
    message: "scheduledFor is required to schedule an article",
    path: ["scheduledFor"],
  });

const page = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

export const adminListQuery = z.object({
  status: z.enum(ARTICLE_STATUSES).optional(),
  section: slugSchema.optional(),
  author: slugSchema.optional(),
  /** Case-insensitive match on the title. */
  q: z.string().trim().min(1).max(100).optional(),
  ...page,
});

export const pageQuery = z.object(page);

/** Broken-link reports: open ones by default. (`z.coerce.boolean` reads "false" as true, so spell it out.) */
export const reportsQuery = z.object({
  resolved: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  ...page,
});

export const auditQuery = z.object({
  entity: z.string().max(40).optional(),
  entityId: z.string().max(64).optional(),
  action: z.string().max(60).optional(),
  ...page,
});

/* — Users ———————————————————————————————————————————————— */

export const userListQuery = z.object({
  role: z.enum(ROLES).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  ...page,
});

export const updateUserSchema = z
  .object({ role: z.enum(ROLES).optional(), status: z.enum(USER_STATUSES).optional() })
  .refine((v) => v.role !== undefined || v.status !== undefined, { message: "Nothing to update" });

/* — Taxonomy ————————————————————————————————————————————— */

export const authorBodySchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(1).max(120),
  initials: z.string().trim().min(1).max(4),
  role: z.string().trim().min(1).max(160),
  since: z.number().int().min(1900).max(2200),
  bio: z.string().trim().min(1).max(2000),
  portrait: z.string().trim().max(500).optional(),
  /** Links the byline to the account that writes under it. */
  userId: z.string().regex(/^[a-f0-9]{24}$/).nullable().optional(),
});

export const sectionBodySchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(1).max(80),
  blurb: z.string().trim().max(600).default(""),
  order: z.number().int().min(0).max(1000).optional(),
});

export const topicBodySchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(1).max(80),
  blurb: z.string().trim().max(600).default(""),
  related: z.array(slugSchema).max(12).default([]),
});

/** PATCH: any subset, slug is the identity and cannot change. */
export const authorPatchSchema = authorBodySchema.omit({ slug: true }).partial();
export const sectionPatchSchema = sectionBodySchema.omit({ slug: true }).partial();
export const topicPatchSchema = topicBodySchema.omit({ slug: true }).partial();

/* — Media ———————————————————————————————————————————————— */

export const registerMediaSchema = z.object({
  url: z.url().refine((u) => u.startsWith("https://"), { message: "Use an https URL" }),
  width: z.number().int().positive().max(20000),
  height: z.number().int().positive().max(20000),
  alt: z.string().trim().max(500).default(""),
  /** Ornamental only: allowed to have no description. Everything else needs one. */
  decorative: z.boolean().default(false),
  credit: z.string().trim().max(200).default(""),
  publicId: z.string().max(300).optional(),
}).superRefine((v, ctx) => {
  if (v.decorative && v.alt) ctx.addIssue({ code: "custom", path: ["alt"], message: "A decorative image has no description" });
  if (!v.decorative && !v.alt) ctx.addIssue({ code: "custom", path: ["alt"], message: "Describe the image, or mark it decorative" });
});

export type CreateArticleInput = z.infer<typeof createArticleSchema>;
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
export type AdminListQuery = z.infer<typeof adminListQuery>;

/** The overview window. Read events live 90 days, so two 30-day windows (this and the one before) always fit. */
export const STATS_WINDOWS = [7, 14, 30] as const;
export const statsQuery = z.object({
  days: z.coerce.number().pipe(z.union([z.literal(7), z.literal(14), z.literal(30)])).default(30),
});
