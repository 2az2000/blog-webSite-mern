/** OpenAPI entries for the front page's editorial placement. Merged into `openapi.ts`. */

const err = (description: string) => ({ description, content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } });
const ok = (description = "ok") => ({ description });
const slots = {
  lead: { type: "array", maxItems: 1, items: { type: "string" } },
  secondary: { type: "array", maxItems: 2, items: { type: "string" } },
  brief: { type: "array", maxItems: 4, items: { type: "string" } },
  picks: { type: "array", maxItems: 4, items: { type: "string" } },
  opinion: { type: "array", maxItems: 4, items: { type: "string" } },
  longread: { type: "array", maxItems: 1, items: { type: "string" } },
} as const;

export const placementPaths = {
  "/placements/home": {
    get: {
      tags: ["articles"],
      summary: "The front page's stories, slot by slot",
      description:
        "Stories the editors pinned, then the newest suitable stories for any slot left empty (or that lost a story because it was unpublished). The automatic fill never repeats a story already on the page. Cacheable by a CDN.",
      responses: { "200": ok("`{ data: { lead, secondary, brief, picks, opinion, longread } }` — each an array of article summaries") },
    },
  },
  "/admin/placements/home": {
    get: {
      tags: ["admin"],
      security: [{ cookieAuth: [] }],
      summary: "The pins and what is live, for the front-page editor (editor, admin)",
      responses: { "200": ok("`{ limits, pinned, live }` — `live` marks which stories are pinned and which filled themselves") },
    },
    put: {
      tags: ["admin"],
      security: [{ cookieAuth: [] }],
      summary: "Replace the pins (editor, admin)",
      description: "A slot left out is empty. Every story must be published; a story may be pinned in two slots on purpose, but not twice in one.",
      requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: slots } } } },
      responses: { "200": ok("the new state, as GET"), "400": err("VALIDATION_ERROR — too many in a slot, or a story twice in one slot"), "422": err("UNKNOWN_ARTICLE — not a published article; details name each") },
    },
  },
} as const;
