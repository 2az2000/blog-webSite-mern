import mongoose, { Schema, model } from "mongoose";

/** A desk ("technology", "opinion" …). `latest` is a virtual desk: every article. */
export interface SectionShape {
  slug: string;
  name: string;
  blurb: string;
  /** Position in the navigation. */
  order: number;
}

const sectionSchema = new Schema<SectionShape>(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true, maxLength: 80 },
    blurb: { type: String, default: "", maxLength: 600 },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const SectionModel: mongoose.Model<SectionShape> =
  (mongoose.models.Section as mongoose.Model<SectionShape> | undefined) ?? model<SectionShape>("Section", sectionSchema, "sections");
