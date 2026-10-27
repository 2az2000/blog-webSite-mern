/**
 * Fixed-window rate limiting with a pluggable store:
 *
 *  - MemoryStore: process-local counters. Correct for the plain-Node entry
 *    (B) and for tests; on serverless (A) counters die between invocations,
 *    so it is only a graceful fallback there.
 *  - UpstashStore: single build-time-free REST call chain (INCR + EXPIRE NX)
 *    against Upstash Redis — the documented production path for entry A.
 *
 * Upstash is selected automatically when both env vars are set; unknown
 * states fail open (a broken limiter must not bring the site down) and log.
 */
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** epoch ms when the current window resets */
  resetAt: number;
}

interface Store {
  /** Returns hit count within the window (1-based). */
  hit(key: string, windowMs: number, limit: number): Promise<RateLimitDecision>;
}

/* — Memory store (dev, tests, fallback) ————————————————— */

class MemoryStore implements Store {
  private windows = new Map<string, { start: number; count: number }>();

  async hit(key: string, windowMs: number, limit: number): Promise<RateLimitDecision> {
    const now = Date.now();
    const entry = this.windows.get(key);

    if (!entry || now - entry.start >= windowMs) {
      this.windows.set(key, { start: now, count: 1 });
      this.sweep(now, windowMs);
      return decision(limit, limit - 1, now + windowMs, true);
    }

    entry.count += 1;
    const resetAt = entry.start + windowMs;
    return decision(limit, limit - entry.count, resetAt, entry.count <= limit);
  }

  private sweep(now: number, windowMs: number): void {
    if (this.windows.size < 5_000) return;
    for (const [key, entry] of this.windows) {
      if (now - entry.start >= windowMs) this.windows.delete(key);
    }
  }
}

function decision(limit: number, remaining: number, resetAt: number, allowed: boolean): RateLimitDecision {
  return { allowed, limit, remaining: Math.max(remaining, 0), resetAt };
}

/* — Upstash REST store ————————————————————————————————— */

class UpstashStore implements Store {
  constructor(private readonly base: string, private readonly token: string) {}

  async hit(key: string, windowMs: number, limit: number): Promise<RateLimitDecision> {
    const now = Date.now();
    const windowId = Math.floor(now / windowMs);
    const windowKey = `rl:${key}:${windowId}`;
    const ttlSeconds = Math.ceil(windowMs / 1000);

    try {
      const res = await fetch(`${this.base}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
        body: JSON.stringify([
          ["INCR", windowKey],
          ["EXPIRE", windowKey, String(ttlSeconds), "NX"],
          ["PEXPIREAT", windowKey, String(windowId * windowMs + windowMs)],
        ]),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { result?: unknown }[];
      const incr = json[0];
      const hits = Number(incr?.result ?? 1);
      return decision(limit, limit - hits, (windowId + 1) * windowMs, hits <= limit);
    } catch (err) {
      logger.error({ err: String(err) }, "rate-limit store error");
      return decision(limit, 0, now + windowMs, true); // fail open
    }
  }
}

/* — Selection ———————————————————————————————————————— */

let store: Store | null = null;

function currentStore(): Store {
  store ??=
    env.upstashUrl && env.upstashToken
      ? new UpstashStore(env.upstashUrl.replace(/\/+$/, ""), env.upstashToken)
      : new MemoryStore();
  return store;
}

export function rateLimitStoreName(): "upstash" | "memory" {
  return currentStore() instanceof UpstashStore ? "upstash" : "memory";
}

export async function decideRate(input: { key: string; windowMs: number; limit: number }): Promise<RateLimitDecision> {
  return currentStore().hit(input.key, input.windowMs, input.limit);
}
