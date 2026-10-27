import type { ArticleKind, BodyBlock, Trend } from "@/types/content";

/* Shapes of the back-office API (backend/src/modules/admin). */

export type Role = "reader" | "writer" | "editor" | "admin";

export type Me = { id: string; name: string; email: string; role: Role };

export const STAFF: readonly Role[] = ["writer", "editor", "admin"];
export const EDITORIAL: readonly Role[] = ["editor", "admin"];

export type ArticleStatus = "draft" | "scheduled" | "published" | "archived";
export const ARTICLE_STATUSES: readonly ArticleStatus[] = ["draft", "scheduled", "published", "archived"];

export type AdminRow = {
  id: string;
  slug: string;
  title: string;
  kind: ArticleKind;
  section: string;
  author: string;
  status: ArticleStatus;
  publishedAt: string | null;
  createdBy: string | null;
  version: number;
  updatedAt: string;
};

/** The article as the editor loads it. `detail` is the page-level copy; its shape depends on `kind`. */
export type AdminArticle = AdminRow & {
  standfirst: string;
  mins: number;
  image: string;
  tags: string[];
  views: number;
  comments: number;
  trend: Trend;
  detail: Record<string, unknown>;
  body: BodyBlock[];
  createdAt: string;
};

export type Revision = { version: number; editedBy: string | null; createdAt: string };

export type PageInfo = { total: number; page: number; limit: number };

export type Choice = { slug: string; name: string };

export type SignedUpload = { uploadUrl: string; apiKey: string; timestamp: number; folder: string; allowedFormats: string; signature: string };

export type CommentQueue = "pending" | "held" | "reported" | "removed" | "published";
export const COMMENT_QUEUES: readonly CommentQueue[] = ["pending", "held", "reported", "removed", "published"];

/** One comment as a moderator sees it. */
export type QueueComment = {
  id: string;
  article: string;
  parent: string | null;
  status: "published" | "held" | "removed";
  heldFor: string | null;
  body: string;
  user: { id: string; name: string; email: string } | null;
  reportCount: number;
  reports: { reason: string; note?: string }[];
  removed: { by: string; reason: string } | null;
  createdAt: string;
};

export type AccountRow = { id: string; name: string; email: string; role: Role; status: "active" | "suspended"; emailVerified: boolean; createdAt: string };

export const HOME_SLOTS = ["lead", "secondary", "brief", "picks", "opinion", "longread"] as const;
export type HomeSlot = (typeof HOME_SLOTS)[number];
export type Pinned = Record<HomeSlot, string[]>;

export type HomePlacementState = {
  limits: Record<HomeSlot, number>;
  pinned: Pinned;
  live: Record<HomeSlot, { slug: string; title: string; kind: string; pinned: boolean }[]>;
};

export type IssueKind = "tuesday" | "friday" | "monthly";
export const ISSUE_KINDS: readonly IssueKind[] = ["tuesday", "friday", "monthly"];
export type IssueStatus = "draft" | "scheduled" | "sending" | "sent";

export type IssueRow = {
  id: string;
  kind: IssueKind;
  subject: string;
  note: string;
  articles: string[];
  status: IssueStatus;
  scheduledFor: string | null;
  startedAt: string | null;
  sentAt: string | null;
  sent: number;
  failed: number;
  skipped: number;
  updatedAt: string;
};

export type SubscriberStatus = "pending" | "confirmed" | "unsubscribed";
export const SUBSCRIBER_STATUSES: readonly SubscriberStatus[] = ["pending", "confirmed", "unsubscribed"];

export type SubscriberRow = {
  id: string;
  email: string;
  status: SubscriberStatus;
  frequency: "both" | "weekly" | "monthly";
  topics: string[];
  source: string;
  createdAt: string;
  confirmedAt: string | null;
};

/* — Overview, reports, permission table (backend/src/modules/admin/stats.service.ts, http/permissions.ts) — */

export type StatsWindow = 7 | 14 | 30;
export const STATS_WINDOWS: readonly StatsWindow[] = [7, 14, 30];

export type TopStory = { slug: string; title: string; section: string; views: number; reads: number };
export type AllTimeStory = TopStory & { comments: number; likes: number };

export type Overview = {
  /** `own`: a writer sees only their stories; `newsroom`: editors and admins see everything. */
  scope: "own" | "newsroom";
  days: StatsWindow;
  traffic: {
    series: { day: string; views: number; reads: number }[];
    views: number;
    reads: number;
    previousViews: number;
    previousReads: number;
  };
  top: TopStory[];
  topAllTime: AllTimeStory[];
  articles: Partial<Record<ArticleStatus, number>>;
  queues?: { commentsHeld: number; commentsReported: number; brokenLinks: number };
  subscribers?: Partial<Record<SubscriberStatus, number>>;
  users?: Partial<Record<Role, number>>;
  newUsers?: number;
};

export type BrokenLinkRow = {
  id: string;
  path: string;
  referrer?: string;
  count: number;
  resolved: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type PermissionGroup = "access" | "stories" | "readers" | "administration";
export type PermissionMatrix = {
  roles: { role: Role; permissions: string[] }[];
  permissions: { key: string; group: PermissionGroup; note: string; roles: Role[] }[];
};

/* — Account settings (backend/src/modules/auth) — */

export type Device = { id: string; current: boolean; device: string; signedInAt: string; lastActiveAt: string };
