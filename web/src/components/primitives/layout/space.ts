/*
 * The spacing scale, as typed props. Each step maps to a LITERAL Tailwind
 * class (Tailwind only generates classes it can read in the source), so a
 * layout prop can never leave the NOVA scale.
 */

/** The spacing scale in px. Every gap and margin in the app is one of these. */
export type Space = 0 | 4 | 8 | 12 | 16 | 24 | 32 | 48 | 64 | 80 | 96 | 128;

export type SpaceProps = {
  /** Margin above, on the token scale. Prefer a parent Stack gap; use this for one-off rhythm. */
  mt?: Space;
  /** Margin below, on the token scale. */
  mb?: Space;
};

const MT: Record<Space, string> = {
  0: "mt-0", 4: "mt-1", 8: "mt-2", 12: "mt-3", 16: "mt-4", 24: "mt-6",
  32: "mt-8", 48: "mt-12", 64: "mt-16", 80: "mt-20", 96: "mt-24", 128: "mt-32",
};
const MB: Record<Space, string> = {
  0: "mb-0", 4: "mb-1", 8: "mb-2", 12: "mb-3", 16: "mb-4", 24: "mb-6",
  32: "mb-8", 48: "mb-12", 64: "mb-16", 80: "mb-20", 96: "mb-24", 128: "mb-32",
};
const GAP: Record<Space, string> = {
  0: "gap-0", 4: "gap-1", 8: "gap-2", 12: "gap-3", 16: "gap-4", 24: "gap-6",
  32: "gap-8", 48: "gap-12", 64: "gap-16", 80: "gap-20", 96: "gap-24", 128: "gap-32",
};
const ROW_GAP: Record<Space, string> = {
  0: "gap-y-0", 4: "gap-y-1", 8: "gap-y-2", 12: "gap-y-3", 16: "gap-y-4", 24: "gap-y-6",
  32: "gap-y-8", 48: "gap-y-12", 64: "gap-y-16", 80: "gap-y-20", 96: "gap-y-24", 128: "gap-y-32",
};
const COL_GAP: Record<Space, string> = {
  0: "gap-x-0", 4: "gap-x-1", 8: "gap-x-2", 12: "gap-x-3", 16: "gap-x-4", 24: "gap-x-6",
  32: "gap-x-8", 48: "gap-x-12", 64: "gap-x-16", 80: "gap-x-20", 96: "gap-x-24", 128: "gap-x-32",
};

export function spaceClass({ mt, mb }: SpaceProps): string | undefined {
  const out = [mt !== undefined && MT[mt], mb !== undefined && MB[mb]].filter(Boolean);
  return out.length ? out.join(" ") : undefined;
}

/** Gap utility for one step of the scale, on both axes or one. */
export function gapClass(gap: Space | undefined, axis: "gap" | "row" | "col" = "gap"): string | undefined {
  if (gap === undefined) return undefined;
  return (axis === "row" ? ROW_GAP : axis === "col" ? COL_GAP : GAP)[gap];
}
