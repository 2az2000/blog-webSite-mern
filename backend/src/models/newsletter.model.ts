import mongoose, { Schema, model, type Types } from "mongoose";

/* — Subscribers ————————————————————————————————————————— */

export const SUBSCRIBER_STATUSES = ["pending", "confirmed", "unsubscribed"] as const;
export type SubscriberStatus = (typeof SUBSCRIBER_STATUSES)[number];

/** How often a subscriber wants the Dispatch (see `issueReaches` in newsletter-rules). */
export const FREQUENCIES = ["both", "weekly", "monthly"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

/**
 * Someone who asked for the NOVA Dispatch. Nothing is sent until they confirm
 * from their own inbox (double opt-in); `consentAt` records when they asked.
 * Not tied to an account: a reader needs no login to subscribe or leave.
 */
export interface SubscriberShape {
  email: string;
  status: SubscriberStatus;
  frequency: Frequency;
  /** Section slugs, or `longreads`. Empty = everything. */
  topics: string[];
  /** Where the form was: `newsletter-page`, `band`, `footer` … */
  source: string;
  consentAt: Date;
  /** The policy text in force when they asked (config/legal.ts). */
  consentVersion?: string;
  confirmTokenHash?: string;
  confirmSentAt?: Date;
  confirmedAt?: Date;
  unsubscribedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const subscriberSchema = new Schema<SubscriberShape>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxLength: 254 },
    status: { type: String, enum: SUBSCRIBER_STATUSES, default: "pending", index: true },
    frequency: { type: String, enum: FREQUENCIES, default: "both" },
    topics: { type: [String], default: [] },
    source: { type: String, default: "unknown", maxLength: 40 },
    consentAt: { type: Date, required: true },
    consentVersion: { type: String, maxLength: 20 },
    confirmTokenHash: { type: String, select: false },
    confirmSentAt: { type: Date },
    confirmedAt: { type: Date },
    unsubscribedAt: { type: Date },
  },
  { timestamps: true },
);

subscriberSchema.index({ status: 1, frequency: 1, _id: 1 });

export const SubscriberModel: mongoose.Model<SubscriberShape> =
  (mongoose.models.Subscriber as mongoose.Model<SubscriberShape> | undefined) ??
  model<SubscriberShape>("Subscriber", subscriberSchema, "newsletter_subscribers");

/* — Issues ——————————————————————————————————————————————— */

export const ISSUE_KINDS = ["tuesday", "friday", "monthly"] as const;
export type IssueKind = (typeof ISSUE_KINDS)[number];

export const ISSUE_STATUSES = ["draft", "scheduled", "sending", "sent"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

/** One edition of the Dispatch: an editor's note and a handful of stories. */
export interface IssueShape {
  kind: IssueKind;
  subject: string;
  /** The editor's note, plain text; blank lines separate paragraphs. */
  note: string;
  /** Article slugs, in the order they appear. */
  articles: string[];
  status: IssueStatus;
  scheduledFor?: Date;
  startedAt?: Date;
  sentAt?: Date;
  /** Subscribers handled so far, in `_id` order: the sender resumes after this one. */
  cursor?: Types.ObjectId;
  sent: number;
  failed: number;
  /** Confirmed subscribers this issue did not suit (frequency or topics). */
  skipped: number;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const issueSchema = new Schema<IssueShape>(
  {
    kind: { type: String, enum: ISSUE_KINDS, required: true },
    subject: { type: String, required: true, trim: true, maxLength: 140 },
    note: { type: String, default: "", maxLength: 3000 },
    articles: { type: [String], default: [] },
    status: { type: String, enum: ISSUE_STATUSES, default: "draft" },
    scheduledFor: { type: Date },
    startedAt: { type: Date },
    sentAt: { type: Date },
    cursor: { type: Schema.Types.ObjectId },
    sent: { type: Number, default: 0, min: 0 },
    failed: { type: Number, default: 0, min: 0 },
    skipped: { type: Number, default: 0, min: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

issueSchema.index({ status: 1, scheduledFor: 1 });
issueSchema.index({ status: 1, sentAt: -1 });

export const IssueModel: mongoose.Model<IssueShape> =
  (mongoose.models.NewsletterIssue as mongoose.Model<IssueShape> | undefined) ??
  model<IssueShape>("NewsletterIssue", issueSchema, "newsletter_issues");

/** One issue to one subscriber. The unique pair is what stops anyone getting an issue twice. */
export interface DeliveryShape {
  issue: Types.ObjectId;
  subscriber: Types.ObjectId;
  status: "sent" | "failed";
  error?: string;
  at: Date;
}

const deliverySchema = new Schema<DeliveryShape>({
  issue: { type: Schema.Types.ObjectId, ref: "NewsletterIssue", required: true },
  subscriber: { type: Schema.Types.ObjectId, ref: "Subscriber", required: true },
  status: { type: String, enum: ["sent", "failed"], required: true },
  error: { type: String, maxLength: 300 },
  at: { type: Date, required: true },
});

deliverySchema.index({ issue: 1, subscriber: 1 }, { unique: true });

export const DeliveryModel: mongoose.Model<DeliveryShape> =
  (mongoose.models.NewsletterDelivery as mongoose.Model<DeliveryShape> | undefined) ??
  model<DeliveryShape>("NewsletterDelivery", deliverySchema, "newsletter_deliveries");
