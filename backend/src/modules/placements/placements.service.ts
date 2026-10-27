/**
 * The front page's editorial placement: which story leads, what sits beside
 * it, the Brief, the picks, the opinion column, the long read.
 *
 * Editors pin stories to slots; any slot they leave empty (or that loses a
 * story to unpublishing) is filled with the newest suitable stories, so the
 * front page is never short and a fresh story appears without anyone touching
 * it. An editor may pin one story in two slots on purpose; the automatic fill never repeats a story that is already on the page.
 */
import { ArticleModel, type ArticleKind } from "../../models/article.model.js";
import { PlacementModel } from "../../models/placement.model.js";
import { AppError } from "../../http/errors.js";
import { audit, type Actor } from "../../services/audit.service.js";
import { articleTags, revalidate } from "../../services/revalidate.service.js";
import { listArticles, summariesBySlugs, type ArticleSummary } from "../content/content.service.js";

/** Opinion and interviews have their own column, so the news slots do not borrow them. */
const NEWS: ArticleKind[] = ["article", "video"];

/** The slots of the front page, in the order they are filled. `kinds` is what an automatic fill may pick. */
export const HOME_SLOTS = {
  lead: { max: 1, kinds: NEWS },
  secondary: { max: 2, kinds: NEWS },
  brief: { max: 4, kinds: NEWS },
  picks: { max: 4, kinds: NEWS },
  opinion: { max: 4, kinds: ["opinion", "interview"] as ArticleKind[] },
  longread: { max: 1, kinds: ["longread"] as ArticleKind[] },
} as const;

export type Slot = keyof typeof HOME_SLOTS;
export const SLOT_ORDER = Object.keys(HOME_SLOTS) as Slot[];

export type Pinned = Record<Slot, string[]>;

export const PLACEMENT_TAG = "placement:home";

const emptyPinned = (): Pinned => Object.fromEntries(SLOT_ORDER.map((s) => [s, [] as string[]])) as Pinned;

async function readPinned(): Promise<Pinned> {
  const doc = await PlacementModel.findOne({ page: "home" }).lean();
  const out = emptyPinned();
  for (const slot of SLOT_ORDER) {
    const raw = doc?.slots?.[slot];
    if (Array.isArray(raw)) out[slot] = raw.filter((s): s is string => typeof s === "string");
  }
  return out;
}

export interface LiveSlot {
  summary: ArticleSummary;
  /** True when an editor pinned it; false when it was filled in automatically. */
  pinned: boolean;
}

/** Resolves every slot: pinned stories that are still published, then automatic fill. */
async function resolve(pinned: Pinned): Promise<Record<Slot, LiveSlot[]>> {
  const found = await summariesBySlugs([...new Set(SLOT_ORDER.flatMap((s) => pinned[s]))]);
  const bySlug = new Map(found.map((a) => [a.slug, a]));
  const used = new Set(bySlug.keys());
  const live = {} as Record<Slot, LiveSlot[]>;

  for (const slot of SLOT_ORDER) {
    const spec = HOME_SLOTS[slot];
    const items: LiveSlot[] = [];
    const seen = new Set<string>();
    for (const slug of pinned[slot]) {
      const summary = bySlug.get(slug);
      if (summary && !seen.has(slug) && items.length < spec.max) {
        seen.add(slug);
        items.push({ summary, pinned: true });
      }
    }
    const missing = spec.max - items.length;
    if (missing > 0) {
      const { items: fill } = await listArticles({
        sort: "latest",
        limit: missing,
        kind: [...spec.kinds],
        exclude: [...used],
      });
      for (const summary of fill) {
        used.add(summary.slug);
        items.push({ summary, pinned: false });
      }
    }
    live[slot] = items;
  }
  return live;
}

/** What the front page draws. */
export async function getHome(): Promise<Record<Slot, ArticleSummary[]>> {
  const live = await resolve(await readPinned());
  return Object.fromEntries(SLOT_ORDER.map((s) => [s, live[s].map((x) => x.summary)])) as Record<Slot, ArticleSummary[]>;
}

/** What the editor sees: the pins, and what is live (marking which stories are automatic). */
export async function getHomeForEditing() {
  const pinned = await readPinned();
  const live = await resolve(pinned);
  return {
    limits: Object.fromEntries(SLOT_ORDER.map((s) => [s, HOME_SLOTS[s].max])) as Record<Slot, number>,
    pinned,
    live: Object.fromEntries(
      SLOT_ORDER.map((s) => [s, live[s].map((x) => ({ slug: x.summary.slug, title: x.summary.title, kind: x.summary.kind, pinned: x.pinned }))]),
    ) as Record<Slot, { slug: string; title: string; kind: ArticleKind; pinned: boolean }[]>,
  };
}

/** Replaces the pins. Every story must exist and be published. */
export async function setHome(actor: Actor, input: Pinned) {
  const slugs = SLOT_ORDER.flatMap((s) => input[s]);
  const live = await ArticleModel.find({ slug: { $in: slugs }, status: "published" }, { slug: 1, section: 1, author: 1 }).lean();
  const ok = new Set(live.map((a) => a.slug));
  const missing = slugs.filter((s) => !ok.has(s));
  if (missing.length > 0) {
    throw new AppError(
      422,
      "UNKNOWN_ARTICLE",
      "Only published stories can be placed on the front page",
      missing.map((slug) => ({ path: slug, message: "not a published article" })),
    );
  }

  await PlacementModel.updateOne({ page: "home" }, { $set: { slots: input, updatedBy: actor.id } }, { upsert: true });
  await audit(actor, "placement.update", "placement", "home", { slots: input });
  await revalidate([PLACEMENT_TAG, ...live.flatMap(articleTags)]);
  return getHomeForEditing();
}
