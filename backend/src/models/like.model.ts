import mongoose, { Schema, model, type Types } from "mongoose";

/** A reader's like on an article. `Article.likeCount` is kept in step by the engagement service. */
export interface LikeShape {
  user: Types.ObjectId;
  article: string;
  createdAt: Date;
}

const likeSchema = new Schema<LikeShape>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    article: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

likeSchema.index({ user: 1, article: 1 }, { unique: true });

export const LikeModel: mongoose.Model<LikeShape> =
  (mongoose.models.Like as mongoose.Model<LikeShape> | undefined) ?? model<LikeShape>("Like", likeSchema, "likes");
