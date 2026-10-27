import mongoose, { Schema, model, type Types } from "mongoose";

/**
 * One viewer's visit to one article on one day. It is what makes a view count
 * once (not once per refresh), what marks a read as completed, and — for a
 * signed-in reader — what the "recently viewed" list is built from.
 *
 * `viewer` is never an address: it is a salted hash that rotates daily for
 * anonymous visitors (so nobody can be followed across days), or `u:<id>`.
 * Rows expire on their own after 90 days.
 */
export interface ReadEventShape {
  article: string;
  viewer: string;
  /** UTC calendar day, YYYY-MM-DD. */
  day: string;
  user?: Types.ObjectId;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const READ_EVENT_TTL_SECONDS = 90 * 24 * 3600;

const readEventSchema = new Schema<ReadEventShape>(
  {
    article: { type: String, required: true },
    viewer: { type: String, required: true },
    day: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

readEventSchema.index({ article: 1, viewer: 1, day: 1 }, { unique: true });
readEventSchema.index({ user: 1, updatedAt: -1 }, { sparse: true });
// the trending board: completed reads in the last days
readEventSchema.index({ completed: 1, day: -1, article: 1 });
readEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: READ_EVENT_TTL_SECONDS });

export const ReadEventModel: mongoose.Model<ReadEventShape> =
  (mongoose.models.ReadEvent as mongoose.Model<ReadEventShape> | undefined) ??
  model<ReadEventShape>("ReadEvent", readEventSchema, "read_events");
