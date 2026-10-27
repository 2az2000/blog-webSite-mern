import "server-only";

/*
 * Server → API transport for Server Components. The browser never sees this
 * origin: it talks to /api/* on the site itself (see lib/api.ts).
 *
 * Responses are cached by Next for a minute and tagged, so the back office's
 * revalidation webhook (/api/revalidate) can refresh exactly what changed:
 * `articles`, `article:<slug>`, `section:<slug>`, `author:<slug>`, `topic:<slug>`, `sections`.
 */

const ORIGIN = (process.env.API_ORIGIN ?? "http://localhost:5000").replace(/\/$/, "");

/** Seconds a cached response may be served before the next request refreshes it in the background. */
const REVALIDATE = 60;

export class ApiUnavailableError extends Error {
  constructor(
    readonly status: number,
    path: string,
  ) {
    super(`API ${path} answered ${status}`);
    this.name = "ApiUnavailableError";
  }
}

type Envelope<T, P> = { data: T; page: P };

/**
 * GET `/api/v1<path>`. A 404 is an answer ("there is no such article") and
 * returns null; anything else that is not 2xx throws, so a broken API is a
 * failed page rather than a page that quietly says "not found".
 */
export async function apiGet<T, P = undefined>(path: string, tags: string[] = []): Promise<Envelope<T, P> | null> {
  let res: Response;
  try {
    res = await fetch(`${ORIGIN}/api/v1${path}`, { next: { revalidate: REVALIDATE, tags } });
  } catch {
    throw new ApiUnavailableError(0, path);
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new ApiUnavailableError(res.status, path);
  return (await res.json()) as Envelope<T, P>;
}

/** GET `/api/v1<path>` and return the whole JSON body (for responses whose `page` carries more than a cursor). */
export async function apiGetRaw<B>(path: string, tags: string[] = []): Promise<B> {
  let res: Response;
  try {
    res = await fetch(`${ORIGIN}/api/v1${path}`, { next: { revalidate: REVALIDATE, tags } });
  } catch {
    throw new ApiUnavailableError(0, path);
  }
  if (!res.ok) throw new ApiUnavailableError(res.status, path);
  return (await res.json()) as B;
}

/** Every page of a keyset-paginated list (`page.nextCursor`), up to `max` pages. */
export async function apiGetAll<T>(path: string, tags: string[] = [], max = 10): Promise<T[]> {
  const out: T[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < max; i += 1) {
    const sep = path.includes("?") ? "&" : "?";
    const res: Envelope<T[], { nextCursor: string | null }> | null = await apiGet<T[], { nextCursor: string | null }>(
      `${path}${sep}limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
      tags,
    );
    if (!res) break;
    out.push(...res.data);
    cursor = res.page.nextCursor;
    if (!cursor) break;
  }
  return out;
}
