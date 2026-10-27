/** OpenAPI entries for comments (phase 5). Merged into `openapi.ts`. */

const err = (description: string) => ({ description, content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } });
const slug = { name: "slug", in: "path", required: true, schema: { type: "string" } } as const;
const id = { name: "id", in: "path", required: true, schema: { type: "string", pattern: "^[a-f0-9]{24}$" } } as const;
const ok = (description = "ok") => ({ description });
const session = [{ cookieAuth: [] }];
const tags = ["comments"];
const body = (properties: object, required: string[] = []) => ({
  required: true,
  content: { "application/json": { schema: { type: "object", required, properties } } },
});

export const commentsTags = [
  {
    name: "comments",
    description:
      "Moderated by people, not filters: a rule can only hold a comment for a moderator, never delete it. One level of replies. Private to the caller: never cached.",
  },
] as const;

export const commentsSchemas = {
  Comment: {
    type: "object",
    properties: {
      id: { type: "string" },
      parent: { type: ["string", "null"] },
      author: {
        type: ["object", "null"],
        description: "Null for a removed comment",
        properties: { name: { type: "string" }, initials: { type: "string" }, badge: { type: "string", enum: ["Author"] } },
      },
      createdAt: { type: "string", format: "date-time" },
      edited: { type: "boolean" },
      likes: { type: "integer" },
      liked: { type: "boolean", description: "The signed-in reader's own like" },
      mine: { type: "boolean" },
      pending: { type: "boolean", description: "Held for a moderator; only its author sees it" },
      body: { type: "string", description: "Plain text. Empty for a removed comment" },
      removed: {
        type: ["object", "null"],
        properties: { by: { type: "string", enum: ["moderator", "author"] }, reason: { type: "string" } },
      },
      canEdit: { type: "boolean" },
      replies: { type: "array", items: { $ref: "#/components/schemas/Comment" } },
    },
  },
} as const;

export const commentsPaths = {
  "/articles/{slug}/comments": {
    get: {
      tags,
      summary: "A thread: top-level comments with their replies (oldest first)",
      description: "Removed comments keep their slot. A signed-in reader also sees their own held comments.",
      parameters: [
        slug,
        { name: "sort", in: "query", schema: { type: "string", enum: ["new", "old", "top"], default: "new" } },
        { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 50, default: 20 } },
      ],
      responses: { "200": ok("`{ data: Comment[], page: { total, page, limit, count } }` — `count` is every published comment and reply"), "404": err("ARTICLE_NOT_FOUND") },
    },
    post: {
      tags,
      security: session,
      summary: "Post a comment or a reply",
      description:
        "Published at once unless it is held: under 10 characters, more than 2 links, or a first comment with a link. A reply to a reply joins the same thread. A reader may post 5 comments per 10 minutes.",
      parameters: [slug],
      requestBody: body({ body: { type: "string", maxLength: 2000 }, parent: { type: "string" } }, ["body"]),
      responses: {
        "201": { description: "The comment (`pending: true` if held)", content: { "application/json": { schema: { $ref: "#/components/schemas/Comment" } } } },
        "400": err("EMPTY_COMMENT · COMMENT_TOO_LONG · VALIDATION_ERROR"),
        "404": err("ARTICLE_NOT_FOUND · COMMENT_NOT_FOUND"),
        "409": err("DUPLICATE_COMMENT · PARENT_UNAVAILABLE"),
        "429": err("RATE_LIMITED"),
      },
    },
  },
  "/comments/{id}": {
    patch: {
      tags,
      security: session,
      summary: "Edit your comment — once, within a day",
      description: "Editing a comment a moderator removed reposts it: it goes back to the moderators' queue.",
      parameters: [id],
      requestBody: body({ body: { type: "string" } }, ["body"]),
      responses: { "200": ok(), "409": err("EDIT_USED · EDIT_EXPIRED · COMMENT_DELETED"), "404": err("COMMENT_NOT_FOUND") },
    },
    delete: {
      tags,
      security: session,
      summary: "Delete your comment",
      description: "Removed entirely, or — if replies hang under it — kept as an empty slot.",
      parameters: [id],
      responses: { "204": ok(), "404": err("COMMENT_NOT_FOUND") },
    },
  },
  "/comments/{id}/like": {
    put: { tags, security: session, summary: "Like (idempotent)", parameters: [id], responses: { "200": ok("`{ liked, likes }`"), "404": err("COMMENT_NOT_FOUND") } },
    delete: { tags, security: session, summary: "Take the like back (idempotent)", parameters: [id], responses: { "200": ok("`{ liked, likes }`") } },
  },
  "/comments/{id}/report": {
    post: {
      tags,
      security: session,
      summary: "Report a comment (once per reader)",
      description: "Three different readers reporting a comment pulls it back to the moderators' queue.",
      parameters: [id],
      requestBody: body({ reason: { type: "string", enum: ["spam", "abuse", "off-topic", "other"] }, note: { type: "string", maxLength: 300 } }, ["reason"]),
      responses: { "202": ok("accepted"), "409": err("OWN_COMMENT"), "404": err("COMMENT_NOT_FOUND") },
    },
  },
  "/admin/comments": {
    get: {
      tags: ["admin"],
      security: session,
      summary: "The moderators' queue (editor, admin)",
      description: "`pending` = held + reported (the default), oldest and most-reported first.",
      parameters: [
        { name: "queue", in: "query", schema: { type: "string", enum: ["pending", "held", "reported", "removed", "published"], default: "pending" } },
        { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 50, default: 20 } },
      ],
      responses: { "200": ok("body, author (name, e-mail), article, why it was held, the reports against it") },
    },
  },
  "/admin/comments/{id}/approve": {
    post: { tags: ["admin"], security: session, summary: "Publish a held or reported comment and clear its reports (editor, admin)", parameters: [id], responses: { "204": ok(), "409": err("COMMENT_DELETED"), "404": err("COMMENT_NOT_FOUND") } },
  },
  "/admin/comments/{id}/remove": {
    post: {
      tags: ["admin"],
      security: session,
      summary: "Remove a comment, stating why (editor, admin)",
      description: "The slot stays, showing the reason; the author may edit and repost once.",
      parameters: [id],
      requestBody: body({ reason: { type: "string", maxLength: 200 } }, ["reason"]),
      responses: { "204": ok(), "409": err("ALREADY_REMOVED"), "404": err("COMMENT_NOT_FOUND") },
    },
  },
} as const;
