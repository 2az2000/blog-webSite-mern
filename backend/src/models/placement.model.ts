import mongoose, { Schema, model, type Types } from "mongoose";

/**
 * Which stories an editor has pinned to a page's slots (today: the front page).
 * Only slugs are stored; what readers see is resolved at read time, so an
 * unpublished or deleted story drops out by itself instead of leaving a hole.
 * An empty or short slot is filled with the newest stories (placements.service).
 */
export interface PlacementShape {
  page: string;
  slots: Record<string, string[]>;
  updatedBy?: Types.ObjectId;
  updatedAt: Date;
}

const placementSchema = new Schema<PlacementShape>(
  {
    page: { type: String, required: true, unique: true },
    slots: { type: Schema.Types.Mixed, default: {} },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: false, updatedAt: true }, minimize: false },
);

export const PlacementModel: mongoose.Model<PlacementShape> =
  (mongoose.models.Placement as mongoose.Model<PlacementShape> | undefined) ??
  model<PlacementShape>("Placement", placementSchema, "placements");
