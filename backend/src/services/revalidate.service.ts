/**
 * Tells the Next.js site that content changed, so its cached pages refresh
 * (`revalidateTag` on the other side). Never throws and waits at most 3 s: a
 * slow or down site must not fail a publish — its pages then simply refresh on
 * their normal schedule. Awaited (not detached) because a serverless function
 * may be frozen the moment the response is sent.
 */
import { env } from "../config/env.js";

const TIMEOUT_MS = 3000;

export interface ArticleRef {
  slug: string;
  section: string;
  author: string;
}

export const articleTags = (a: ArticleRef): string[] => ["articles", `article:${a.slug}`, `section:${a.section}`, `author:${a.author}`];

export async function revalidate(tags: string[]): Promise<void> {
  if (!env.revalidateSecret || tags.length === 0) return;
  await fetch(`${env.webAppUrl.replace(/\/$/, "")}/api/revalidate`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-revalidate-secret": env.revalidateSecret },
    body: JSON.stringify({ tags: [...new Set(tags)] }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch(() => undefined);
}
