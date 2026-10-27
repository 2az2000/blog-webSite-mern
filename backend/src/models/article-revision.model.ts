import mongoose, { Schema, model, type Types } from "mongoose";

/**
 * An immutable snapshot of an article's content at one version. Written on
 * every content save, so an editor can read any earlier state and restore it.
 */
export interface ArticleRevisionShape {
  article: Types.ObjectId;
  version: number;
  /** The editable content as it stood at this version. */
  snapshot: {
    slug: string;
    kind: string;
    section: string;
    title: string;
    standfirst: string;
    author: string;
    mins: number;
    image: string;
    tags: string[];
    detail: Record<string, unknown>;
    body: unknown[];
  };
  editedBy?: Types.ObjectId;
  createdAt: Date;
}

const revisionSchema = new Schema<ArticleRevisionShape>(
  {
    article: { type: Schema.Types.ObjectId, ref: "Article", required: true },
    version: { type: Number, required: true, min: 1 },
    snapshot: { type: Schema.Types.Mixed, required: true },
    editedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: true, updatedAt: false }, minimize: false },
);

revisionSchema.index({ article: 1, version: -1 }, { unique: true });

export const ArticleRevisionModel: mongoose.Model<ArticleRevisionShape> =
  (mongoose.models.ArticleRevision as mongoose.Model<ArticleRevisionShape> | undefined) ??
  model<ArticleRevisionShape>("ArticleRevision", revisionSchema, "article_revisions");
