import mongoose, { Schema, model, type Types } from "mongoose";

export const FOLLOW_KINDS = ["author", "topic"] as const;
export type FollowKind = (typeof FOLLOW_KINDS)[number];

/** A reader following an author or a topic. */
export interface FollowShape {
  user: Types.ObjectId;
  kind: FollowKind;
  slug: string;
  createdAt: Date;
}

const followSchema = new Schema<FollowShape>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    kind: { type: String, enum: FOLLOW_KINDS, required: true },
    slug: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

followSchema.index({ user: 1, kind: 1, slug: 1 }, { unique: true });
// follower counts on author/topic pages
followSchema.index({ kind: 1, slug: 1 });

export const FollowModel: mongoose.Model<FollowShape> =
  (mongoose.models.Follow as mongoose.Model<FollowShape> | undefined) ?? model<FollowShape>("Follow", followSchema, "follows");
