/** OpenAPI entries for search (phase 6). Merged into `openapi.ts`. */

const err = (description: string) => ({ description, content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } });
const ok = (description = "ok") => ({ description });

export const searchPaths = {
  "/search": {
    get: {
      tags: ["articles"],
      summary: "Search stories, authors and topics",
      description:
        "Stories use a text index (headline ≫ tags > standfirst, English stemming: `batteries` finds `battery`) and also match a writer by name. When no whole word matches, each word is retried as the start of a word (`archi` → `archive`). A leading `-` or quotes in the query are ignored. Only published stories. Cacheable by a CDN. The first page of each distinct search (relevance order, browsers only) is counted for the editors.",
      parameters: [
        { name: "q", in: "query", required: true, schema: { type: "string", minLength: 1, maxLength: 200 } },
        { name: "sort", in: "query", schema: { type: "string", enum: ["relevance", "newest", "popular"], default: "relevance" } },
        { name: "page", in: "query", schema: { type: "integer", minimum: 1, maximum: 50, default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 50, default: 20 } },
      ],
      responses: {
        "200": ok("`{ data: { articles, authors, topics }, page: { totals: { articles, authors, topics }, page, limit, term } }` — paging applies to articles; up to 20 authors and topics"),
        "400": err("VALIDATION_ERROR"),
      },
    },
  },
  "/search/popular": {
    get: {
      tags: ["articles"],
      summary: "Terms people search for that find something (suggestions)",
      parameters: [{ name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 20, default: 7 } }],
      responses: { "200": ok("`{ data: string[] }`") },
    },
  },
  "/admin/searches": {
    get: {
      tags: ["admin"],
      security: [{ cookieAuth: [] }],
      summary: "What readers search for (editor, admin)",
      description: "`kind=top` (default): most searched. `kind=empty`: terms that found no story — gaps in the coverage. Terms only; nothing about who searched.",
      parameters: [
        { name: "kind", in: "query", schema: { type: "string", enum: ["top", "empty"], default: "top" } },
        { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
      ],
      responses: { "200": ok("`{ data: [{ term, count, zeroCount, lastResults, lastAt }], page }`") },
    },
  },
} as const;
