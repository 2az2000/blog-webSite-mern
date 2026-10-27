/**
 * Loads the editorial seed (backend/seed/*.json — a snapshot of the front
 * end's mock) into Mongo. Everything is validated with the same zod schemas
 * the admin editor will use, and written by slug, so running it twice changes
 * nothing.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { ArticleModel } from "../../models/article.model.js";
import { AuthorModel } from "../../models/author.model.js";
import { SectionModel } from "../../models/section.model.js";
import { TopicModel } from "../../models/topic.model.js";
import {
  articleDetailSchema,
  articleInputSchema,
  bodyBlockSchema,
  longformDetailSchema,
  slugSchema,
  type ArticleInput,
} from "./content.schemas.js";

const seedDir = fileURLToPath(new URL("../../../seed/", import.meta.url));

const authorSeed = z.object({
  slug: slugSchema,
  name: z.string().min(1),
  initials: z.string().min(1).max(4),
  role: z.string().min(1),
  since: z.number().int(),
  bio: z.string().min(1),
  portrait: z.string().optional(),
});

const sectionSeed = z.object({ slug: slugSchema, name: z.string().min(1), blurb: z.string() });
const topicSeed = z.object({ slug: slugSchema, name: z.string().min(1), blurb: z.string(), related: z.array(slugSchema) });

/** A mock article row: the summary fields plus a calendar day instead of a moment. */
const articleSeed = z.object({
  slug: slugSchema,
  kind: articleInputSchema.shape.kind,
  section: slugSchema,
  title: z.string().min(1),
  standfirst: z.string().min(1),
  author: slugSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mins: z.number().int().positive(),
  image: z.string().min(1),
  tags: z.array(slugSchema),
  views: z.number().int().nonnegative(),
  comments: z.number().int().nonnegative(),
  trend: articleInputSchema.shape.trend,
});

const detailSeed = z.object({
  article: articleDetailSchema.extend({ body: z.array(bodyBlockSchema) }),
  longform: z.record(slugSchema, longformDetailSchema.extend({ body: z.array(bodyBlockSchema) })),
});

export interface ContentSeed {
  authors: z.infer<typeof authorSeed>[];
  sections: z.infer<typeof sectionSeed>[];
  topics: z.infer<typeof topicSeed>[];
  articles: ArticleInput[];
}

async function readJson<T>(file: string, schema: z.ZodType<T>): Promise<T> {
  const raw = JSON.parse(await readFile(`${seedDir}${file}.json`, "utf8")) as unknown;
  return schema.parse(raw);
}

/** Reads and validates the JSON, and shapes the articles as the model stores them. */
export async function loadContentSeed(): Promise<ContentSeed> {
  const [authors, sections, topics, rows, details] = await Promise.all([
    readJson("authors", z.array(authorSeed)),
    readJson("sections", z.array(sectionSeed)),
    readJson("topics", z.array(topicSeed)),
    readJson("articles", z.array(articleSeed)),
    readJson("details", detailSeed),
  ]);

  const articles = rows.map(({ date, comments, ...row }, index): ArticleInput => {
    // The mock lists newest first; keep that order stable inside one day.
    const publishedAt = new Date(`${date}T12:00:00.000Z`);
    publishedAt.setUTCMinutes(publishedAt.getUTCMinutes() - index);

    const longform = details.longform[row.slug];
    if (row.kind === "longread") {
      if (!longform) throw new Error(`seed: long read "${row.slug}" has no entry in details.longform`);
      const { body, ...detail } = longform;
      return articleInputSchema.parse({ ...row, publishedAt, commentCount: comments, status: "published", detail, body });
    }
    const { body, ...detail } = details.article;
    return articleInputSchema.parse({ ...row, publishedAt, commentCount: comments, status: "published", detail, body });
  });

  // Dangling references would render as unnamed desks and authors — fail loudly instead.
  // (A tag without a topic page is fine: it is shown under its de-slugged name.)
  const known = {
    authors: new Set(authors.map((a) => a.slug)),
    sections: new Set(sections.map((s) => s.slug)),
  };
  for (const a of articles) {
    if (!known.authors.has(a.author)) throw new Error(`seed: "${a.slug}" names unknown author "${a.author}"`);
    if (!known.sections.has(a.section)) throw new Error(`seed: "${a.slug}" names unknown section "${a.section}"`);
  }

  return { authors, sections, topics, articles };
}

export interface SeedReport {
  authors: number;
  sections: number;
  topics: number;
  articles: number;
}

/** Upserts everything by slug. Existing rows are replaced in place; nothing is deleted. */
export async function seedContent(seed?: ContentSeed): Promise<SeedReport> {
  const { authors, sections, topics, articles } = seed ?? (await loadContentSeed());
  const upsert = <T extends { slug: string }>(rows: T[]) =>
    rows.map((row) => ({ updateOne: { filter: { slug: row.slug }, update: { $set: row }, upsert: true } }));

  await Promise.all([
    AuthorModel.bulkWrite(upsert(authors)),
    SectionModel.bulkWrite(upsert(sections.map((s, order) => ({ ...s, order })))),
    TopicModel.bulkWrite(upsert(topics)),
    ArticleModel.bulkWrite(upsert(articles)),
  ]);

  return { authors: authors.length, sections: sections.length, topics: topics.length, articles: articles.length };
}

/**
 * The reference front page, hand-placed: what the design export shows. Written
 * only when no placement exists yet, so re-seeding never overwrites an editor's
 * choices. ("think-better" sits in both the Brief and the opinion column, as in the export.)
 */
const REFERENCE_FRONT_PAGE = {
  lead: ["context-software"],
  secondary: ["human-brain", "ai-labour"],
  brief: ["small-powerful-companies", "think-better", "battery-chemistry", "internet-remember"],
  picks: ["open-source-money", "type-revival", "ocean-floor", "public-transit"],
  opinion: ["think-better", "attention-economy", "founder-mode", "interview-rasmussen"],
  longread: ["grid-rebuild"],
} as const;

export async function seedPlacements(): Promise<boolean> {
  const { PlacementModel } = await import("../../models/placement.model.js");
  const res = await PlacementModel.updateOne({ page: "home" }, { $setOnInsert: { slots: REFERENCE_FRONT_PAGE } }, { upsert: true });
  return res.upsertedCount === 1;
}
