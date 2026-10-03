import { createCn } from "cn/config";

/*
 * Class merging (clsx + tailwind-merge semantics), taught the NOVA theme.
 *
 * Without this, the merger cannot tell `text-h3` (a size) from `text-meta`
 * (a colour): it treats both as colours and silently drops one of them.
 * Every custom key under --text-*, --leading-*, --tracking-*,
 * --font-weight-*, --shadow-*, named --spacing-* and --container-* in
 * src/app/globals.css must be listed here.
 * scripts/check-tokens.mjs fails the check when the two drift apart.
 */
export const THEME_KEYS = {
  text: [
    "lead", "display", "h1", "h2", "h3", "h4",
    "body-lg", "body", "body-sm", "caption", "label", "overline", "index",
    "wordmark", "wordmark-compact", "wordmark-sm", "nav-xl", "nav-lg",
    "rank", "ledger", "ledger-sm", "pullquote", "longread", "break", "lf-title",
    "stat", "plan", "big", "big-xl", "big-sm", "dropcap", "dropcap-sm", "glyph",
  ],
  leading: [
    "lead", "display", "h1", "h2", "h3", "h4", "body", "tight", "none",
    "82", "85", "90", "116", "118", "120", "125", "130", "135", "150", "155", "160", "175",
  ],
  tracking: [
    "lead", "display", "h1", "h2", "h3", "h4", "overline", "index", "normal",
    "wordmark", "big-xl", "avatar", "play", "badge", "mark",
  ],
  weight: ["normal", "medium", "550", "semibold", "650", "bold"],
  shadow: ["raised", "overlay", "focus", "focus-error"],
  spacing: ["gutter", "col", "section", "header", "header-compact", "wrap", "rank", "ledger",
    "brk", "outset", "outset-full", "bleed-x", "frame-wide", "chapter", "modal", "toast", "safe-bar", "em"],
  container: [
    "content", "content-wide", "measure", "measure-wide", "narrow", "head", "article", "break",
    "empty", "panel", "rail", "auth", "ch-18", "ch-20", "ch-34", "ch-42", "ch-46", "ch-52", "ch-62",
  ],
} as const;

export const cn = createCn({
  // In this theme text-* sets the font SIZE only (line height and tracking are
  // their own utilities), so a later size must not drop an earlier leading-*.
  override: { conflictingClassGroups: { "font-size": [] } },
  extend: {
    theme: {
      spacing: [...THEME_KEYS.spacing],
      container: [...THEME_KEYS.container],
    },
    classGroups: {
      "font-size": [{ text: [...THEME_KEYS.text] }],
      leading: [{ leading: [...THEME_KEYS.leading] }],
      tracking: [{ tracking: [...THEME_KEYS.tracking] }],
      "font-weight": [{ font: [...THEME_KEYS.weight] }],
      shadow: [{ shadow: [...THEME_KEYS.shadow] }],
    },
  },
});
