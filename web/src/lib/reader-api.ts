import { api, rawGet } from "@/lib/api";
import { toSearchData, type ApiSearchBody, type SearchData, type SearchSort } from "@/lib/search";
import type { PageInfo } from "@/types/admin";

/* What a reader does, one function per endpoint (backend/src/modules/engagement and comments). */

export const bookmarks = {
  list: () => api<{ slug: string }[], PageInfo>("/me/bookmarks?limit=100").then((r) => r.data.map((a) => a.slug)),
  save: (slug: string) => api<unknown>(`/me/bookmarks/${encodeURIComponent(slug)}`, { method: "PUT" }),
  remove: (slug: string) => api<unknown>(`/me/bookmarks/${encodeURIComponent(slug)}`, { method: "DELETE" }),
  /** Merges a browser's local list into the account; returns how many were new. */
  sync: (slugs: string[]) => api<{ added: number }>("/me/bookmarks/sync", { method: "POST", body: { slugs } }).then((r) => r.data),
};

export const articleLikes = {
  /** Whether the signed-in reader has liked it. */
  mine: (slug: string) =>
    api<{ viewer: { liked: boolean } | null }>(`/articles/${encodeURIComponent(slug)}/engagement`).then((r) => r.data.viewer?.liked ?? false),
  like: (slug: string) => api<unknown>(`/articles/${encodeURIComponent(slug)}/like`, { method: "PUT" }),
  unlike: (slug: string) => api<unknown>(`/articles/${encodeURIComponent(slug)}/like`, { method: "DELETE" }),
};

export type Follows = { authors: { slug: string; name: string }[]; topics: { slug: string; name: string }[] };

export const follows = {
  list: () => api<Follows>("/me/follows").then((r) => r.data),
  follow: (kind: "author" | "topic", slug: string) =>
    api<{ following: boolean; followers: number }>(`/me/follows/${kind}/${encodeURIComponent(slug)}`, { method: "PUT" }).then((r) => r.data),
  unfollow: (kind: "author" | "topic", slug: string) =>
    api<{ following: boolean; followers: number }>(`/me/follows/${kind}/${encodeURIComponent(slug)}`, { method: "DELETE" }).then((r) => r.data),
};

export type CommentView = {
  id: string;
  parent: string | null;
  author: { name: string; initials: string; badge?: "Author" } | null;
  createdAt: string;
  edited: boolean;
  likes: number;
  liked: boolean;
  mine: boolean;
  pending: boolean;
  body: string;
  removed: { by: "moderator" | "author"; reason: string } | null;
  canEdit: boolean;
  replies: CommentView[];
};

export type CommentSort = "new" | "old" | "top";
export type CommentPage = PageInfo & { count: number };

export const comments = {
  list: (slug: string, sort: CommentSort, page: number) =>
    api<CommentView[], CommentPage>(`/articles/${encodeURIComponent(slug)}/comments?sort=${sort}&page=${page}&limit=20`),
  post: (slug: string, body: string, parent?: string) =>
    api<CommentView>(`/articles/${encodeURIComponent(slug)}/comments`, { method: "POST", body: { body, ...(parent ? { parent } : {}) } }).then((r) => r.data),
  edit: (id: string, body: string) => api<CommentView>(`/comments/${id}`, { method: "PATCH", body: { body } }).then((r) => r.data),
  remove: (id: string) => api<unknown>(`/comments/${id}`, { method: "DELETE" }),
  like: (id: string) => api<{ liked: boolean; likes: number }>(`/comments/${id}/like`, { method: "PUT" }).then((r) => r.data),
  unlike: (id: string) => api<{ liked: boolean; likes: number }>(`/comments/${id}/like`, { method: "DELETE" }).then((r) => r.data),
  report: (id: string, reason: "spam" | "abuse" | "off-topic" | "other") =>
    api<unknown>(`/comments/${id}/report`, { method: "POST", body: { reason } }),
};

export type DispatchPrefs = {
  email: string;
  status: "pending" | "confirmed" | "unsubscribed";
  frequency: "both" | "weekly" | "monthly";
  topics: string[];
};

/** The NOVA Dispatch. Every call is made by a visitor with no account; the e-mail links carry the keys. */
export const newsletter = {
  subscribe: (email: string, topics: string[], frequency: DispatchPrefs["frequency"], source: string) =>
    api<{ ok: true }>("/newsletter/subscribe", { method: "POST", body: { email, topics, frequency, source } }),
  confirm: (token: string) =>
    api<DispatchPrefs & { manageToken: string }>("/newsletter/confirm", { method: "POST", body: { token } }).then((r) => r.data),
  prefs: (token: string) => api<DispatchPrefs>("/newsletter/manage", { method: "POST", body: { token } }).then((r) => r.data),
  update: (token: string, patch: { topics?: string[]; frequency?: DispatchPrefs["frequency"] }) =>
    api<DispatchPrefs>("/newsletter/manage", { method: "PATCH", body: { token, ...patch } }).then((r) => r.data),
  unsubscribe: (token: string) => api<DispatchPrefs>("/newsletter/unsubscribe", { method: "POST", body: { token } }).then((r) => r.data),
  resubscribe: (token: string) => api<DispatchPrefs>("/newsletter/resubscribe", { method: "POST", body: { token } }).then((r) => r.data),
};

export const search = {
  run: async (q: string, sort: SearchSort, page: number): Promise<SearchData> =>
    toSearchData(await rawGet<ApiSearchBody>(`/search?q=${encodeURIComponent(q)}&sort=${sort}&page=${page}`)),
  /** What other readers search for and find — the "try one of these" suggestions. */
  popular: () => api<string[]>("/search/popular?limit=7").then((r) => r.data),
};

/** Counts a view / a finished read. Failures are ignored: reading never waits on, or breaks over, a counter. */
export const track = {
  view: (slug: string) => void api(`/articles/${encodeURIComponent(slug)}/view`, { method: "POST" }).catch(() => undefined),
  read: (slug: string) => void api(`/articles/${encodeURIComponent(slug)}/read`, { method: "POST" }).catch(() => undefined),
};

export const reportBrokenLink = (path: string, referrer?: string) =>
  api<unknown>("/reports/broken-link", { method: "POST", body: { path, ...(referrer ? { referrer } : {}) } });
