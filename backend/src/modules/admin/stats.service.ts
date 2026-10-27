/**
 * The back-office overview: how much was read lately, what is read most, and
 * what is waiting for a person.
 *
 * Traffic comes from `read_events` (one row per viewer, article and day, kept
 * 90 days), so a "view" here is a distinct visitor-day, never a refresh. A
 * writer sees only their own stories; editors add the reader-facing queues and
 * subscribers; admins add accounts.
 */
import { ArticleModel } from "../../models/article.model.js";
import { BrokenLinkModel } from "../../models/broken-link.model.js";
import { CommentModel } from "../../models/comment.model.js";
import { ReadEventModel } from "../../models/read-event.model.js";
import { SubscriberModel } from "../../models/newsletter.model.js";
import { roleHas } from "../../http/permissions.js";
import { UserModel, type Role } from "../../models/user.model.js";
import type { Actor } from "../../services/audit.service.js";
import { isEditorial } from "./article-workflow.js";

const DAY_MS = 24 * 3600 * 1000;
const dayKey = (d: Date): string => d.toISOString().slice(0, 10);

/** `n` consecutive UTC days ending today, oldest first. */
export function lastDays(n: number, now = new Date()): string[] {
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Array.from({ length: n }, (_, i) => dayKey(new Date(end - (n - 1 - i) * DAY_MS)));
}

interface DayCount {
  _id: string;
  views: number;
  reads: number;
}

async function trafficByDay(days: string[], slugs: string[] | null): Promise<Map<string, DayCount>> {
  const rows = await ReadEventModel.aggregate<DayCount>([
    { $match: { day: { $gte: days[0], $lte: days[days.length - 1] }, ...(slugs ? { article: { $in: slugs } } : {}) } },
    { $group: { _id: "$day", views: { $sum: 1 }, reads: { $sum: { $cond: ["$completed", 1, 0] } } } },
  ]);
  return new Map(rows.map((r) => [r._id, r]));
}

const sum = (m: Map<string, DayCount>, days: string[], k: "views" | "reads"): number =>
  days.reduce((n, d) => n + (m.get(d)?.[k] ?? 0), 0);

export async function overview(actor: Actor, windowDays: number) {
  const days = lastDays(windowDays);
  const before = lastDays(windowDays * 2).slice(0, windowDays);
  const own = !isEditorial(actor.role);

  const mine = own ? await ArticleModel.find({ createdBy: actor.id }, { slug: 1 }).lean() : null;
  const slugs = mine ? mine.map((a) => a.slug) : null;
  const scope = own ? { createdBy: actor.id } : {};

  const [byDay, byDayBefore, topRows, statusRows, allTime] = await Promise.all([
    trafficByDay(days, slugs),
    trafficByDay(before, slugs),
    ReadEventModel.aggregate<{ _id: string; views: number; reads: number }>([
      { $match: { day: { $gte: days[0] }, ...(slugs ? { article: { $in: slugs } } : {}) } },
      { $group: { _id: "$article", views: { $sum: 1 }, reads: { $sum: { $cond: ["$completed", 1, 0] } } } },
      { $sort: { reads: -1, views: -1, _id: 1 } },
      { $limit: 8 },
    ]),
    ArticleModel.aggregate<{ _id: string; n: number }>([{ $match: scope }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
    ArticleModel.find({ status: "published", ...scope }, { slug: 1, title: 1, section: 1, views: 1, readCount: 1, commentCount: 1, likeCount: 1 })
      .sort({ readCount: -1, views: -1, _id: 1 })
      .limit(8)
      .lean(),
  ]);

  const titles = new Map(
    (await ArticleModel.find({ slug: { $in: topRows.map((r) => r._id) } }, { slug: 1, title: 1, section: 1 }).lean()).map((a) => [a.slug, a]),
  );

  const result = {
    scope: own ? ("own" as const) : ("newsroom" as const),
    days: windowDays,
    traffic: {
      series: days.map((d) => ({ day: d, views: byDay.get(d)?.views ?? 0, reads: byDay.get(d)?.reads ?? 0 })),
      views: sum(byDay, days, "views"),
      reads: sum(byDay, days, "reads"),
      previousViews: sum(byDayBefore, before, "views"),
      previousReads: sum(byDayBefore, before, "reads"),
    },
    top: topRows.map((r) => ({
      slug: r._id,
      title: titles.get(r._id)?.title ?? r._id,
      section: titles.get(r._id)?.section ?? "",
      views: r.views,
      reads: r.reads,
    })),
    topAllTime: allTime.map((a) => ({
      slug: a.slug,
      title: a.title,
      section: a.section,
      views: a.views,
      reads: a.readCount,
      comments: a.commentCount,
      likes: a.likeCount,
    })),
    articles: Object.fromEntries(statusRows.map((r) => [r._id, r.n])) as Record<string, number>,
  };

  if (own) return result;

  const withUsers = roleHas(actor.role as Role, "users.manage");
  const since = new Date(Date.now() - windowDays * DAY_MS);
  const [held, reported, brokenOpen, subscriberRows, users, newUsers] = await Promise.all([
    CommentModel.countDocuments({ status: "held" }),
    CommentModel.countDocuments({ status: "published", reportCount: { $gt: 0 } }),
    BrokenLinkModel.countDocuments({ resolved: false }),
    SubscriberModel.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    withUsers ? UserModel.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$role", n: { $sum: 1 } } }]) : Promise.resolve(null),
    withUsers ? UserModel.countDocuments({ createdAt: { $gte: since } }) : Promise.resolve(null),
  ]);

  return {
    ...result,
    queues: { commentsHeld: held, commentsReported: reported, brokenLinks: brokenOpen },
    subscribers: Object.fromEntries(subscriberRows.map((r) => [r._id, r.n])) as Record<string, number>,
    ...(users ? { users: Object.fromEntries(users.map((r) => [r._id, r.n])) as Record<string, number>, newUsers } : {}),
  };
}
