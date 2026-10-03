"use client";

import { useEffect } from "react";

import { useActiveNav } from "@/stores/active-nav-store";

/** Render once on a page to mark its masthead section. Renders nothing. */
export function ActiveNav({ section }: { section: string }) {
  const set = useActiveNav((s) => s.set);
  useEffect(() => {
    set(section);
    return () => set(null);
  }, [section, set]);
  return null;
}
