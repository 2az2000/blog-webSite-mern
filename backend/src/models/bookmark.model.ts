import mongoose, { Schema, model, type Types } from "mongoose";

/** One saved article on a reader's reading list. */
export interface BookmarkShape {
  user: Types.ObjectId;
  /** Article slug (the public identity of an article). */
  article: string;
  createdAt: Date;
}

const bookmarkSchema = new Schema<BookmarkShape>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    article: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

bookmarkSchema.index({ user: 1, article: 1 }, { unique: true });
bookmarkSchema.index({ user: 1, createdAt: -1, _id: -1 });

export const BookmarkModel: mongoose.Model<BookmarkShape> =
  (mongoose.models.Bookmark as mongoose.Model<BookmarkShape> | undefined) ?? model<BookmarkShape>("Bookmark", bookmarkSchema, "bookmarks");
