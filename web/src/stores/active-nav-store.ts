"use client";

import { create } from "zustand";

/**
 * Which masthead section a page belongs to when its URL does not say so
 * (reference: `<body data-nav>` — an article lights up its own section,
 * the trending board lights up "Latest").
 */
export const useActiveNav = create<{ key: string | null; set: (key: string | null) => void }>()((set) => ({
  key: null,
  set: (key) => set({ key }),
}));
