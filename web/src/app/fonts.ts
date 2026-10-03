import { Inter, Newsreader, Noto_Naskh_Arabic, Vazirmatn } from "next/font/google";

/*
 * Self-hosted by next/font — no request reaches Google at runtime.
 * Each font only exposes a CSS variable; the stacks that combine them live in
 * the @theme block of app/globals.css (--font-serif / --font-sans / --font-mono), so no
 * component ever names a family.
 *
 *   Newsreader  → Latin serif    (reference: Display → H4)
 *   Naskh       → Persian serif  (the Arabic-script partner of Newsreader)
 *   Inter       → Latin sans     (reference: Body → Label)
 *   Vazirmatn   → Persian sans   (the Arabic-script partner of Inter)
 */

export const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-newsreader",
  display: "swap",
  // The reference's stacks are "Inter", system-ui… with nothing between: a
  // synthetic Arial-based fallback face would answer for glyphs Inter's Latin
  // subset lacks (→) and draw them wider than the reference does.
  adjustFontFallback: false,
});

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  // The reference's stacks are "Inter", system-ui… with nothing between: a
  // synthetic Arial-based fallback face would answer for glyphs Inter's Latin
  // subset lacks (→) and draw them wider than the reference does.
  adjustFontFallback: false,
});

export const naskh = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  variable: "--font-naskh",
  display: "swap",
  // The reference's stacks are "Inter", system-ui… with nothing between: a
  // synthetic Arial-based fallback face would answer for glyphs Inter's Latin
  // subset lacks (→) and draw them wider than the reference does.
  adjustFontFallback: false,
});

export const vazirmatn = Vazirmatn({
  subsets: ["arabic"],
  variable: "--font-vazirmatn",
  display: "swap",
  // The reference's stacks are "Inter", system-ui… with nothing between: a
  // synthetic Arial-based fallback face would answer for glyphs Inter's Latin
  // subset lacks (→) and draw them wider than the reference does.
  adjustFontFallback: false,
});

export const fontVariables = [newsreader, inter, naskh, vazirmatn].map((f) => f.variable).join(" ");
