"use client";

import { useMemo } from "react";

import { CardGrid } from "@/components/primitives";
import { useTheme } from "@/hooks/use-theme";

/* The names the reference documents (--bg, --muted …) and the theme variable each one is today. */
const TOKENS = [
  ["bg", "--color-bg"],
  ["surface", "--color-surface"],
  ["surface-2", "--color-surface-2"],
  ["surface-sunk", "--color-surface-sunk"],
  ["fg", "--color-fg"],
  ["fg-soft", "--color-fg-soft"],
  ["muted", "--color-meta"],
  ["muted-soft", "--color-muted-soft"],
  ["border", "--color-border"],
  ["border-strong", "--color-strong"],
  ["accent", "--color-brand"],
  ["accent-hover", "--color-brand-hover"],
  ["accent-soft", "--color-brand-soft"],
  ["accent-2", "--color-brand-2"],
  ["success", "--color-success"],
  ["warning", "--color-warning"],
  ["error", "--color-error"],
  ["skeleton", "--color-skeleton"],
] as const;

/** .spec-swatch — colour tokens with their live computed value, re-read whenever the theme changes. */
export function Swatches() {
  const { theme } = useTheme();
  // theme is null during SSR/hydration; once known, read the resolved values for it.
  const values = useMemo<Record<string, string>>(() => {
    if (!theme) return {};
    const cs = getComputedStyle(document.documentElement);
    return Object.fromEntries(TOKENS.map(([name, v]) => [name, cs.getPropertyValue(v).trim()]));
  }, [theme]);

  return (
    <CardGrid cols={4} gap={24}>
      {TOKENS.map(([name, cssVar]) => (
        <div key={name} className="grid gap-2 *:min-w-0">
          {/* The chip's colour is the token being shown: set at runtime, as in the reference. */}
          <span
            className="block h-18 rounded-md border border-border"
            style={{ background: `var(${cssVar})` }}
          />
          <span className="text-caption font-650">--{name}</span>
          <span className="font-mono text-overline text-meta uppercase">{values[name]}</span>
        </div>
      ))}
    </CardGrid>
  );
}
