"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "nova:theme";

/**
 * Runs in <head> before first paint (see app/layout.tsx) — the reference's
 * own boot line: stored choice, else the OS preference.
 */
export const themeBootScript = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

const getSnapshot = (): Theme =>
  document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";

// The server cannot know the theme; `null` renders the neutral state and React
// swaps in the real value right after hydration without a mismatch.
const getServerSnapshot = (): Theme | null => null;

/** The current theme, read from <html data-theme> — the single source of truth. */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private mode / blocked storage: the choice lasts for this page only.
    }
  }, []);

  const toggle = useCallback(() => setTheme(getSnapshot() === "dark" ? "light" : "dark"), [setTheme]);

  return { theme, setTheme, toggle };
}
