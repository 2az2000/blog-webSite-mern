/** OpenAPI entries for the admin API (phase 3). Merged into `openapi.ts`. */

const err = (description: string) => ({ description, content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } });
const id = { name: "id", in: "path", required: true, schema: { type: "string", pattern: "^[a-f0-9]{24}$" } } as const;
const slug = { name: "slug", in: "path", required: true, schema: { type: "string" } } as const;
const version = { name: "version", in: "path", required: true, schema: { type: "integer", minimum: 1 } } as const;
const paging = [
  { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
  { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
] as const;
const json = (properties: object, required: string[] = []) => ({
  required: true,
  content: { "application/json": { schema: { type: "object", required, properties } } },
});
const ok = (description = "ok") => ({ description });
const staff = [{ cookieAuth: [] }];

export const adminTags = [
  { name: "admin", description: "Back office. Needs a staff role: writer, editor or admin. Never cached." },
] as const;

export const adminPaths = {
  "/admin/articles": {
    get: {
      tags: ["admin"],
      security: staff,
      summary: "Articles in the back office (writers see only their own)",
      parameters: [
        { name: "status", in: "query", schema: { type: "string", enum: ["draft", "scheduled", "published", "archived"] } },
        { name: "section", in: "query", schema: { type: "string" } },
        { name: "author", in: "query", schema: { type: "string" } },
        { name: "q", in: "query", schema: { type: "string" }, description: "Title contains (case-insensitive)" },
        ...paging,
      ],
      responses: { "200": ok("`{ data: rows, page: { total, page, limit } }`"), "401": err("Not signed in"), "403": err("Not staff") },
    },
    post: {
      tags: ["admin"],
      security: staff,
      summary: "Create a draft",
      description:
        "Only kind, section and title are required. The slug is built from the title (numbered if taken); a writer's byline defaults to the author linked to their account. status, views and ownership in the body are ignored.",
      requestBody: json({ kind: { type: "string" }, section: { type: "string" }, title: { type: "string" }, slug: { type: "string" }, author: { type: "string" }, body: { type: "array", items: { type: "object" } } }, ["kind", "section", "title"]),
      responses: { "201": ok("The full article"), "400": err("VALIDATION_ERROR · UNKNOWN_SECTION · UNKNOWN_AUTHOR · AUTHOR_REQUIRED · SLUG_REQUIRED"), "409": err("SLUG_TAKEN") },
    },
  },
  "/admin/articles/{id}": {
    get: { tags: ["admin"], security: staff, summary: "One article, complete with body and detail", parameters: [id], responses: { "200": ok(), "404": err("Missing, or not yours (writers)") } },
    patch: {
      tags: ["admin"],
      security: staff,
      summary: "Edit content (new version + revision)",
      description:
        "Send any subset of the content fields and, to detect concurrent edits, `baseVersion`. Writers: own drafts only. A live article cannot be edited into an incomplete state. The slug is locked once an article has been public.",
      parameters: [id],
      requestBody: json({ baseVersion: { type: "integer" }, title: { type: "string" }, body: { type: "array", items: { type: "object" } } }),
      responses: { "200": ok(), "403": err("ARTICLE_LOCKED"), "409": err("VERSION_CONFLICT · SLUG_TAKEN · SLUG_LOCKED"), "422": err("ARTICLE_INCOMPLETE") },
    },
    delete: { tags: ["admin"], security: staff, summary: "Delete an article and its history (admin)", parameters: [id], responses: { "204": ok("deleted"), "403": err("Not an admin") } },
  },
  "/admin/articles/{id}/status": {
    post: {
      tags: ["admin"],
      security: staff,
      summary: "Move through the workflow (editor, admin)",
      description:
        "draft → scheduled | published · scheduled → draft | published | scheduled (new time) · published → archived | draft · archived → draft | published. Going live re-validates the whole article and pings the site to revalidate.",
      parameters: [id],
      requestBody: json({ status: { type: "string", enum: ["draft", "scheduled", "published", "archived"] }, scheduledFor: { type: "string", format: "date-time" } }, ["status"]),
      responses: { "200": ok(), "400": err("SCHEDULE_TOO_SOON"), "409": err("INVALID_TRANSITION"), "422": err("ARTICLE_INCOMPLETE — details list what is missing") },
    },
  },
  "/admin/articles/{id}/revisions": { get: { tags: ["admin"], security: staff, summary: "Version history, newest first", parameters: [id], responses: { "200": ok() } } },
  "/admin/articles/{id}/revisions/{version}": { get: { tags: ["admin"], security: staff, summary: "The content as it stood at one version", parameters: [id, version], responses: { "200": ok(), "404": err("REVISION_NOT_FOUND") } } },
  "/admin/articles/{id}/revisions/{version}/restore": {
    post: { tags: ["admin"], security: staff, summary: "Restore a version's content as a new version (the slug never rolls back)", parameters: [id, version], responses: { "200": ok(), "404": err("REVISION_NOT_FOUND") } },
  },
  "/admin/authors": { post: { tags: ["admin"], security: staff, summary: "Create a byline (editor, admin)", requestBody: json({ slug: { type: "string" }, name: { type: "string" }, userId: { type: ["string", "null"] } }, ["slug", "name"]), responses: { "201": ok(), "409": err("DUPLICATE") } } },
  "/admin/authors/{slug}": {
    patch: { tags: ["admin"], security: staff, summary: "Edit a byline; `userId: null` unlinks the account (editor, admin)", parameters: [slug], requestBody: json({}), responses: { "200": ok(), "404": err("AUTHOR_NOT_FOUND") } },
    delete: { tags: ["admin"], security: staff, summary: "Delete an unused byline (editor, admin)", parameters: [slug], responses: { "204": ok(), "409": err("IN_USE") } },
  },
  "/admin/sections": { post: { tags: ["admin"], security: staff, summary: "Add a desk at the end of the navigation (editor, admin)", requestBody: json({ slug: { type: "string" }, name: { type: "string" }, order: { type: "integer" } }, ["slug", "name"]), responses: { "201": ok(), "409": err("SLUG_TAKEN") } } },
  "/admin/sections/{slug}": {
    patch: { tags: ["admin"], security: staff, summary: "Rename or reorder a desk (editor, admin)", parameters: [slug], requestBody: json({}), responses: { "200": ok() } },
    delete: { tags: ["admin"], security: staff, summary: "Delete an unused desk; `latest` is built in (editor, admin)", parameters: [slug], responses: { "204": ok(), "409": err("IN_USE · BUILT_IN") } },
  },
  "/admin/topics": { post: { tags: ["admin"], security: staff, summary: "Create a topic (editor, admin)", requestBody: json({ slug: { type: "string" }, name: { type: "string" } }, ["slug", "name"]), responses: { "201": ok(), "409": err("SLUG_TAKEN") } } },
  "/admin/topics/{slug}": {
    patch: { tags: ["admin"], security: staff, summary: "Edit a topic (editor, admin)", parameters: [slug], requestBody: json({}), responses: { "200": ok() } },
    delete: { tags: ["admin"], security: staff, summary: "Delete an unused topic (editor, admin)", parameters: [slug], responses: { "204": ok(), "409": err("IN_USE") } },
  },
  "/admin/media/sign": {
    post: {
      tags: ["admin"],
      security: staff,
      summary: "Signed parameters for a direct browser → Cloudinary upload",
      description: "The file never passes through this API and the API secret never leaves it. 503 `MEDIA_NOT_CONFIGURED` until the CLOUDINARY_* variables are set.",
      responses: { "200": ok("`{ uploadUrl, apiKey, timestamp, folder, signature }`"), "503": err("MEDIA_NOT_CONFIGURED") },
    },
  },
  "/admin/media": {
    post: { tags: ["admin"], security: staff, summary: "Record an uploaded image with its size, alt text and credit", requestBody: json({ url: { type: "string" }, width: { type: "integer" }, height: { type: "integer" }, alt: { type: "string" }, credit: { type: "string" } }, ["url", "width", "height", "alt"]), responses: { "201": ok(), "409": err("DUPLICATE") } },
    get: { tags: ["admin"], security: staff, summary: "The media library, newest first", parameters: [...paging], responses: { "200": ok() } },
  },
  "/admin/users": { get: { tags: ["admin"], security: staff, summary: "Accounts (admin)", parameters: [{ name: "role", in: "query", schema: { type: "string" } }, { name: "q", in: "query", schema: { type: "string" } }, ...paging], responses: { "200": ok() } } },
  "/admin/users/{id}": {
    patch: {
      tags: ["admin"],
      security: staff,
      summary: "Change a role or suspend/reactivate an account (admin)",
      description: "Suspending ends every session at once. Nobody can change their own role or status.",
      parameters: [id],
      requestBody: json({ role: { type: "string", enum: ["reader", "writer", "editor", "admin"] }, status: { type: "string", enum: ["active", "suspended"] } }),
      responses: { "200": ok(), "409": err("SELF_CHANGE") },
    },
  },
  "/admin/audit": { get: { tags: ["admin"], security: staff, summary: "Who changed what (admin)", parameters: [{ name: "entity", in: "query", schema: { type: "string" } }, { name: "entityId", in: "query", schema: { type: "string" } }, { name: "action", in: "query", schema: { type: "string" } }, ...paging], responses: { "200": ok() } } },
  "/internal/publish-due": {
    get: {
      tags: ["admin"],
      summary: "Publish every scheduled article whose time has come",
      description: "Called by Vercel Cron with `Authorization: Bearer $CRON_SECRET`. Closed (401) when CRON_SECRET is unset. Public reads also trigger this sweep, at most every 30 s.",
      responses: { "200": ok("`{ data: { published: [slug] } }`"), "401": err("CRON_FORBIDDEN") },
    },
  },
} as const;
