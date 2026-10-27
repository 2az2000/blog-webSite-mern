import mongoose, { Schema, model } from "mongoose";

/** A continuing line of coverage. Articles reference topics by slug in `tags`. */
export interface TopicShape {
  slug: string;
  name: string;
  blurb: string;
  related: string[];
}

const topicSchema = new Schema<TopicShape>(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true, maxLength: 80 },
    blurb: { type: String, default: "", maxLength: 600 },
    related: { type: [String], default: [] },
  },
  { timestamps: true },
);

export const TopicModel: mongoose.Model<TopicShape> =
  (mongoose.models.Topic as mongoose.Model<TopicShape> | undefined) ?? model<TopicShape>("Topic", topicSchema, "topics");
