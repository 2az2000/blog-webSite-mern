import { routes } from "@/config/routes";
import { SITE_NAME, rssFeed } from "@/lib/seo";
import { articlesInSection, getSection } from "@/services/content";

/** One section's feed, e.g. /category/technology/feed.xml. */
export const revalidate = 600;

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const section = await getSection(slug);
  if (!section) return new Response("Not found", { status: 404 });
  const body = rssFeed({
    title: `${section.name} — ${SITE_NAME}`,
    description: section.blurb,
    path: routes.category(slug),
    selfPath: `${routes.category(slug)}/feed.xml`,
    items: (await articlesInSection(slug)).slice(0, 30),
  });
  return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } });
}
