/** Request contracts of the Dispatch (newsletter) API. */
import { z } from "zod";
import { FREQUENCIES, ISSUE_KINDS, SUBSCRIBER_STATUSES } from "../../models/newsletter.model.js";
import { emailSchema } from "../auth/auth.schemas.js";
import { slugSchema } from "../content/content.schemas.js";

/** A section slug, or `longreads`. */
const topicKey = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(40);
const token = z.string().min(10).max(300);

export const subscribeSchema = z.object({
  email: emailSchema,
  topics: z.array(topicKey).max(12).default([]),
  frequency: z.enum(FREQUENCIES).default("both"),
  source: z.string().regex(/^[a-z0-9-]+$/).max(40).default("unknown"),
});

export const mySubscriptionSchema = z.object({
  subscribed: z.boolean(),
  topics: z.array(topicKey).max(12).optional(),
  frequency: z.enum(FREQUENCIES).optional(),
});

export const tokenSchema = z.object({ token });

export const updatePreferencesSchema = z
  .object({ token, topics: z.array(topicKey).max(12).optional(), frequency: z.enum(FREQUENCIES).optional() })
  .refine((v) => v.topics !== undefined || v.frequency !== undefined, { message: "Nothing to update" });

/* — Admin — */

export const MAX_ISSUE_STORIES = 8;

export const issueInputSchema = z.object({
  kind: z.enum(ISSUE_KINDS),
  subject: z.string().trim().min(1).max(140),
  note: z.string().trim().max(3000).default(""),
  articles: z.array(slugSchema).max(MAX_ISSUE_STORIES).default([]),
});

export const issuePatchSchema = issueInputSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

export const scheduleSchema = z.object({ at: z.coerce.date() });

const page = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

export const subscribersQuery = z.object({
  status: z.enum(SUBSCRIBER_STATUSES).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  ...page,
});

export const issuesQuery = z.object(page);

export type SubscribeInput = z.infer<typeof subscribeSchema>;
export type IssueInput = z.infer<typeof issueInputSchema>;
