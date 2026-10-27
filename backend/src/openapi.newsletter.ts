/** OpenAPI entries for the Dispatch (phase 7). Merged into `openapi.ts`. */

const err = (description: string) => ({ description, content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } });
const ok = (description = "ok") => ({ description });
const session = [{ cookieAuth: [] }];
const tags = ["newsletter"];
const id = { name: "id", in: "path", required: true, schema: { type: "string", pattern: "^[a-f0-9]{24}$" } } as const;
const body = (properties: object, required: string[] = []) => ({
  required: true,
  content: { "application/json": { schema: { type: "object", required, properties } } },
});
const token = { token: { type: "string", description: "From the e-mail link" } };
const prefs = "`{ data: { email, status: pending|confirmed|unsubscribed, frequency: both|weekly|monthly, topics } }`";

export const newsletterTags = [
  {
    name: "newsletter",
    description:
      "The NOVA Dispatch. Subscribing needs no account and uses double opt-in; every link in an e-mail works without one. Private to the caller (no-store), except the latest issue.",
  },
] as const;

export const newsletterPaths = {
  "/newsletter/subscribe": {
    post: {
      tags,
      summary: "Ask for the Dispatch (double opt-in)",
      description:
        "Always `202 { ok: true }`, whoever the address belongs to. A new or pending address is sent a confirmation link (valid 7 days); one already subscribed is left alone. Someone who left starts over and must confirm again.",
      requestBody: body(
        {
          email: { type: "string", format: "email" },
          topics: { type: "array", items: { type: "string" }, description: "Section slugs, or `longreads`. Empty = everything" },
          frequency: { type: "string", enum: ["both", "weekly", "monthly"], default: "both" },
          source: { type: "string", description: "Where the form was, e.g. `band`" },
        },
        ["email"],
      ),
      responses: { "202": ok("accepted"), "400": err("VALIDATION_ERROR"), "429": err("RATE_LIMITED — 6 per hour per address of the caller") },
    },
  },
  "/newsletter/confirm": {
    post: { tags, summary: "Confirm from the e-mailed link", requestBody: body(token, ["token"]), responses: { "200": ok(prefs), "400": err("CONFIRM_TOKEN_INVALID · CONFIRM_TOKEN_EXPIRED") } },
  },
  "/newsletter/manage": {
    post: { tags, summary: "The preferences a manage link belongs to", requestBody: body(token, ["token"]), responses: { "200": ok(prefs), "404": err("SUBSCRIPTION_NOT_FOUND") } },
    patch: {
      tags,
      summary: "Change frequency and topics",
      description: "Frequency: `both` = Tuesday and Friday, `weekly` = Friday only, `monthly` = the long-read digest only.",
      requestBody: body({ ...token, frequency: { type: "string", enum: ["both", "weekly", "monthly"] }, topics: { type: "array", items: { type: "string" } } }, ["token"]),
      responses: { "200": ok(prefs), "404": err("SUBSCRIPTION_NOT_FOUND") },
    },
  },
  "/newsletter/unsubscribe": {
    post: {
      tags,
      summary: "Leave, in one request",
      description:
        "Token in the query with a form body (`List-Unsubscribe=One-Click`, RFC 8058 — what a mail client's own unsubscribe button sends) or as JSON `{ token }`. Idempotent.",
      parameters: [{ name: "token", in: "query", schema: { type: "string" } }],
      responses: { "200": ok(prefs), "404": err("SUBSCRIPTION_NOT_FOUND") },
    },
  },
  "/newsletter/resubscribe": {
    post: { tags, summary: "Come back after leaving (the link proves the mailbox, so no second confirmation)", requestBody: body(token, ["token"]), responses: { "200": ok(prefs) } },
  },
  "/newsletter/issues/latest": {
    get: { tags, summary: "The latest issue sent, with its stories (null before the first)", responses: { "200": ok("`{ data: { subject, note, kind, sentAt, articles } | null }`") } },
  },
  "/admin/newsletter/issues": {
    get: { tags: ["admin"], security: session, summary: "Issues, newest edit first (editor, admin)", parameters: [{ name: "page", in: "query", schema: { type: "integer" } }, { name: "limit", in: "query", schema: { type: "integer" } }], responses: { "200": ok() } },
    post: {
      tags: ["admin"],
      security: session,
      summary: "Create a draft issue (editor, admin)",
      requestBody: body(
        { kind: { type: "string", enum: ["tuesday", "friday", "monthly"] }, subject: { type: "string", maxLength: 140 }, note: { type: "string", maxLength: 3000 }, articles: { type: "array", maxItems: 8, items: { type: "string" } } },
        ["kind", "subject"],
      ),
      responses: { "201": ok(), "400": err("VALIDATION_ERROR"), "422": err("UNKNOWN_ARTICLE — only published stories") },
    },
  },
  "/admin/newsletter/issues/{id}": {
    get: { tags: ["admin"], security: session, summary: "One issue", parameters: [id], responses: { "200": ok(), "404": err("ISSUE_NOT_FOUND") } },
    patch: { tags: ["admin"], security: session, summary: "Edit a draft or scheduled issue", parameters: [id], requestBody: body({}), responses: { "200": ok(), "409": err("ISSUE_LOCKED") } },
    delete: { tags: ["admin"], security: session, summary: "Delete a draft", parameters: [id], responses: { "204": ok(), "409": err("ISSUE_LOCKED") } },
  },
  "/admin/newsletter/issues/{id}/test": {
    post: { tags: ["admin"], security: session, summary: "Send the issue to the editor's own address", parameters: [id], responses: { "200": ok("`{ to }`") } },
  },
  "/admin/newsletter/issues/{id}/schedule": {
    post: {
      tags: ["admin"],
      security: session,
      summary: "Schedule an issue (at least five minutes ahead)",
      parameters: [id],
      requestBody: body({ at: { type: "string", format: "date-time" } }, ["at"]),
      responses: { "200": ok(), "400": err("SCHEDULE_TOO_SOON"), "422": err("ISSUE_INCOMPLETE · UNKNOWN_ARTICLE") },
    },
  },
  "/admin/newsletter/issues/{id}/unschedule": { post: { tags: ["admin"], security: session, summary: "Take a schedule back (draft again)", parameters: [id], responses: { "200": ok() } } },
  "/admin/newsletter/issues/{id}/send": {
    post: {
      tags: ["admin"],
      security: session,
      summary: "Send now: starts the issue and sends its next batch of 25",
      description:
        "Call again while `status` is `sending` to send the next batch; the cron does the same. Goes only to confirmed subscribers whose frequency and topics suit the issue, once each.",
      parameters: [id],
      responses: { "200": ok("the issue with its `sent`, `failed`, `skipped` counts"), "409": err("ISSUE_LOCKED — already sent"), "422": err("ISSUE_INCOMPLETE") },
    },
  },
  "/admin/newsletter/subscribers": {
    get: {
      tags: ["admin"],
      security: session,
      summary: "Subscribers, with counts by status (editor, admin)",
      parameters: [{ name: "status", in: "query", schema: { type: "string", enum: ["pending", "confirmed", "unsubscribed"] } }, { name: "q", in: "query", schema: { type: "string" } }],
      responses: { "200": ok("`page.counts` is the number of subscribers per status") },
    },
  },
  "/admin/newsletter/subscribers/{id}": {
    delete: { tags: ["admin"], security: session, summary: "Erase an address entirely, for a request to be forgotten (admin)", parameters: [id], responses: { "204": ok() } },
  },
  "/internal/run-issues": {
    get: {
      tags: ["admin"],
      summary: "Start due scheduled issues and keep sending (cron)",
      description: "Called by Vercel Cron with `Authorization: Bearer $CRON_SECRET`; closed (401) when CRON_SECRET is unset. Sends batches for about 8 seconds, then stops and leaves the rest for the next call.",
      responses: { "200": ok("`{ data: { started, handled, pending } }`"), "401": err("CRON_FORBIDDEN") },
    },
  },
} as const;
