/*
 * Editorial content model — ported from blog-refrence/assets/nova-data.js.
 * These are the shapes the UI consumes. When the Express API is wired in,
 * `services/content.ts` maps API responses onto them; components never see
 * raw API payloads.
 */

export type AuthorSlug = string;
export type SectionSlug = string;
export type TopicSlug = string;

export type Author = {
  slug: AuthorSlug;
  name: string;
  /** Monogram for the typographic avatar — NOVA does not use stock portraits. */
  initials: string;
  role: string;
  /** Year of the first NOVA byline. */
  since: number;
  bio: string;
  /** A commissioned portrait. Absent → the typographic monogram, never a stand-in photo. */
  portrait?: string;
};

export type Section = {
  slug: SectionSlug;
  name: string;
  blurb: string;
};

export type ArticleKind = "article" | "opinion" | "video" | "longread" | "interview";

export type Trend = "up" | "down" | "flat";

export type Article = {
  slug: string;
  kind: ArticleKind;
  section: SectionSlug;
  title: string;
  standfirst: string;
  author: AuthorSlug;
  /** Calendar day, ISO 8601 (YYYY-MM-DD). */
  date: string;
  /** Reading time in minutes. */
  mins: number;
  /** Public path of the lead image. */
  image: string;
  tags: TopicSlug[];
  views: number;
  comments: number;
  /** Direction of travel on the trending board — the only movement NOVA reports. */
  trend: Trend;
};

export type Topic = {
  slug: TopicSlug;
  name: string;
  blurb: string;
  related: TopicSlug[];
};

/** An article with its author and section already resolved — what cards render. */
export type ArticleView = Article & {
  authorRef: Author;
  sectionRef: Section;
  href: string;
};

/* — Article bodies ----------------------------------------------------------
 * Long-form content is structured blocks, not HTML, so the CMS can supply it
 * and the renderer owns every class. Rich text supports **strong** only. */

export type RichText = string;

export type FigureBlock = {
  type: "figure";
  src: string;
  alt: string;
  width: number;
  height: number;
  caption: string;
  credit?: string;
  ratio?: "3x2" | "16x9";
  /** Reach past the measure (`.frame--wide`). */
  wide?: boolean;
};

export type ChartRow = { label: string; value: number; muted?: boolean };

export type BodyBlock =
  | { type: "p"; text: RichText }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "list"; items: RichText[] }
  | FigureBlock
  | { type: "pullquote"; text: string; cite: string }
  | { type: "blockquote"; text: string }
  /** Inline recirculation. `slugs` omitted → stories sharing a tag with the article. */
  | { type: "recirc"; label: string; slugs?: string[] }
  | { type: "chapter"; id: string; label: string; title: string }
  /** Long-form full-width image band (`.lf-break`). */
  | { type: "break"; src: string; alt: string; width: number; height: number; caption: string; credit: string }
  | { type: "chart"; description: string; max: number; unit: string; rows: ChartRow[] }
  | { type: "chartNote"; text: string }
  | { type: "note"; label: string; text: string }
  | { type: "timeline"; items: { year: string; title: string; text: string }[] };

/** A body block after the service has resolved its references. */
export type ResolvedBlock =
  | Exclude<BodyBlock, { type: "recirc" }>
  | { type: "recirc"; label: string; articles: ArticleView[] };

export type ArticleDetail = {
  /** Small label beside the section kicker ("Reported feature"). */
  label: string;
  heroAlt: string;
  heroCaption: string;
  heroCredit: string;
  /** ISO date of the last update, if any. */
  updated?: string;
  dropcap: boolean;
  body: BodyBlock[];
};

export type LongformDetail = {
  eyebrow: string;
  heroAlt: string;
  bylineRole: string;
  reporterBio: string;
  filedUnder: { label: string; topic: string }[];
  relatedSection: string;
  related: string[];
  body: BodyBlock[];
};
