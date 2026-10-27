/*
 * Browser → API transport. Calls go to /api/v1/* on the site's own origin
 * (next.config.ts proxies them), so the httpOnly session cookies travel with
 * every request and never reach JavaScript.
 *
 * Success bodies are `{ data, page? }`; failures are `{ error: { code, message, details? } }`
 * and surface as ApiError. A 401 triggers one silent refresh-and-retry, because the
 * access token lives only 15 minutes.
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type ApiResult<T, P = undefined> = { data: T; page: P };

type Init = { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown };

async function send(path: string, init: Init): Promise<Response> {
  try {
    return await fetch(`/api/v1${path}`, {
      method: init.method ?? "GET",
      credentials: "same-origin",
      headers: init.body === undefined ? undefined : { "content-type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError(0, "NETWORK", "The server cannot be reached");
  }
}

async function parse<T, P>(res: Response): Promise<ApiResult<T, P>> {
  if (res.status === 204) return { data: undefined as T, page: undefined as P };
  const json = (await res.json().catch(() => null)) as {
    data?: T;
    page?: P;
    error?: { code: string; message: string; details?: unknown };
  } | null;
  if (!res.ok || !json || json.error) {
    throw new ApiError(res.status, json?.error?.code ?? "HTTP_ERROR", json?.error?.message ?? res.statusText, json?.error?.details);
  }
  return { data: json.data as T, page: json.page as P };
}

/** GET returning the whole JSON body, for responses whose `page` is more than a cursor (search). */
export async function rawGet<B>(path: string): Promise<B> {
  const res = await send(path, {});
  const json = (await res.json().catch(() => null)) as (B & { error?: { code: string; message: string; details?: unknown } }) | null;
  if (!res.ok || !json || json.error) {
    throw new ApiError(res.status, json?.error?.code ?? "HTTP_ERROR", json?.error?.message ?? res.statusText, json?.error?.details);
  }
  return json;
}

export async function api<T, P = undefined>(path: string, init: Init = {}): Promise<ApiResult<T, P>> {
  let res = await send(path, init);
  // the sign-in, sign-up and reset calls answer 401 for a reason of their own; the account's (`/auth/me…`) ones just need a fresh access token
  if (res.status === 401 && (!path.startsWith("/auth/") || path.startsWith("/auth/me"))) {
    const refreshed = await send("/auth/refresh", { method: "POST" });
    if (refreshed.ok) res = await send(path, init);
  }
  return parse<T, P>(res);
}
