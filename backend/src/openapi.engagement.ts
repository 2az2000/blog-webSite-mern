/** OpenAPI entries for reader engagement (phase 4). Merged into `openapi.ts`. */

const err = (description: string) => ({ description, content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } });
const slug = { name: "slug", in: "path", required: true, schema: { type: "string" } } as const;
const id = { name: "id", in: "path", required: true, schema: { type: "string", pattern: "^[a-f0-9]{24}$" } } as const;
const kind = { name: "kind", in: "path", required: true, schema: { type: "string", enum: ["author", "topic"] } } as const;
const ok = (description = "ok") => ({ description });
const session = [{ cookieAuth: [] }];
const tags = ["reader"];
const body = (properties: object, required: string[] = []) => ({
  required: true,
  content: { "application/json": { schema: { type: "object", required, properties } } },
});
const paging = [
  { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
  { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 50 } },
] as const;

export const engagementTags = [
  { name: "reader", description: "What readers do with articles. Private to the caller: never cached." },
] as const;

export const engagementPaths = {
  "/articles/{slug}/view": {
    post: {
      tags,
      summary: "Count a view (once per visitor per article per day)",
      description:
        "Works for anyone. Crawlers and requests with no browser are ignored. An anonymous visitor is a salted hash of address and browser that changes daily — no address is stored.",
      parameters: [slug],
      responses: { "200": ok("`{ data: { counted } }`"), "404": err("ARTICLE_NOT_FOUND") },
    },
  },
  "/articles/{slug}/read": {
    post: {
      tags,
      summary: "Record a finished read (the reader reached the end)",
      description: "Counted once per visitor per article per day; it also counts the day's view. Finished reads of the last 7 days rank `/trending`.",
      parameters: [slug],
      responses: { "200": ok("`{ data: { counted } }`"), "404": err("ARTICLE_NOT_FOUND") },
    },
  },
  "/articles/{slug}/engagement": {
    get: {
      tags,
      summary: "Counts for the article, plus the signed-in reader's own state",
      parameters: [slug],
      responses: { "200": ok("`{ views, likes, reads, comments, viewer: { liked, bookmarked } | null }`"), "404": err("ARTICLE_NOT_FOUND") },
    },
  },
  "/articles/{slug}/like": {
    put: { tags, security: session, summary: "Like (idempotent)", parameters: [slug], responses: { "200": ok("`{ liked, likes }`"), "401": err("Not signed in"), "404": err("ARTICLE_NOT_FOUND") } },
    delete: { tags, security: session, summary: "Take the like back (idempotent)", parameters: [slug], responses: { "200": ok("`{ liked, likes }`"), "401": err("Not signed in") } },
  },
  "/me/bookmarks": {
    get: { tags, security: session, summary: "The reading list, newest saved first (full article summaries)", parameters: [...paging], responses: { "200": ok("`{ data: summaries, page: { total, page, limit } }`"), "401": err("Not signed in") } },
  },
  "/me/bookmarks/{slug}": {
    put: { tags, security: session, summary: "Save an article (idempotent; at most 1000)", parameters: [slug], responses: { "200": ok("`{ saved }`"), "404": err("ARTICLE_NOT_FOUND"), "409": err("LIST_FULL") } },
    delete: { tags, security: session, summary: "Remove from the reading list (idempotent)", parameters: [slug], responses: { "200": ok("`{ saved }`") } },
  },
  "/me/bookmarks/sync": {
    post: {
      tags,
      security: session,
      summary: "Merge the reading list a browser kept locally into the account",
      description: "The first slug becomes the newest. Unknown, unpublished and already-saved slugs are skipped. Call it once after sign-in, then read `/me/bookmarks`.",
      requestBody: body({ slugs: { type: "array", maxItems: 200, items: { type: "string" } } }, ["slugs"]),
      responses: { "200": ok("`{ added }`"), "400": err("VALIDATION_ERROR") },
    },
  },
  "/me/collections": {
    get: { tags, security: session, summary: "The reader's collections (name and size)", responses: { "200": ok() } },
    post: { tags, security: session, summary: "Create a collection (at most 20)", requestBody: body({ name: { type: "string", maxLength: 60 } }, ["name"]), responses: { "201": ok(), "409": err("LIST_FULL") } },
  },
  "/me/collections/{id}": {
    get: { tags, security: session, summary: "One collection with its article summaries", parameters: [id], responses: { "200": ok(), "404": err("COLLECTION_NOT_FOUND") } },
    patch: { tags, security: session, summary: "Rename", parameters: [id], requestBody: body({ name: { type: "string" } }, ["name"]), responses: { "200": ok(), "404": err("COLLECTION_NOT_FOUND") } },
    delete: { tags, security: session, summary: "Delete", parameters: [id], responses: { "204": ok(), "404": err("COLLECTION_NOT_FOUND") } },
  },
  "/me/collections/{id}/articles/{slug}": {
    put: { tags, security: session, summary: "Add an article (idempotent; at most 200 per collection)", parameters: [id, slug], responses: { "200": ok(), "404": err("COLLECTION_NOT_FOUND · ARTICLE_NOT_FOUND"), "409": err("LIST_FULL") } },
    delete: { tags, security: session, summary: "Remove an article", parameters: [id, slug], responses: { "200": ok() } },
  },
  "/me/follows": { get: { tags, security: session, summary: "Authors and topics the reader follows", responses: { "200": ok("`{ authors: [{slug,name}], topics: [{slug,name}] }`") } } },
  "/me/follows/{kind}/{slug}": {
    put: { tags, security: session, summary: "Follow an author or a topic (idempotent; at most 200)", parameters: [kind, slug], responses: { "200": ok("`{ following, followers }`"), "404": err("AUTHOR_NOT_FOUND · TOPIC_NOT_FOUND"), "409": err("LIST_FULL") } },
    delete: { tags, security: session, summary: "Unfollow", parameters: [kind, slug], responses: { "200": ok("`{ following, followers }`") } },
  },
  "/me/history": {
    get: { tags, security: session, summary: "Recently viewed, newest first (kept 90 days)", parameters: [{ name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 30 } }], responses: { "200": ok() } },
    delete: { tags, security: session, summary: "Forget what I read", responses: { "204": ok() } },
  },
  "/reports/broken-link": {
    post: {
      tags,
      summary: "Report a page address that led nowhere (the 404 page's button)",
      description: "Anonymous. Repeats of the same path raise its count; a new report reopens a resolved one. Editors read them at `GET /admin/reports`.",
      requestBody: body({ path: { type: "string", example: "/article/old-story" }, referrer: { type: "string" } }, ["path"]),
      responses: { "202": ok("accepted"), "400": err("INVALID_PATH · VALIDATION_ERROR"), "429": err("RATE_LIMITED") },
    },
  },
  "/admin/reports": {
    get: { tags: ["admin"], security: session, summary: "Broken-link reports, most reported first (editor, admin)", parameters: [{ name: "resolved", in: "query", schema: { type: "string", enum: ["true", "false"] } }, ...paging], responses: { "200": ok() } },
  },
  "/admin/reports/{id}/resolve": {
    post: { tags: ["admin"], security: session, summary: "Mark a report fixed (editor, admin)", parameters: [id], responses: { "204": ok(), "404": err("REPORT_NOT_FOUND") } },
  },
} as const;
