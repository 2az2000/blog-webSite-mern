import type { MetadataRoute } from "next";

import { IS_STAGING, SITE_URL, absolute } from "@/lib/seo";

/**
 * Crawlers may read the whole publication. The back office, the API and the pages
 * that exist only for one person (their account, their saved list, their e-mail links)
 * are left out.
 */
export default function robots(): MetadataRoute.Robots {
  if (IS_STAGING) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/auth", "/bookmarks", "/newsletter/confirm", "/newsletter/manage", "/design-system", "/states"] }],
    sitemap: absolute("/sitemap.xml"),
    host: SITE_URL,
  };
}
