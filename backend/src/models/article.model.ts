import mongoose, { Schema, model, type Types } from "mongoose";

export const ARTICLE_KINDS = ["article", "opinion", "video", "longread", "interview"] as const;
export type ArticleKind = (typeof ARTICLE_KINDS)[number];

export const ARTICLE_STATUSES = ["draft", "scheduled", "published", "archived"] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export const TRENDS = ["up", "down", "flat"] as const;
export type Trend = (typeof TRENDS)[number];

/**
 * An article. The body is structured blocks (never HTML) so the renderer owns
 * every class; `detail` carries the page-level copy (hero alt, caption,
 * long-form eyebrow …). Both are validated by zod when written
 * (modules/content/content.schemas.ts) and stored as-is.
 *
 * A draft may be incomplete (hence the lenient defaults here); publishing
 * re-validates the whole document against `articleInputSchema`.
 */
export interface ArticleShape {
  slug: string;
  kind: ArticleKind;
  /** Section slug. */
  section: string;
  title: string;
  standfirst: string;
  /** Author slug. */
  author: string;
  /**
   * Publication moment; the public `date` is its UTC calendar day. Null while a
   * draft; for a scheduled article it is the moment it goes live.
   */
  publishedAt: Date | null;
  /** Account that created the article (writers may only touch their own). */
  createdBy?: Types.ObjectId;
  /** Bumped on every content save; the revision history is keyed by it. */
  version: number;
  /** Reading time in minutes. */
  mins: number;
  /** Public path of the lead image. */
  image: string;
  /** Topic slugs. */
  tags: string[];
  views: number;
  /** Denormalised until comments exist (phase 5 keeps it in step). */
  commentCount: number;
  /** Denormalised from the `likes` collection; the engagement service keeps it in step. */
  likeCount: number;
  /** Completed reads, all time (a read counts once the reader reaches the end). */
  readCount: number;
  /** Direction on the trending board. */
  trend: Trend;
  status: ArticleStatus;
  detail: Record<string, unknown>;
  body: unknown[];
}

const articleSchema = new Schema<ArticleShape>(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    kind: { type: String, enum: ARTICLE_KINDS, required: true, index: true },
    section: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true, maxLength: 240 },
    standfirst: { type: String, default: "", trim: true, maxLength: 600 },
    author: { type: String, default: "", index: true },
    publishedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", index: true },
    version: { type: Number, default: 1, min: 1 },
    mins: { type: Number, default: 1, min: 1 },
    image: { type: String, default: "" },
    tags: { type: [String], default: [], index: true },
    views: { type: Number, default: 0, min: 0 },
    commentCount: { type: Number, default: 0, min: 0 },
    likeCount: { type: Number, default: 0, min: 0 },
    readCount: { type: Number, default: 0, min: 0 },
    trend: { type: String, enum: TRENDS, default: "flat" },
    status: { type: String, enum: ARTICLE_STATUSES, default: "draft", index: true },
    detail: { type: Schema.Types.Mixed, default: {} },
    body: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true, minimize: false },
);

// The three sort orders of GET /articles, each with the id tie-break keyset pagination needs.
articleSchema.index({ status: 1, publishedAt: -1, _id: -1 });
articleSchema.index({ status: 1, views: -1, _id: -1 });
articleSchema.index({ status: 1, commentCount: -1, _id: -1 });
// Search: headline counts most, then the topic tags, then the standfirst (GET /search).
articleSchema.index(
  { title: "text", tags: "text", standfirst: "text" },
  { name: "article_text", weights: { title: 10, tags: 6, standfirst: 3 }, default_language: "english" },
);

export const ArticleModel: mongoose.Model<ArticleShape> =
  (mongoose.models.Article as mongoose.Model<ArticleShape> | undefined) ?? model<ArticleShape>("Article", articleSchema, "articles");
