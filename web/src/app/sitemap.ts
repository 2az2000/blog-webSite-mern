import type { MetadataRoute } from "next";

import { routes } from "@/config/routes";
import { absolute, articlePath, IS_STAGING } from "@/lib/seo";
import { listArticles, listAuthors, listSections, listTopics } from "@/services/content";

/** Everything public, so a crawler finds every story without following a single link. */
export const revalidate = 3600;

const fixed: { path: string; priority: number; changeFrequency: "hourly" | "daily" | "weekly" }[] = [
  { path: routes.home(), priority: 1, changeFrequency: "hourly" },
  { path: routes.trending(), priority: 0.7, changeFrequency: "hourly" },
  { path: routes.newsletter(), priority: 0.5, changeFrequency: "weekly" },
  { path: routes.subscribe(), priority: 0.5, changeFrequency: "weekly" },
  { path: routes.privacy(), priority: 0.2, changeFrequency: "weekly" },
  { path: routes.terms(), priority: 0.2, changeFrequency: "weekly" },
  { path: routes.cookies(), priority: 0.2, changeFrequency: "weekly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (IS_STAGING) return [];
  const base: MetadataRoute.Sitemap = fixed.map((f) => ({ url: absolute(f.path), changeFrequency: f.changeFrequency, priority: f.priority }));
  try {
    const [articles, sections, authors, topics] = await Promise.all([listArticles(), listSections(), listAuthors(), listTopics()]);
    const newest = articles[0]?.date;
    return [
      ...base,
      ...sections.map((s) => ({
        url: absolute(routes.category(s.slug)),
        lastModified: newest,
        changeFrequency: "daily" as const,
        priority: s.slug === "latest" ? 0.9 : 0.6,
      })),
      ...articles.map((a) => ({
        url: absolute(articlePath(a)),
        lastModified: a.date,
        changeFrequency: "weekly" as const,
        priority: a.kind === "longread" ? 0.8 : 0.7,
      })),
      ...authors.map((a) => ({ url: absolute(routes.author(a.slug)), changeFrequency: "weekly" as const, priority: 0.4 })),
      ...topics.map((t) => ({ url: absolute(routes.topic(t.slug)), changeFrequency: "weekly" as const, priority: 0.4 })),
    ];
  } catch {
    // the API is unreachable: a sitemap with the fixed pages beats none (it refreshes within the hour)
    return base;
  }
}
