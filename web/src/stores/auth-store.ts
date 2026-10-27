"use client";

import { create } from "zustand";

import { auth } from "@/lib/auth-api";
import { useBookmarks } from "@/stores/bookmarks-store";
import { useFollows } from "@/stores/follows-store";
import type { Me } from "@/types/admin";

/*
 * Who is signed in. The session itself is an httpOnly cookie the browser holds;
 * this store only mirrors what `/auth/me` said so the UI can show it.
 *
 *   unknown — before the first `/auth/me` answer (render as signed out, no flash of "sign in" claims)
 *   in / out
 */

type AuthState = {
  status: "unknown" | "in" | "out";
  user: Me | null;
  /** Asks the API who the cookie belongs to. Called once when the app mounts. */
  restore: () => Promise<void>;
  /** A sign-in just succeeded: remember the user and bring their saved reading and follows over. */
  signedIn: (user: Me) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuth = create<AuthState>()((set) => ({
  status: "unknown",
  user: null,

  restore: async () => {
    try {
      const user = await auth.me();
      set({ status: "in", user });
      await Promise.all([useBookmarks.getState().pull(), useFollows.getState().pull()]);
    } catch {
      set({ status: "out", user: null });
    }
  },

  signedIn: async (user) => {
    set({ status: "in", user });
    // the list kept in this browser while signed out joins the account's list
    await useBookmarks.getState().merge();
    await useFollows.getState().pull();
  },

  signOut: async () => {
    await auth.signOut().catch(() => undefined);
    set({ status: "out", user: null });
    // a signed-out device keeps nothing of the account
    useBookmarks.getState().clear();
    useFollows.getState().reset();
  },
}));
