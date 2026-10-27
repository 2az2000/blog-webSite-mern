import mongoose, { Schema, model } from "mongoose";

/** A page address readers hit and reported as broken ("Report the broken link" on the 404). */
export interface BrokenLinkShape {
  /** Path only, no query string. */
  path: string;
  referrer?: string;
  count: number;
  resolved: boolean;
  firstSeenAt: Date;
  lastSeenAt: Date;
}

const brokenLinkSchema = new Schema<BrokenLinkShape>({
  path: { type: String, required: true, unique: true, maxLength: 300 },
  referrer: { type: String, maxLength: 300 },
  count: { type: Number, default: 1, min: 1 },
  resolved: { type: Boolean, default: false },
  firstSeenAt: { type: Date, required: true },
  lastSeenAt: { type: Date, required: true },
});

brokenLinkSchema.index({ resolved: 1, count: -1 });

export const BrokenLinkModel: mongoose.Model<BrokenLinkShape> =
  (mongoose.models.BrokenLink as mongoose.Model<BrokenLinkShape> | undefined) ??
  model<BrokenLinkShape>("BrokenLink", brokenLinkSchema, "broken_links");
