import { api } from "@/lib/api";
import type {
  AccountRow,
  AdminArticle,
  BrokenLinkRow,
  AdminRow,
  ArticleStatus,
  Choice,
  CommentQueue,
  HomePlacementState,
  IssueKind,
  IssueRow,
  PageInfo,
  Overview,
  PermissionMatrix,
  Pinned,
  QueueComment,
  Revision,
  Role,
  SignedUpload,
  StatsWindow,
  SubscriberRow,
  SubscriberStatus,
} from "@/types/admin";

/* One function per back-office endpoint the screens use. */

export { auth } from "@/lib/auth-api";

export type ListQuery = { status?: ArticleStatus; q?: string; page: number; limit?: number };

const qs = (params: Record<string, string | number | undefined>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") s.set(k, String(v));
  const out = s.toString();
  return out ? `?${out}` : "";
};

export const articles = {
  list: (q: ListQuery) => api<AdminRow[], PageInfo>(`/admin/articles${qs(q)}`),
  get: (id: string) => api<AdminArticle>(`/admin/articles/${id}`).then((r) => r.data),
  create: (body: { kind: string; section: string; title: string; slug?: string; author?: string }) =>
    api<AdminArticle>("/admin/articles", { method: "POST", body }).then((r) => r.data),
  update: (id: string, body: Record<string, unknown>) =>
    api<AdminArticle>(`/admin/articles/${id}`, { method: "PATCH", body }).then((r) => r.data),
  setStatus: (id: string, status: ArticleStatus, scheduledFor?: string) =>
    api<AdminArticle>(`/admin/articles/${id}/status`, { method: "POST", body: { status, scheduledFor } }).then((r) => r.data),
  remove: (id: string) => api<void>(`/admin/articles/${id}`, { method: "DELETE" }),
  revisions: (id: string) => api<Revision[]>(`/admin/articles/${id}/revisions`).then((r) => r.data),
  restore: (id: string, version: number) =>
    api<AdminArticle>(`/admin/articles/${id}/revisions/${version}/restore`, { method: "POST" }).then((r) => r.data),
};

export type AuthorChoice = Choice & { initials: string; role: string; since: number; bio: string; portrait?: string };

/** Desks and bylines for the pickers — the public directory endpoints. */
export const directory = {
  sections: () => api<Choice[]>("/sections").then((r) => r.data.filter((s) => s.slug !== "latest")),
  authors: () => api<AuthorChoice[]>("/authors").then((r) => r.data),
};

export type UploadedImage = { url: string; width: number; height: number; publicId: string };

/** What the media host will take. The API signs the same list into the request, so the host refuses anything else too. */
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"] as const;
export const MAX_IMAGE_MB = 10;

export class ImageRejected extends Error {
  constructor(readonly reason: "type" | "size") {
    super(reason);
  }
}

/**
 * Direct browser → Cloudinary upload with parameters the API signed, so the
 * file never passes through the API. Records the image in the library with
 * the alt text and credit known at that moment.
 */
export async function uploadImage(file: File, meta: { alt: string; credit: string; decorative?: boolean }): Promise<UploadedImage> {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) throw new ImageRejected("type");
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) throw new ImageRejected("size");
  const sig = (await api<SignedUpload>("/admin/media/sign", { method: "POST" })).data;
  const form = new FormData();
  form.set("file", file);
  form.set("api_key", sig.apiKey);
  form.set("timestamp", String(sig.timestamp));
  form.set("folder", sig.folder);
  form.set("allowed_formats", sig.allowedFormats);
  form.set("signature", sig.signature);
  const res = await fetch(sig.uploadUrl, { method: "POST", body: form });
  if (!res.ok) throw new Error("upload failed");
  const out = (await res.json()) as { secure_url: string; width: number; height: number; public_id: string };
  const image = { url: out.secure_url, width: out.width, height: out.height, publicId: out.public_id };
  // the library keeps every picture with its description; a failure here must not lose the upload itself
  await api("/admin/media", {
    method: "POST",
    body: { ...image, alt: meta.decorative ? "" : meta.alt, decorative: Boolean(meta.decorative), credit: meta.credit },
  }).catch(() => undefined);
  return image;
}

export const moderation = {
  list: (queue: CommentQueue, page: number) => api<QueueComment[], PageInfo>(`/admin/comments?queue=${queue}&page=${page}&limit=20`),
  approve: (id: string) => api<void>(`/admin/comments/${id}/approve`, { method: "POST" }),
  remove: (id: string, reason: string) => api<void>(`/admin/comments/${id}/remove`, { method: "POST", body: { reason } }),
};

export const overview = {
  get: (days: StatsWindow) => api<Overview>(`/admin/stats?days=${days}`).then((r) => r.data),
};

export const reports = {
  list: (resolved: boolean, page: number) => api<BrokenLinkRow[], PageInfo>(`/admin/reports${qs({ resolved: String(resolved), page, limit: 20 })}`),
  resolve: (id: string) => api<void>(`/admin/reports/${id}/resolve`, { method: "POST" }),
};

export const permissions = {
  get: () => api<PermissionMatrix>("/admin/permissions").then((r) => r.data),
};

export const accounts = {
  list: (q: string, page: number) => api<AccountRow[], PageInfo>(`/admin/users${qs({ q: q || undefined, page, limit: 20 })}`),
  update: (id: string, patch: { role?: Role; status?: "active" | "suspended" }) =>
    api<{ id: string; role: Role; status: "active" | "suspended" }>(`/admin/users/${id}`, { method: "PATCH", body: patch }).then((r) => r.data),
};

export const placement = {
  home: () => api<HomePlacementState>("/admin/placements/home").then((r) => r.data),
  saveHome: (pinned: Pinned) => api<HomePlacementState>("/admin/placements/home", { method: "PUT", body: pinned }).then((r) => r.data),
};

export type IssueInput = { kind: IssueKind; subject: string; note: string; articles: string[] };

export const dispatch = {
  issues: (page: number) => api<IssueRow[], PageInfo>(`/admin/newsletter/issues?page=${page}&limit=20`),
  issue: (id: string) => api<IssueRow>(`/admin/newsletter/issues/${id}`).then((r) => r.data),
  create: (body: IssueInput) => api<IssueRow>("/admin/newsletter/issues", { method: "POST", body }).then((r) => r.data),
  update: (id: string, body: Partial<IssueInput>) => api<IssueRow>(`/admin/newsletter/issues/${id}`, { method: "PATCH", body }).then((r) => r.data),
  remove: (id: string) => api<void>(`/admin/newsletter/issues/${id}`, { method: "DELETE" }),
  test: (id: string) => api<{ to: string }>(`/admin/newsletter/issues/${id}/test`, { method: "POST" }).then((r) => r.data),
  schedule: (id: string, at: string) => api<IssueRow>(`/admin/newsletter/issues/${id}/schedule`, { method: "POST", body: { at } }).then((r) => r.data),
  unschedule: (id: string) => api<IssueRow>(`/admin/newsletter/issues/${id}/unschedule`, { method: "POST" }).then((r) => r.data),
  /** Sends the next batch (the first call starts the issue). Call again while `status` is `sending`. */
  send: (id: string) => api<IssueRow>(`/admin/newsletter/issues/${id}/send`, { method: "POST" }).then((r) => r.data),
  subscribers: (q: { status?: SubscriberStatus; q?: string; page: number }) =>
    api<SubscriberRow[], PageInfo & { counts: Record<string, number> }>(`/admin/newsletter/subscribers${qs({ ...q, limit: 20 })}`),
};
