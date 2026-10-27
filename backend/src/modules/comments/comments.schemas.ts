/** Request contracts of the comments API. */
import { z } from "zod";
import { REPORT_REASONS } from "../../models/comment.model.js";

const objectId = z.string().regex(/^[a-f0-9]{24}$/, "Not a valid id");
const page = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
};

/** The raw text is normalised (trimmed, control characters dropped) before its length is judged. */
const rawBody = z.string().max(6000);

export const createCommentSchema = z.object({ body: rawBody, parent: objectId.optional() });
export const editCommentSchema = z.object({ body: rawBody });

export const SORTS = ["new", "old", "top"] as const;
export const listCommentsQuery = z.object({ sort: z.enum(SORTS).default("new"), ...page });

export const reportCommentSchema = z.object({
  reason: z.enum(REPORT_REASONS),
  note: z.string().trim().max(300).optional(),
});

export const QUEUES = ["pending", "held", "reported", "removed", "published"] as const;
export const queueQuery = z.object({ queue: z.enum(QUEUES).default("pending"), ...page });

export const removeCommentSchema = z.object({ reason: z.string().trim().min(1).max(200) });

export type ListCommentsQuery = z.infer<typeof listCommentsQuery>;
export type QueueQuery = z.infer<typeof queueQuery>;
