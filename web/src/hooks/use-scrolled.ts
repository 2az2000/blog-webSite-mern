"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

/*
 * One flag per (threshold, release) pair, shared by every caller.
 *
 * It has hysteresis on purpose. The compact header is shorter than the full one,
 * so switching to it shifts the page up; the browser's scroll anchoring then
 * lowers scrollY by the same amount. With a single threshold that moves scrollY
 * back across it, the header grows again, and the two states flip-flop until
 * React gives up ("Maximum update depth exceeded"). Entering at `threshold` and
 * leaving only at `release` (default: the very top) cannot oscillate.
 */
const state = new Map<string, boolean>();

/** True once the page has scrolled past `threshold` px; false again only at `release` px or less. */
export function useScrolled(threshold = 0, release = 0): boolean {
  const key = `${threshold}:${release}`;
  return useSyncExternalStore(
    subscribe,
    () => {
      const y = window.scrollY;
      const was = state.get(key) ?? false;
      const next = was ? y > release : y > threshold;
      state.set(key, next);
      return next;
    },
    () => false,
  );
}
