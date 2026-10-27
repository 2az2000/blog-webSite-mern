import mongoose, { Schema, model } from "mongoose";

/**
 * What readers search for, as counts: which terms are popular and which find
 * nothing (a gap in the coverage). Terms only — never who searched, never an
 * address — so there is nothing here to protect beyond the words themselves.
 */
export interface SearchTermShape {
  /** Lower-cased, whitespace collapsed. */
  term: string;
  count: number;
  /** Searches for this term that found no article. */
  zeroCount: number;
  /** How many articles the latest search found. */
  lastResults: number;
  firstAt: Date;
  lastAt: Date;
}

const searchTermSchema = new Schema<SearchTermShape>({
  term: { type: String, required: true, unique: true, maxLength: 100 },
  count: { type: Number, default: 0, min: 0 },
  zeroCount: { type: Number, default: 0, min: 0 },
  lastResults: { type: Number, default: 0, min: 0 },
  firstAt: { type: Date, required: true },
  lastAt: { type: Date, required: true },
});

searchTermSchema.index({ count: -1, lastAt: -1 });
searchTermSchema.index({ zeroCount: -1, lastAt: -1 });

export const SearchTermModel: mongoose.Model<SearchTermShape> =
  (mongoose.models.SearchTerm as mongoose.Model<SearchTermShape> | undefined) ??
  model<SearchTermShape>("SearchTerm", searchTermSchema, "search_terms");
