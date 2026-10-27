import { z } from "zod";

export const SORTS = ["relevance", "newest", "popular"] as const;

export const searchQuery = z.object({
  q: z.string().trim().min(1).max(200),
  sort: z.enum(SORTS).default("relevance"),
  page: z.coerce.number().int().min(1).max(50).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const popularQuery = z.object({ limit: z.coerce.number().int().min(1).max(20).default(7) });

export const termsQuery = z.object({
  kind: z.enum(["top", "empty"]).default("top"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type SearchQuery = z.infer<typeof searchQuery>;
