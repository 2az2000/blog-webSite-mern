import { describe, expect, it } from "vitest";
import {
  blocksMissingAlt,
  canEditArticle,
  canTransition,
  canViewArticle,
  defaultDetail,
  isEditorial,
  slugify,
  uniqueSlug,
} from "../../src/modules/admin/article-workflow.js";
import {
  changeStatusSchema,
  createArticleSchema,
  updateArticleSchema,
} from "../../src/modules/admin/admin.schemas.js";

describe("status workflow", () => {
  it("allows the editorial moves", () => {
    expect(canTransition("draft", "published")).toBe(true);
    expect(canTransition("draft", "scheduled")).toBe(true);
    expect(canTransition("scheduled", "scheduled")).toBe(true); // reschedule
    expect(canTransition("scheduled", "draft")).toBe(true);
    expect(canTransition("published", "archived")).toBe(true);
    expect(canTransition("published", "draft")).toBe(true); // unpublish
    expect(canTransition("archived", "published")).toBe(true);
  });

  it("refuses the rest", () => {
    expect(canTransition("draft", "archived")).toBe(false);
    expect(canTransition("draft", "draft")).toBe(false);
    expect(canTransition("published", "scheduled")).toBe(false);
    expect(canTransition("published", "published")).toBe(false);
    expect(canTransition("archived", "scheduled")).toBe(false);
  });
});

describe("permissions", () => {
  const writer = { id: "w1", role: "writer" };
  const own = { createdBy: { toString: () => "w1" }, status: "draft" as const };

  it("lets a writer edit only their own drafts", () => {
    expect(canEditArticle(writer, own)).toBe(true);
    expect(canEditArticle(writer, { ...own, status: "published" })).toBe(false);
    expect(canEditArticle(writer, { ...own, createdBy: { toString: () => "w2" } })).toBe(false);
    expect(canEditArticle(writer, { status: "draft" })).toBe(false);
  });

  it("lets editors and admins edit anything, readers nothing", () => {
    expect(canEditArticle({ id: "e", role: "editor" }, { status: "archived" })).toBe(true);
    expect(canEditArticle({ id: "a", role: "admin" }, { status: "published" })).toBe(true);
    expect(canEditArticle({ id: "r", role: "reader" }, own)).toBe(false);
    expect(isEditorial("writer")).toBe(false);
  });

  it("hides other people's articles from writers", () => {
    expect(canViewArticle(writer, own)).toBe(true);
    expect(canViewArticle(writer, { createdBy: { toString: () => "w2" } })).toBe(false);
    expect(canViewArticle({ id: "e", role: "editor" }, { createdBy: { toString: () => "w2" } })).toBe(true);
  });
});

describe("slugs", () => {
  it("builds a url-safe slug", () => {
    expect(slugify("Why the Next Generation of Software Will Be Built Around Context")).toBe(
      "why-the-next-generation-of-software-will-be-built-around-context",
    );
    expect(slugify("  Café — “Déjà vu”: it's 100%!  ")).toBe("cafe-deja-vu-its-100");
  });

  it("returns empty when the title has no Latin letters", () => {
    expect(slugify("سرمقاله")).toBe("");
  });

  it("never ends on a hyphen after truncation", () => {
    expect(slugify("a ".repeat(60))).not.toMatch(/-$/);
  });

  it("finds the first free suffix", () => {
    expect(uniqueSlug("story", new Set())).toBe("story");
    expect(uniqueSlug("story", new Set(["story"]))).toBe("story-2");
    expect(uniqueSlug("story", new Set(["story", "story-2", "story-3"]))).toBe("story-4");
  });
});

describe("admin schemas", () => {
  it("needs only the identity of a new article", () => {
    expect(createArticleSchema.safeParse({ kind: "article", section: "technology", title: "Hello" }).success).toBe(true);
    expect(createArticleSchema.safeParse({ kind: "article", section: "technology" }).success).toBe(false);
  });

  it("strips fields a client must not set", () => {
    const parsed = createArticleSchema.parse({
      kind: "article",
      section: "technology",
      title: "Hello",
      status: "published",
      views: 1_000_000,
      createdBy: "x",
    });
    expect(parsed).not.toHaveProperty("status");
    expect(parsed).not.toHaveProperty("views");
    expect(parsed).not.toHaveProperty("createdBy");
  });

  it("does not turn an update into a reset", () => {
    // a partial update must contain only what was sent, never defaults
    expect(updateArticleSchema.parse({ title: "New" })).toEqual({ title: "New" });
    expect(updateArticleSchema.safeParse({}).success).toBe(false);
    expect(updateArticleSchema.safeParse({ baseVersion: 2 }).success).toBe(false);
  });

  it("requires a time to schedule", () => {
    expect(changeStatusSchema.safeParse({ status: "scheduled" }).success).toBe(false);
    expect(changeStatusSchema.safeParse({ status: "scheduled", scheduledFor: "2030-01-01T00:00:00Z" }).success).toBe(true);
    expect(changeStatusSchema.safeParse({ status: "published" }).success).toBe(true);
  });
});

describe("default page copy", () => {
  it("starts each kind with a complete detail the public contract accepts once filled", async () => {
    const { articleDetailSchema, longformDetailSchema } = await import("../../src/modules/content/content.schemas.js");
    expect(articleDetailSchema.safeParse(defaultDetail("article", "technology")).success).toBe(true);
    expect(longformDetailSchema.safeParse(defaultDetail("longread", "society")).success).toBe(false); // eyebrow must be written
    expect(defaultDetail("longread", "society")).toMatchObject({ relatedSection: "society", related: [] });
  });
});

describe("pictures nobody described", () => {
  const fig = (extra: object) => ({ type: "figure", src: "/a.jpg", width: 10, height: 10, caption: "", ...extra });

  it("names every figure and break without alt text", () => {
    const body = [{ type: "p", text: "x" }, fig({ alt: "A drawing of a grid" }), fig({ alt: "   " }), { type: "break", src: "/b.jpg", alt: "", width: 1, height: 1, caption: "", credit: "" }];
    expect(blocksMissingAlt(body)).toEqual(["body.2.alt", "body.3.alt"]);
  });

  it("lets a decorative image go without a description", () => {
    expect(blocksMissingAlt([fig({ alt: "", decorative: true })])).toEqual([]);
  });

  it("says nothing about a body with no pictures", () => {
    expect(blocksMissingAlt([{ type: "p", text: "x" }])).toEqual([]);
  });
});
