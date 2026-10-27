import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decideRate } from "../../src/services/rate-limit/store.js";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("rate-limit memory store", () => {
  it("allows up to the limit, then blocks within the same window", async () => {
    const t0 = Date.now(); // anchored by fake timers
    const windowMs = 60_000;

    const calls = [] as boolean[];
    for (let i = 0; i < 5; i++) {
      const d = await decideRate({ key: "login:1.2.3.4", windowMs, limit: 3 });
      calls.push(d.allowed);
    }
    expect(calls).toEqual([true, true, true, false, false]);

    const last = await decideRate({ key: "login:1.2.3.4", windowMs, limit: 3 });
    void t0;
    expect(last.allowed).toBe(false);
    expect(last.remaining).toBe(0);
  });

  it("starts a fresh window when the previous one expires", async () => {
    const windowMs = 60_000;
    expect((await decideRate({ key: "register:9.9.9.9", windowMs, limit: 1 })).allowed).toBe(true);
    expect((await decideRate({ key: "register:9.9.9.9", windowMs, limit: 1 })).allowed).toBe(false);

    vi.advanceTimersByTime(windowMs + 1);
    expect((await decideRate({ key: "register:9.9.9.9", windowMs, limit: 1 })).allowed).toBe(true);
  });

  it("keys are independent per bucket+ip", async () => {
    expect((await decideRate({ key: "forgot:a", windowMs: 1000, limit: 1 })).allowed).toBe(true);
    expect((await decideRate({ key: "forgot:b", windowMs: 1000, limit: 1 })).allowed).toBe(true);
    expect((await decideRate({ key: "reset:a", windowMs: 1000, limit: 1 })).allowed).toBe(true);
  });
});
