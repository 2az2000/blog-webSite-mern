import type { BodyBlock } from "@/types/content";

/*
 * What each body block (and each kind of page copy) is made of. The editor
 * draws its forms from these tables, so a new block type is a new entry here
 * plus a renderer in ArticleBody — never a new form component. The shapes
 * match backend/src/modules/content/content.schemas.ts one for one.
 */

export type Obj = Record<string, unknown>;

type Base = { key: string; /** Dropped from the saved object when left empty. */ optional?: boolean };

export type FieldDef =
  | (Base & { kind: "text" | "area" | "date" | "check" | "lines" | "number" | "image" })
  | (Base & { kind: "select"; options: readonly string[] })
  | (Base & { kind: "rows"; sub: readonly FieldDef[] });

export type BlockType = BodyBlock["type"];

export const BLOCK_TYPES: readonly BlockType[] = [
  "p", "h2", "h3", "list", "figure", "pullquote", "blockquote", "recirc",
  "chapter", "break", "chart", "chartNote", "note", "timeline",
];

const text = (key: string, optional?: boolean): FieldDef => ({ key, kind: "text", optional });
const area = (key: string): FieldDef => ({ key, kind: "area" });
const num = (key: string): FieldDef => ({ key, kind: "number" });

export const BLOCK_FIELDS: Record<BlockType, readonly FieldDef[]> = {
  p: [area("text")],
  h2: [text("text")],
  h3: [text("text")],
  list: [{ key: "items", kind: "lines" }],
  figure: [
    { key: "src", kind: "image" },
    text("alt"),
    { key: "decorative", kind: "check", optional: true },
    text("caption"),
    text("credit", true),
    { key: "ratio", kind: "select", options: ["3x2", "16x9"], optional: true },
    { key: "wide", kind: "check", optional: true },
    num("width"),
    num("height"),
  ],
  pullquote: [area("text"), text("cite")],
  blockquote: [area("text")],
  recirc: [text("label"), { key: "slugs", kind: "lines", optional: true }],
  chapter: [text("id"), text("label"), text("title")],
  break: [{ key: "src", kind: "image" }, text("alt"), { key: "decorative", kind: "check", optional: true }, text("caption"), text("credit"), num("width"), num("height")],
  chart: [
    text("description"),
    num("max"),
    text("unit"),
    { key: "rows", kind: "rows", sub: [text("label"), num("value"), { key: "muted", kind: "check", optional: true }] },
  ],
  chartNote: [area("text")],
  note: [text("label"), area("text")],
  timeline: [{ key: "items", kind: "rows", sub: [text("year"), text("title"), area("text")] }],
};

/** A new block of each type, valid on the server from the first keystroke. */
export const BLANK_BLOCK: Record<BlockType, BodyBlock> = {
  p: { type: "p", text: "" },
  h2: { type: "h2", text: "" },
  h3: { type: "h3", text: "" },
  list: { type: "list", items: [] },
  figure: { type: "figure", src: "", alt: "", width: 1600, height: 1067, caption: "" },
  pullquote: { type: "pullquote", text: "", cite: "" },
  blockquote: { type: "blockquote", text: "" },
  recirc: { type: "recirc", label: "Keep reading" },
  chapter: { type: "chapter", id: "", label: "", title: "" },
  break: { type: "break", src: "", alt: "", width: 2400, height: 1080, caption: "", credit: "" },
  chart: { type: "chart", description: "", max: 100, unit: "", rows: [] },
  chartNote: { type: "chartNote", text: "" },
  note: { type: "note", label: "", text: "" },
  timeline: { type: "timeline", items: [] },
};

/** Blank row for a `rows` field, keyed by its parent. */
export function blankRow(sub: readonly FieldDef[]): Obj {
  return Object.fromEntries(
    sub.filter((f) => !f.optional).map((f) => [f.key, f.kind === "number" ? 0 : f.kind === "check" ? false : ""]),
  );
}

/* — Page copy ———————————————————————————————————————————— */

export const ARTICLE_DETAIL: readonly FieldDef[] = [
  text("label"),
  text("heroAlt"),
  text("heroCaption"),
  text("heroCredit"),
  { key: "updated", kind: "date", optional: true },
  { key: "dropcap", kind: "check" },
];

export const LONGFORM_DETAIL: readonly FieldDef[] = [
  text("eyebrow"),
  text("heroAlt"),
  text("bylineRole"),
  area("reporterBio"),
  { key: "filedUnder", kind: "rows", sub: [text("label"), text("topic")] },
  text("relatedSection"),
  { key: "related", kind: "lines" },
];

export const DETAIL_DEFAULTS: Record<"article" | "longread", Obj> = {
  article: { label: "", heroAlt: "", heroCaption: "", heroCredit: "", dropcap: true },
  longread: { eyebrow: "", heroAlt: "", bylineRole: "", reporterBio: "", filedUnder: [], relatedSection: "technology", related: [] },
};

export const detailFields = (kind: string): readonly FieldDef[] => (kind === "longread" ? LONGFORM_DETAIL : ARTICLE_DETAIL);

export const detailDefaults = (kind: string): Obj => DETAIL_DEFAULTS[kind === "longread" ? "longread" : "article"];

/** Which fields hold prose that supports **bold** (the hint is shown for these). */
export const RICH_KEYS: ReadonlySet<string> = new Set(["text", "items"]);

/** True when an optional field carries nothing worth saving. */
export const isEmptyValue = (v: unknown): boolean =>
  v === undefined || v === "" || v === false || (Array.isArray(v) && v.length === 0);
