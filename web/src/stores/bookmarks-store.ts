"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { bookmarks } from "@/lib/reader-api";
import { useAuth } from "@/stores/auth-store";

/*
 * Saved articles (reference: the bookmark toggle + bookmarks.html).
 *
 * The store is the instant, offline-friendly copy and is persisted per browser,
 * so a visitor with no account can still save. When someone is signed in every
 * change also goes to the API (optimistically: the UI flips first and undoes
 * itself if the API refuses), and signing in merges what the browser had into
 * the account — the account's list then wins.
 */

type BookmarksState = {
  slugs: string[];
  has: (slug: string) => boolean;
  /** Returns the new saved state. */
  toggle: (slug: string) => boolean;
  remove: (slug: string) => void;
  clear: () => void;
  /** Replaces the local copy with the account's list. */
  pull: () => Promise<void>;
  /** Sends this browser's list to the account, then takes the account's list back. */
  merge: () => Promise<void>;
};

const signedIn = () => useAuth.getState().status === "in";

export const useBookmarks = create<BookmarksState>()(
  persist(
    (set, get) => {
      /** Mirrors one change to the API; on failure puts the local copy back as it was. */
      const mirror = (slug: string, saved: boolean) => {
        if (!signedIn()) return;
        (saved ? bookmarks.save(slug) : bookmarks.remove(slug)).catch(() => {
          set((s) => ({ slugs: saved ? s.slugs.filter((x) => x !== slug) : [slug, ...s.slugs] }));
        });
      };

      return {
        slugs: [],
        has: (slug) => get().slugs.includes(slug),
        toggle: (slug) => {
          const saved = !get().slugs.includes(slug);
          set((s) => ({ slugs: saved ? [slug, ...s.slugs] : s.slugs.filter((x) => x !== slug) }));
          mirror(slug, saved);
          return saved;
        },
        remove: (slug) => {
          set((s) => ({ slugs: s.slugs.filter((x) => x !== slug) }));
          mirror(slug, false);
        },
        clear: () => set({ slugs: [] }),

        pull: async () => {
          try {
            set({ slugs: await bookmarks.list() });
          } catch {
            // keep the local copy
          }
        },
        merge: async () => {
          try {
            if (get().slugs.length > 0) await bookmarks.sync(get().slugs);
            set({ slugs: await bookmarks.list() });
          } catch {
            // keep the local copy; the next sign-in tries again
          }
        },
      };
    },
    {
      name: "nova:bookmarks",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ slugs: s.slugs }),
      // Read storage after hydration so server HTML and first client render match.
      skipHydration: true,
    },
  ),
);
