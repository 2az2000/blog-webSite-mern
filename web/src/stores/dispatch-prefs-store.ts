"use client";

import { create } from "zustand";

/*
 * What the visitor picked on the newsletter page — topics and how often —
 * kept between the pickers and the sign-up form further up. Nothing is stored
 * anywhere until they subscribe.
 */

export type Frequency = "both" | "weekly" | "monthly";

/** The topics the page offers, and the key the API knows each by (a section slug, or `longreads`). */
export const DISPATCH_TOPICS = [
  { label: "Technology", key: "technology" },
  { label: "Business", key: "business" },
  { label: "Science", key: "science" },
  { label: "Design", key: "design" },
  { label: "Culture", key: "culture" },
  { label: "Society", key: "society" },
  { label: "Opinion", key: "opinion" },
  { label: "Long reads", key: "longreads" },
] as const;

type PrefsState = {
  topics: string[];
  frequency: Frequency;
  toggleTopic: (key: string) => void;
  setFrequency: (f: Frequency) => void;
};

export const useDispatchPrefs = create<PrefsState>()((set) => ({
  topics: [],
  frequency: "both",
  toggleTopic: (key) => set((s) => ({ topics: s.topics.includes(key) ? s.topics.filter((t) => t !== key) : [...s.topics, key] })),
  setFrequency: (frequency) => set({ frequency }),
}));
