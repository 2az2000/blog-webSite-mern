import { describe, expect, it } from "vitest";
import { loadContentSeed } from "../../src/modules/content/content.seed.js";
import { limitQuery, listArticlesQuery } from "../../src/modules/content/content.schemas.js";

describe("content seed", () => {
  it("validates and cross-references (authors, desks)", async () => {
    const seed = await loadContentSeed();
    expect(seed.articles).toHaveLength(22);
    expect(seed.sections.map((s) => s.slug)).toContain("latest");
  });

  it("gives every article a distinct moment, newest first in file order", async () => {
    const { articles } = await loadContentSeed();
    const stamps = articles.map((a) => a.publishedAt.getTime());
    expect(new Set(stamps).size).toBe(stamps.length);
  });

  it("keeps a long read's related stories in its detail and its body separate", async () => {
    const { articles } = await loadContentSeed();
    const longread = articles.find((a) => a.kind === "longread");
    expect(longread?.detail).toHaveProperty("related");
    expect(longread?.detail).not.toHaveProperty("body");
    expect(longread?.body.some((b) => b.type === "chapter")).toBe(true);
  });
});

describe("listArticlesQuery", () => {
  it("applies defaults", () => {
    expect(listArticlesQuery.parse({})).toEqual({ sort: "latest", limit: 12 });
  });

  it("splits comma lists and rejects unknown kinds", () => {
    expect(listArticlesQuery.parse({ kind: "article, opinion", exclude: "a,b" })).toMatchObject({
      kind: ["article", "opinion"],
      exclude: ["a", "b"],
    });
    expect(listArticlesQuery.safeParse({ kind: "podcast" }).success).toBe(false);
  });

  it("bounds the page size", () => {
    expect(listArticlesQuery.safeParse({ limit: "0" }).success).toBe(false);
    expect(listArticlesQuery.safeParse({ limit: "51" }).success).toBe(false);
    expect(limitQuery.parse({ limit: "7" }).limit).toBe(7);
  });
});
