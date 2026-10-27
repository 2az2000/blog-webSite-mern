import mongoose, { Schema, model, type Types } from "mongoose";

/** A byline. NOVA sets a typographic monogram unless a commissioned portrait exists. */
export interface AuthorShape {
  slug: string;
  name: string;
  /** Monogram for the typographic avatar. */
  initials: string;
  role: string;
  /** Year of the first NOVA byline. */
  since: number;
  bio: string;
  portrait?: string;
  /** The account that writes under this byline (a writer’s default author). */
  userId?: Types.ObjectId;
}

const authorSchema = new Schema<AuthorShape>(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true, maxLength: 120 },
    initials: { type: String, required: true, trim: true, maxLength: 4 },
    role: { type: String, required: true, trim: true, maxLength: 160 },
    since: { type: Number, required: true },
    bio: { type: String, required: true, maxLength: 2000 },
    portrait: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: "User", unique: true, sparse: true },
  },
  { timestamps: true },
);

export const AuthorModel: mongoose.Model<AuthorShape> =
  (mongoose.models.Author as mongoose.Model<AuthorShape> | undefined) ?? model<AuthorShape>("Author", authorSchema, "authors");
