import { expect, test } from "@playwright/test";

test.describe("reading the site", () => {
  test("the front page shows the lead story and tells search engines what it is", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/NOVA/);
    await expect(page.getByRole("link", { name: /Why the Next Generation of Software/ }).first()).toBeVisible();
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(JSON.parse(ld ?? "{}")).toMatchObject({ "@type": "WebSite", name: "NOVA" });
  });

  test("a story page has its canonical address, link preview and article data", async ({ page }) => {
    await page.goto("/article/context-software");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Next Generation of Software");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/article\/context-software$/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /context-software\.jpg/);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.flatMap((b) => JSON.parse(b)).map((d: { "@type": string }) => d["@type"]);
    expect(types).toEqual(expect.arrayContaining(["NewsArticle", "BreadcrumbList"]));
  });

  test("an unknown story is a real 404", async ({ page }) => {
    const response = await page.goto("/article/this-does-not-exist");
    expect(response?.status()).toBe(404);
  });

  test("search finds a story by a word in its headline, and by a stem", async ({ page }) => {
    await page.goto("/search?q=battery");
    await expect(page.getByRole("link", { name: /Battery Chemistry/ }).first()).toBeVisible();
    await page.goto("/search?q=batteries");
    await expect(page.getByRole("link", { name: /Battery Chemistry/ }).first()).toBeVisible();
  });

  test("pages are served with security headers", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });

  test("crawlers and feed readers find what they look for", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Sitemap:");
    expect(robots).toContain("Disallow: /admin");

    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/article/context-software");
    expect(sitemap).toContain("/longform/grid-rebuild");

    const feed = await request.get("/feed.xml");
    expect(feed.headers()["content-type"]).toContain("application/rss+xml");
    expect(await feed.text()).toMatch(/^<\?xml[\s\S]*<rss version="2\.0"/);
    expect((await request.get("/category/technology/feed.xml")).status()).toBe(200);
  });
});
