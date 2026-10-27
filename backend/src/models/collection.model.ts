import mongoose, { Schema, model, type Types } from "mongoose";

export const MAX_COLLECTIONS = 20;
export const MAX_COLLECTION_ARTICLES = 200;

/** A reader's named set of articles ("For the train", "Climate"). */
export interface CollectionShape {
  user: Types.ObjectId;
  name: string;
  /** Article slugs, in the order they were added. */
  articles: string[];
  createdAt: Date;
  updatedAt: Date;
}

const collectionSchema = new Schema<CollectionShape>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxLength: 60 },
    articles: { type: [String], default: [] },
  },
  { timestamps: true },
);

export const CollectionModel: mongoose.Model<CollectionShape> =
  (mongoose.models.Collection as mongoose.Model<CollectionShape> | undefined) ??
  model<CollectionShape>("Collection", collectionSchema, "collections");
