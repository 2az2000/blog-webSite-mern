import mongoose, { Schema, model, type Types } from "mongoose";

/** An uploaded image registered in the library, with the accessibility copy NOVA requires. */
export interface MediaShape {
  url: string;
  width: number;
  height: number;
  /** Required: describe the picture. Empty only when `decorative` is true. */
  alt: string;
  /** Purely ornamental: read as nothing by a screen reader, so it needs no description. */
  decorative: boolean;
  credit: string;
  /** Provider's id (Cloudinary public_id) — what a delete would need. */
  publicId?: string;
  uploadedBy: Types.ObjectId;
  createdAt: Date;
}

const mediaSchema = new Schema<MediaShape>(
  {
    url: { type: String, required: true, unique: true },
    width: { type: Number, required: true, min: 1 },
    height: { type: Number, required: true, min: 1 },
    // "" is a legal value (decorative images), so `required` cannot be used; the API rule is in registerMediaSchema
    alt: { type: String, default: "", maxLength: 500 },
    decorative: { type: Boolean, default: false },
    credit: { type: String, default: "", maxLength: 200 },
    publicId: { type: String },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

mediaSchema.index({ createdAt: -1, _id: -1 });

export const MediaModel: mongoose.Model<MediaShape> =
  (mongoose.models.Media as mongoose.Model<MediaShape> | undefined) ?? model<MediaShape>("Media", mediaSchema, "media");
