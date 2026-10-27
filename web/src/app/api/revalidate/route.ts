import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";

/*
 * The back office pings this when content changes (backend/src/services/revalidate.service.ts),
 * so cached pages tagged `articles`, `article:<slug>`, `section:<slug>`, `author:<slug>`,
 * `topic:<slug>` or `sections` refresh at once instead of on their normal schedule.
 * Closed unless REVALIDATE_SECRET is set (the same value the API holds).
 */

const secret = process.env.REVALIDATE_SECRET;

const authorised = (given: string | null): boolean => {
  if (!secret || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
};

export async function POST(request: Request) {
  if (!authorised(request.headers.get("x-revalidate-secret"))) {
    return Response.json({ error: "forbidden" }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { tags?: unknown } | null;
  const tags = Array.isArray(body?.tags) ? body.tags.filter((t): t is string => typeof t === "string" && t.length < 100).slice(0, 50) : [];
  for (const tag of tags) revalidateTag(tag, "max");
  return Response.json({ revalidated: tags });
}
