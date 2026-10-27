import { SITE_NAME, rssFeed } from "@/lib/seo";
import { listArticles } from "@/services/content";

/** The whole publication, newest first. Readers' RSS apps and aggregators poll this. */
export const revalidate = 600;

export async function GET() {
  const items = (await listArticles()).slice(0, 30);
  const body = rssFeed({
    title: SITE_NAME,
    description: "Ideas, stories, and perspectives shaping tomorrow.",
    path: "/",
    selfPath: "/feed.xml",
    items,
  });
  return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } });
}
