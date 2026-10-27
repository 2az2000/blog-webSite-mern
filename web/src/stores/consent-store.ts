"use client";

import { create } from "zustand";

import { readConsent, writeConsent, type Consent } from "@/lib/consent";

/*
 * Whether the cookie notice is showing, and what was chosen. It is read from
 * localStorage after hydration (the server cannot know), so `ready` stays false
 * until then and nothing flashes.
 */

type ConsentState = {
  ready: boolean;
  consent: Consent | null;
  /** The notice was asked for again ("Cookie settings"), even though a choice exists. */
  reopened: boolean;
  load: () => void;
  choose: (preferences: boolean) => void;
  reopen: () => void;
};

export const useConsent = create<ConsentState>()((set) => ({
  ready: false,
  consent: null,
  reopened: false,
  load: () => set({ ready: true, consent: readConsent() }),
  choose: (preferences) => set({ consent: writeConsent(preferences), reopened: false }),
  reopen: () => set({ reopened: true }),
}));
