"use client";

import { create } from "zustand";

import { follows } from "@/lib/reader-api";

/** Authors and topics the signed-in reader follows. Empty while signed out. */

type Kind = "author" | "topic";

type FollowsState = {
  authors: string[];
  topics: string[];
  has: (kind: Kind, slug: string) => boolean;
  pull: () => Promise<void>;
  /** Optimistic: flips at once, undoes itself if the API refuses. Returns the new state. */
  toggle: (kind: Kind, slug: string) => Promise<boolean>;
  reset: () => void;
};

const key = (kind: Kind) => (kind === "author" ? "authors" : "topics");

export const useFollows = create<FollowsState>()((set, get) => ({
  authors: [],
  topics: [],
  has: (kind, slug) => get()[key(kind)].includes(slug),

  pull: async () => {
    try {
      const f = await follows.list();
      set({ authors: f.authors.map((a) => a.slug), topics: f.topics.map((t) => t.slug) });
    } catch {
      // keep what we have; the next sign-in or page load asks again
    }
  },

  toggle: async (kind, slug) => {
    const k = key(kind);
    const on = !get()[k].includes(slug);
    set({ [k]: on ? [...get()[k], slug] : get()[k].filter((s) => s !== slug) } as Partial<FollowsState>);
    try {
      await (on ? follows.follow(kind, slug) : follows.unfollow(kind, slug));
      return on;
    } catch (err) {
      set({ [k]: on ? get()[k].filter((s) => s !== slug) : [...get()[k], slug] } as Partial<FollowsState>);
      throw err;
    }
  },

  reset: () => set({ authors: [], topics: [] }),
}));
