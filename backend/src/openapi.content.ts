/** OpenAPI entries for the public read API (phase 2). Merged into `openapi.ts`. */

const notFound = { description: "Unknown slug", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } };
const slug = { name: "slug", in: "path", required: true, schema: { type: "string" } } as const;
const limit = (max: number, def: number) =>
  ({ name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: max, default: def } }) as const;
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const list = (name: string) => ({ type: "array", items: ref(name) });
const ok = (schema: object, description = "ok") => ({ description, content: { "application/json": { schema: { type: "object", properties: { data: schema } } } } });

export const contentSchemas = {
  Author: {
    type: "object",
    properties: {
      slug: { type: "string" },
      name: { type: "string" },
      initials: { type: "string" },
      role: { type: "string" },
      since: { type: "integer" },
      bio: { type: "string" },
      portrait: { type: "string" },
      count: { type: "integer", description: "Published articles (list and detail only)" },
    },
  },
  Section: {
    type: "object",
    properties: {
      slug: { type: "string" },
      name: { type: "string" },
      blurb: { type: "string" },
      count: { type: "integer", description: "Published articles on this desk (`latest`: all of them); list and detail only" },
    },
  },
  Topic: {
    type: "object",
    properties: {
      slug: { type: "string" },
      name: { type: "string" },
      blurb: { type: "string" },
      related: { type: "array", items: { type: "string" } },
      count: { type: "integer" },
    },
  },
  ArticleSummary: {
    type: "object",
    properties: {
      slug: { type: "string" },
      kind: { type: "string", enum: ["article", "opinion", "video", "longread", "interview"] },
      section: { type: "string" },
      title: { type: "string" },
      standfirst: { type: "string" },
      author: { type: "string" },
      date: { type: "string", format: "date" },
      mins: { type: "integer" },
      image: { type: "string" },
      tags: { type: "array", items: { type: "string" } },
      views: { type: "integer" },
      comments: { type: "integer" },
      trend: { type: "string", enum: ["up", "down", "flat"] },
      authorRef: ref("Author"),
      sectionRef: ref("Section"),
    },
  },
  ArticlePage: {
    type: "object",
    description: "Everything an article page draws. `body` is a list of typed blocks (see web/src/types/content.ts BodyBlock); `recirc` blocks arrive with their stories resolved.",
    properties: {
      kind: { type: "string" },
      article: ref("ArticleSummary"),
      detail: { type: "object", description: "Page-level copy (hero alt/caption, long-read eyebrow …)" },
      body: { type: "array", items: { type: "object" } },
      tags: { type: "array", items: { type: "object", properties: { slug: { type: "string" }, name: { type: "string" } } } },
      related: list("ArticleSummary"),
      moreByAuthor: list("ArticleSummary"),
      chapters: { type: "array", items: { type: "object", properties: { id: { type: "string" }, title: { type: "string" } } }, description: "Long reads only" },
    },
  },
} as const;

export const contentPaths = {
  "/sections": { get: { summary: "Desks in navigation order (`latest` first)", responses: { "200": ok(list("Section")) } } },
  "/sections/{slug}": { get: { summary: "One desk", parameters: [slug], responses: { "200": ok(ref("Section")), "404": notFound } } },
  "/topics": { get: { summary: "Topics with their published-article count", responses: { "200": ok(list("Topic")) } } },
  "/topics/{slug}": { get: { summary: "One topic", parameters: [slug], responses: { "200": ok(ref("Topic")), "404": notFound } } },
  "/authors": { get: { summary: "Bylines with their published-article count", responses: { "200": ok(list("Author")) } } },
  "/authors/{slug}": { get: { summary: "One byline", parameters: [slug], responses: { "200": ok(ref("Author")), "404": notFound } } },
  "/articles": {
    get: {
      summary: "Published articles, keyset-paginated",
      description: "Pass `page.nextCursor` back as `cursor` for the next page. Cacheable by a CDN (`s-maxage=60`).",
      parameters: [
        { name: "section", in: "query", schema: { type: "string" }, description: "Desk slug; `latest` means every desk" },
        { name: "author", in: "query", schema: { type: "string" } },
        { name: "topic", in: "query", schema: { type: "string" } },
        { name: "kind", in: "query", schema: { type: "string" }, description: "Comma-separated kinds, e.g. `article,opinion`" },
        { name: "exclude", in: "query", schema: { type: "string" }, description: "Comma-separated slugs to leave out" },
        { name: "sort", in: "query", schema: { type: "string", enum: ["latest", "popular", "discussed"], default: "latest" } },
        limit(50, 12),
        { name: "cursor", in: "query", schema: { type: "string" } },
      ],
      responses: {
        "200": {
          description: "ok",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { data: list("ArticleSummary"), page: { type: "object", properties: { nextCursor: { type: ["string", "null"] } } } },
              },
            },
          },
        },
        "400": { description: "VALIDATION_ERROR or INVALID_CURSOR" },
      },
    },
  },
  "/articles/{slug}": {
    get: { summary: "One article page: body, related stories, more by the author", parameters: [slug], responses: { "200": ok(ref("ArticlePage")), "404": notFound } },
  },
  "/trending": { get: { summary: "Most-read stories", parameters: [limit(20, 5)], responses: { "200": ok(list("ArticleSummary")) } } },
  "/most-discussed": { get: { summary: "Most-commented stories", parameters: [limit(20, 5)], responses: { "200": ok(list("ArticleSummary")) } } },
} as const;
