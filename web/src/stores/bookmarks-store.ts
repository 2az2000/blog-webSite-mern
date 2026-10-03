"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/*
 * Saved articles (reference: the bookmark toggle + bookmarks.html).
 * Persisted per browser; when accounts exist, sync this list to the API and
 * keep the store as the optimistic client cache.
 */
/** First-visit contents — the sample list from blog-refrence/bookmarks.html. */
const SEED = ["grid-rebuild", "open-source-money", "human-brain", "type-revival", "attention-economy"];

type BookmarksState = {
  slugs: string[];
  has: (slug: string) => boolean;
  /** Returns the new saved state. */
  toggle: (slug: string) => boolean;
  remove: (slug: string) => void;
  clear: () => void;
};

export const useBookmarks = create<BookmarksState>()(
  persist(
    (set, get) => ({
      slugs: SEED,
      has: (slug) => get().slugs.includes(slug),
      toggle: (slug) => {
        const saved = !get().slugs.includes(slug);
        set((s) => ({ slugs: saved ? [slug, ...s.slugs] : s.slugs.filter((x) => x !== slug) }));
        return saved;
      },
      remove: (slug) => set((s) => ({ slugs: s.slugs.filter((x) => x !== slug) })),
      clear: () => set({ slugs: [] }),
    }),
    {
      name: "nova:bookmarks",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ slugs: s.slugs }),
      // Read storage after hydration so server HTML and first client render match.
      skipHydration: true,
    },
  ),
);
