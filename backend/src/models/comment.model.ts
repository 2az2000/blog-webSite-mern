import mongoose, { Schema, model, type Types } from "mongoose";

export const COMMENT_STATUSES = ["published", "held", "removed"] as const;
export type CommentStatus = (typeof COMMENT_STATUSES)[number];

export const REPORT_REASONS = ["spam", "abuse", "off-topic", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/**
 * A reader's comment. One level of replies only: a reply always points at a
 * top-level comment, never at another reply.
 *
 *  published — visible to everyone
 *  held      — waiting for a moderator; visible only to its author
 *  removed   — keeps its slot with a stated reason (by a moderator), or is a
 *              deleted comment that still has replies under it (by the author)
 */
export interface CommentShape {
  article: string;
  user: Types.ObjectId;
  /** The top-level comment this replies to; null for a top-level comment. */
  parent: Types.ObjectId | null;
  body: string;
  status: CommentStatus;
  likeCount: number;
  reportCount: number;
  /** Times the author has edited it (one edit is allowed). */
  editCount: number;
  editedAt?: Date;
  removedBy?: "moderator" | "author";
  removedReason?: string;
  /** Why it was held: `short`, `links`, `first-link`, `reports`, `reposted`. */
  heldFor?: string;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<CommentShape>(
  {
    article: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    parent: { type: Schema.Types.ObjectId, ref: "Comment", default: null },
    body: { type: String, default: "", maxLength: 2000 },
    status: { type: String, enum: COMMENT_STATUSES, required: true },
    likeCount: { type: Number, default: 0, min: 0 },
    reportCount: { type: Number, default: 0, min: 0 },
    editCount: { type: Number, default: 0, min: 0 },
    editedAt: { type: Date },
    removedBy: { type: String, enum: ["moderator", "author"] },
    removedReason: { type: String, maxLength: 200 },
    heldFor: { type: String, maxLength: 40 },
  },
  { timestamps: true },
);

commentSchema.index({ article: 1, parent: 1, createdAt: -1, _id: -1 });
commentSchema.index({ article: 1, parent: 1, likeCount: -1, createdAt: -1 });
commentSchema.index({ parent: 1, createdAt: 1 }, { sparse: true });
commentSchema.index({ user: 1, createdAt: -1 });
// the moderation queue
commentSchema.index({ status: 1, createdAt: 1 });
commentSchema.index({ reportCount: 1, status: 1 });

export const CommentModel: mongoose.Model<CommentShape> =
  (mongoose.models.Comment as mongoose.Model<CommentShape> | undefined) ?? model<CommentShape>("Comment", commentSchema, "comments");

/** A reader's like on a comment. `Comment.likeCount` is kept in step by the comments service. */
export interface CommentLikeShape {
  user: Types.ObjectId;
  comment: Types.ObjectId;
  createdAt: Date;
}

const commentLikeSchema = new Schema<CommentLikeShape>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    comment: { type: Schema.Types.ObjectId, ref: "Comment", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
commentLikeSchema.index({ user: 1, comment: 1 }, { unique: true });
commentLikeSchema.index({ comment: 1 });

export const CommentLikeModel: mongoose.Model<CommentLikeShape> =
  (mongoose.models.CommentLike as mongoose.Model<CommentLikeShape> | undefined) ??
  model<CommentLikeShape>("CommentLike", commentLikeSchema, "comment_likes");

/** One reader's report of one comment (a reader can report a comment once). */
export interface CommentReportShape {
  comment: Types.ObjectId;
  user: Types.ObjectId;
  reason: ReportReason;
  note?: string;
  createdAt: Date;
}

const commentReportSchema = new Schema<CommentReportShape>(
  {
    comment: { type: Schema.Types.ObjectId, ref: "Comment", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    note: { type: String, maxLength: 300 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
commentReportSchema.index({ comment: 1, user: 1 }, { unique: true });

export const CommentReportModel: mongoose.Model<CommentReportShape> =
  (mongoose.models.CommentReport as mongoose.Model<CommentReportShape> | undefined) ??
  model<CommentReportShape>("CommentReport", commentReportSchema, "comment_reports");
