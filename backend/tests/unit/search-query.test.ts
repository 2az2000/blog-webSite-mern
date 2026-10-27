import { describe, expect, it } from "vitest";
import { normalizeQuery } from "../../src/modules/search/search.service.js";
import { popularQuery, searchQuery, termsQuery } from "../../src/modules/search/search.schemas.js";

describe("normalizeQuery", () => {
  it("lower-cases and single-spaces the words", () => {
    expect(normalizeQuery("  Artificial   INTELLIGENCE ")).toEqual({ term: "artificial intelligence", words: ["artificial", "intelligence"] });
  });

  it("drops a leading minus, which MongoDB would read as 'exclude this word'", () => {
    expect(normalizeQuery("-lithium battery").words).toEqual(["lithium", "battery"]);
    expect(normalizeQuery("--x").words).toEqual(["x"]);
  });

  it("keeps hyphens inside a word", () => {
    expect(normalizeQuery("open-source").words).toEqual(["open-source"]);
  });

  it("removes quotes and control characters, so a phrase search cannot be forced", () => {
    expect(normalizeQuery('"the grid"\u0000').words).toEqual(["the", "grid"]);
  });

  it("caps the number of words and the length of the term", () => {
    expect(normalizeQuery("a b c d e f g h i j").words).toHaveLength(8);
    expect(normalizeQuery("x".repeat(500)).term.length).toBeLessThanOrEqual(100);
  });

  it("is empty for nothing but separators", () => {
    expect(normalizeQuery(' - "" ').words).toEqual([]);
  });

  it("handles Persian text", () => {
    expect(normalizeQuery("شبکه برق").words).toEqual(["شبکه", "برق"]);
  });
});

describe("search schemas", () => {
  it("applies defaults and trims", () => {
    expect(searchQuery.parse({ q: "  grid " })).toEqual({ q: "grid", sort: "relevance", page: 1, limit: 20 });
  });

  it("requires a query and bounds paging", () => {
    expect(searchQuery.safeParse({}).success).toBe(false);
    expect(searchQuery.safeParse({ q: "   " }).success).toBe(false);
    expect(searchQuery.safeParse({ q: "x", limit: "51" }).success).toBe(false);
    expect(searchQuery.safeParse({ q: "x", sort: "best" }).success).toBe(false);
  });

  it("bounds the popular list and the editors' term list", () => {
    expect(popularQuery.parse({}).limit).toBe(7);
    expect(popularQuery.safeParse({ limit: "21" }).success).toBe(false);
    expect(termsQuery.parse({}).kind).toBe("top");
  });
});
