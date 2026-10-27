/**
 * The content contract. The body block union mirrors `BodyBlock` in
 * web/src/types/content.ts one-to-one — it is what a CMS writes and what the
 * article renderer draws. Used to validate the seed now and the admin editor
 * later; the public read endpoints are validated against it in tests.
 */
import { z } from "zod";
import { ARTICLE_KINDS, ARTICLE_STATUSES, TRENDS } from "../../models/article.model.js";

const text = z.string().min(1);
export const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lower-case words joined by hyphens");

const figure = z.object({
  type: z.literal("figure"),
  src: text,
  alt: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  caption: z.string(),
  credit: z.string().optional(),
  /** Ornamental: no description needed (rendered with an empty alt). */
  decorative: z.boolean().optional(),
  ratio: z.enum(["3x2", "16x9"]).optional(),
  wide: z.boolean().optional(),
});

export const bodyBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("p"), text }),
  z.object({ type: z.literal("h2"), text }),
  z.object({ type: z.literal("h3"), text }),
  z.object({ type: z.literal("list"), items: z.array(text).min(1) }),
  figure,
  z.object({ type: z.literal("pullquote"), text, cite: z.string() }),
  z.object({ type: z.literal("blockquote"), text }),
  z.object({ type: z.literal("recirc"), label: text, slugs: z.array(slugSchema).optional() }),
  z.object({ type: z.literal("chapter"), id: text, label: text, title: text }),
  z.object({
    type: z.literal("break"),
    src: text,
    alt: z.string(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    caption: z.string(),
    credit: z.string(),
    decorative: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("chart"),
    description: text,
    max: z.number().positive(),
    unit: z.string(),
    rows: z.array(z.object({ label: text, value: z.number(), muted: z.boolean().optional() })).min(1),
  }),
  z.object({ type: z.literal("chartNote"), text }),
  z.object({ type: z.literal("note"), label: text, text }),
  z.object({
    type: z.literal("timeline"),
    items: z.array(z.object({ year: text, title: text, text })).min(1),
  }),
]);

export type BodyBlock = z.infer<typeof bodyBlockSchema>;

/** Page-level copy of an ordinary article. */
export const articleDetailSchema = z.object({
  label: z.string(),
  heroAlt: z.string(),
  heroCaption: z.string(),
  heroCredit: z.string(),
  updated: z.string().optional(),
  dropcap: z.boolean(),
});

/** Page-level copy of a long read. */
export const longformDetailSchema = z.object({
  eyebrow: text,
  heroAlt: z.string(),
  bylineRole: z.string(),
  reporterBio: z.string(),
  filedUnder: z.array(z.object({ label: text, topic: slugSchema })),
  relatedSection: slugSchema,
  related: z.array(slugSchema),
});

export type ArticleDetail = z.infer<typeof articleDetailSchema>;
export type LongformDetail = z.infer<typeof longformDetailSchema>;

/** One article as stored (and as the admin editor will submit it in phase 3). */
export const articleInputSchema = z.object({
  slug: slugSchema,
  kind: z.enum(ARTICLE_KINDS),
  section: slugSchema,
  title: z.string().min(1).max(240),
  standfirst: z.string().min(1).max(600),
  author: slugSchema,
  publishedAt: z.coerce.date(),
  mins: z.number().int().positive(),
  image: text,
  tags: z.array(slugSchema),
  views: z.number().int().nonnegative().default(0),
  commentCount: z.number().int().nonnegative().default(0),
  trend: z.enum(TRENDS).default("flat"),
  status: z.enum(ARTICLE_STATUSES).default("published"),
  detail: z.union([longformDetailSchema, articleDetailSchema]),
  body: z.array(bodyBlockSchema),
});

export type ArticleInput = z.infer<typeof articleInputSchema>;

/* — Query strings ————————————————————————————————————— */

const csv = z
  .string()
  .optional()
  .transform((v) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : undefined));

export const SORTS = ["latest", "popular", "discussed"] as const;
export type Sort = (typeof SORTS)[number];

export const listArticlesQuery = z.object({
  /** `latest` is every desk. */
  section: slugSchema.optional(),
  author: slugSchema.optional(),
  topic: slugSchema.optional(),
  /** comma-separated kinds, e.g. `article,opinion` */
  kind: csv.pipe(z.array(z.enum(ARTICLE_KINDS)).optional()),
  /** comma-separated slugs to leave out */
  exclude: csv,
  sort: z.enum(SORTS).default("latest"),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  cursor: z.string().max(200).optional(),
});

export type ListArticlesQuery = z.infer<typeof listArticlesQuery>;

export const limitQuery = z.object({ limit: z.coerce.number().int().min(1).max(20).default(5) });
