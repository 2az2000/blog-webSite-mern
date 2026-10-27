/** Request contracts of the reader-engagement API. */
import { z } from "zod";
import { FOLLOW_KINDS } from "../../models/follow.model.js";
import { slugSchema } from "../content/content.schemas.js";

export const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const historyQuery = z.object({ limit: z.coerce.number().int().min(1).max(100).default(30) });

/** The local reading list a visitor built before signing in, merged on first sign-in. */
export const syncBookmarksSchema = z.object({ slugs: z.array(slugSchema).max(200) });

export const collectionBodySchema = z.object({ name: z.string().trim().min(1).max(60) });

export const followKind = z.enum(FOLLOW_KINDS);

export const brokenLinkSchema = z.object({
  path: z.string().trim().min(1).max(300).startsWith("/"),
  referrer: z.string().trim().max(300).optional(),
});

export type ListQuery = z.infer<typeof listQuery>;
