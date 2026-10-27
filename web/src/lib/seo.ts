import { FOUNDED } from "@/config/site";
import { routes } from "@/config/routes";
import type { ArticleView } from "@/types/content";

/*
 * What search engines and link previews read: absolute URLs, structured data
 * (schema.org JSON-LD) and the RSS feed text. Pure functions, no I/O.
 */

/** The site's public address, no trailing slash. Set SITE_URL in production. */
export const SITE_URL = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const SITE_NAME = "NOVA";

/**
 * A pre-production copy (`SITE_ENV=staging`) must stay out of search engines and link previews:
 * robots.txt closes everything, every response says `noindex`, and the sitemap is empty.
 */
export const IS_STAGING = process.env.SITE_ENV === "staging";

/** `/article/x` → `https://nova.example/article/x`; an absolute URL is left alone. */
export const absolute = (path: string): string => (/^https?:\/\//.test(path) ? path : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`);

/** The canonical path of an article page, by kind. */
export const articlePath = (a: Pick<ArticleView, "slug" | "kind">): string => (a.kind === "longread" ? routes.longform(a.slug) : routes.article(a.slug));

const publisher = {
  "@type": "NewsMediaOrganization",
  name: SITE_NAME,
  url: SITE_URL,
  foundingDate: String(FOUNDED),
} as const;

/** schema.org NewsArticle: what makes a story eligible for news and rich results. */
export function newsArticleLd(a: ArticleView, extra: { modified?: string; section?: string } = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: a.title.slice(0, 110),
    description: a.standfirst,
    image: [absolute(a.image)],
    datePublished: a.date,
    dateModified: extra.modified ?? a.date,
    author: { "@type": "Person", name: a.authorRef.name, url: absolute(routes.author(a.author)) },
    publisher,
    mainEntityOfPage: { "@type": "WebPage", "@id": absolute(articlePath(a)) },
    articleSection: extra.section ?? a.sectionRef.name,
    keywords: a.tags.join(", "),
  };
}

export function breadcrumbLd(items: { name: string; path?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.path ? { item: absolute(item.path) } : {}),
    })),
  };
}

/** The front page: the site, and its search box (the sitelinks search). */
export function websiteLd(description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description,
    publisher,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function personLd(a: { slug: string; name: string; role: string; bio: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: a.name,
    jobTitle: a.role,
    description: a.bio,
    url: absolute(routes.author(a.slug)),
    worksFor: { "@type": "NewsMediaOrganization", name: SITE_NAME, url: SITE_URL },
  };
}

/* — RSS ———————————————————————————————————————————————————— */

export const xml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** RFC 822 date, as RSS wants, from a calendar day (published at noon UTC). */
export const rfc822 = (day: string): string => new Date(`${day}T12:00:00Z`).toUTCString();

export function rssFeed(opts: { title: string; description: string; path: string; selfPath: string; items: ArticleView[] }): string {
  const items = opts.items
    .map(
      (a) => `    <item>
      <title>${xml(a.title)}</title>
      <link>${xml(absolute(articlePath(a)))}</link>
      <guid isPermaLink="true">${xml(absolute(articlePath(a)))}</guid>
      <pubDate>${rfc822(a.date)}</pubDate>
      <dc:creator>${xml(a.authorRef.name)}</dc:creator>
      <category>${xml(a.sectionRef.name)}</category>
      <description>${xml(a.standfirst)}</description>
      <enclosure url="${xml(absolute(a.image))}" type="image/jpeg" length="0"/>
    </item>`,
    )
    .join("\n");
  const newest = opts.items[0];
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${xml(opts.title)}</title>
    <link>${xml(absolute(opts.path))}</link>
    <atom:link href="${xml(absolute(opts.selfPath))}" rel="self" type="application/rss+xml"/>
    <description>${xml(opts.description)}</description>
    <language>en</language>
${newest ? `    <lastBuildDate>${rfc822(newest.date)}</lastBuildDate>\n` : ""}${items}
  </channel>
</rss>
`;
}
