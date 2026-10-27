import type { Request, Response } from "express";
import { adminPaths, adminTags } from "./openapi.admin.js";
import { commentsPaths, commentsSchemas, commentsTags } from "./openapi.comments.js";
import { contentPaths, contentSchemas } from "./openapi.content.js";
import { engagementPaths, engagementTags } from "./openapi.engagement.js";
import { newsletterPaths, newsletterTags } from "./openapi.newsletter.js";
import { placementPaths } from "./openapi.placements.js";
import { searchPaths } from "./openapi.search.js";

/** Hand-written OpenAPI for the implemented surface (`/api/v1/openapi.json`). */
export const openapiDocument = {
  openapi: "3.1.0",
  info: {
    title: "NOVA API",
    version: "0.9.1 (phases 0-9: + account settings, overview, permission table)",
    description: [
      "Authentication and public content endpoints for the NOVA news platform.",
      "Access token (15 min) and refresh token ride httpOnly cookies: `nova_at` and `nova_rt` (path /api/v1/auth).",
      "All failures use the envelope `{ error: { code, message, details? } }`.",
    ].join(" "),
  },
  servers: [
    {
      url: "/api/v1",
      description: "Same-origin via the Next rewrite in development; Vercel in production.",
    },
  ],
  tags: [...adminTags, ...engagementTags, ...commentsTags, ...newsletterTags],
  components: {
    securitySchemes: { cookieAuth: { type: "apiKey", in: "cookie", name: "nova_at", description: "Access token cookie set by /auth/login (a Bearer token also works for tools)" } },
    schemas: {
      ...contentSchemas,
      ...commentsSchemas,
      ErrorEnvelope: {
        type: "object",
        properties: { error: { type: "object", properties: { code: { type: "string" }, message: { type: "string" }, details: {} } } },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          role: { type: "string", enum: ["reader", "writer", "editor", "admin"] },
          status: { type: "string", enum: ["active", "suspended"] },
          emailVerified: { type: "boolean" },
        },
      },
    },
  },
  paths: {
    ...contentPaths,
    ...adminPaths,
    ...engagementPaths,
    ...commentsPaths,
    ...placementPaths,
    ...newsletterPaths,
    ...searchPaths,
    "/health": {
      get: { summary: "Liveness", responses: { "200": { description: "ok" }, "default": { description: "error envelope" } } },
    },
    "/health/db": {
      get: { summary: "Readiness (Mongo ping)", responses: { "200": { description: "ok" }, "503": { description: "db unreachable" } } },
    },
    "/auth/me/export": {
      get: {
        summary: "Everything held about the signed-in reader, as a JSON download",
        description:
          "Account, sessions, saves, likes, follows, collections, comments, reading history, uploaded images and the Dispatch subscription on the account's address. Never includes secrets (password or token hashes).",
        security: [{ cookieAuth: [] }],
        responses: { "200": { description: "`{ data: { … } }` with `Content-Disposition: attachment`" }, "401": { description: "Not signed in" } },
      },
    },
    "/auth/me/sessions": {
      get: {
        summary: "The devices signed in to this account",
        description: "Unrevoked, unexpired sessions, newest activity first; `current` marks the caller's own. Never includes token material or IP addresses.",
        security: [{ cookieAuth: [] }],
        responses: { "200": { description: "`{ data: [{ id, current, device, signedInAt, lastActiveAt }] }`" }, "401": { description: "Not signed in" } },
      },
    },
    "/auth/me/sessions/sign-out-others": {
      post: {
        summary: "Sign out every device but this one",
        security: [{ cookieAuth: [] }],
        responses: { "200": { description: "`{ data: { signedOut } }`" }, "401": { description: "Not signed in" } },
      },
    },
    "/auth/me/sessions/{id}": {
      delete: {
        summary: "Sign one device out",
        description: "Someone else's session id answers 404 DEVICE_NOT_FOUND, the same as a missing one.",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "204": { description: "Signed out" }, "404": { description: "DEVICE_NOT_FOUND" } },
      },
    },
    "/newsletter/mine": {
      get: {
        summary: "The signed-in reader's own Dispatch subscription (their account e-mail)",
        security: [{ cookieAuth: [] }],
        responses: { "200": { description: "`{ data: { email, status, frequency, topics } | null }`" }, "401": { description: "Not signed in" } },
      },
      put: {
        summary: "Subscribe, change topics/frequency, or unsubscribe — at once, with no confirmation e-mail",
        description: "A signed-in reader has proved the mailbox. `subscribed: false` leaves; omitted topics/frequency keep what was there.",
        security: [{ cookieAuth: [] }],
        responses: { "200": { description: "The subscription, or null" }, "401": { description: "Not signed in" } },
      },
    },
    "/admin/stats": {
      get: {
        summary: "The back-office overview (traffic, most read, queues, subscribers, accounts)",
        description: "`?days=7|14|30`. Traffic is distinct visitor-days from read_events (kept 90 days). Writers get only their own stories (`scope: own`); editors add queues and subscribers; admins add accounts.",
        security: [{ cookieAuth: [] }],
        responses: { "200": { description: "Overview" }, "400": { description: "A window that is not offered" }, "403": { description: "Not staff" } },
      },
    },
    "/admin/permissions": {
      get: {
        summary: "Who may do what — the table every /admin route is guarded by",
        security: [{ cookieAuth: [] }],
        responses: { "200": { description: "`{ roles: [{ role, permissions }], permissions: [{ key, group, note, roles }] }`" }, "403": { description: "Admins only" } },
      },
    },
    "/auth/register": {
      post: {
        summary: "Create an account and e-mail its 6-character verification code",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: { type: "string", minLength: 2 },
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Created; verify next" },
          "200": { description: "Existing unverified address — a fresh code was sent (`resent: true`)" },
          "409": { description: "EMAIL_TAKEN" },
          "400": { description: "VALIDATION_ERROR" },
          "429": { description: "RATE_LIMITED" },
        },
      },
    },
    "/auth/verify-email": {
      post: {
        summary: "Consume the 6-character code (letters and digits, case-insensitive; 5 wrong tries burn it)",
        responses: { "200": { description: "verified" }, "400": { description: "VERIFY_FAILED" } },
      },
    },
    "/auth/verify-email/resend": {
      post: {
        summary: "Re-send the code (never discloses whether the address exists)",
        responses: { "200": { description: "ok" } },
      },
    },
    "/auth/login": {
      post: {
        summary: "Sign in — sets nova_at + nova_rt httpOnly cookies",
        responses: {
          "200": { description: "user" },
          "401": { description: "INVALID_CREDENTIALS" },
          "403": { description: "EMAIL_NOT_VERIFIED / ACCOUNT_SUSPENDED" },
        },
      },
    },
    "/auth/refresh": {
      post: {
        summary: "Rotate the refresh session — new cookies",
        responses: { "200": { description: "user" }, "401": { description: "INVALID_REFRESH / REFRESH_REUSE" } },
      },
    },
    "/auth/logout": {
      post: { summary: "Revoke the presented session and clear cookies", responses: { "200": { description: "ok" } } },
    },
    "/auth/me": {
      get: {
        summary: "Current user (requires access cookie)",
        responses: { "200": { description: "user" }, "401": { description: "UNAUTHORIZED" } },
        security: [{ cookieAuth: [] }],
      },
      delete: {
        summary: "Delete the account (hard); sessions revoked. The password must be confirmed.",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["password"], properties: { password: { type: "string" } } } } },
        },
        responses: { "204": { description: "deleted" }, "400": { description: "WRONG_CURRENT_PASSWORD / VALIDATION_ERROR" } },
        security: [{ cookieAuth: [] }],
      },
    },
    "/auth/me/profile": {
      patch: {
        summary: "Update profile (name)",
        responses: { "200": { description: "user" } },
        security: [{ cookieAuth: [] }],
      },
    },
    "/auth/me/change-password": {
      post: {
        summary: "Change password; other sessions are revoked",
        responses: { "200": { description: "ok" }, "400": { description: "WRONG_CURRENT_PASSWORD / SAME_PASSWORD" } },
        security: [{ cookieAuth: [] }],
      },
    },
    "/auth/forgot-password": {
      post: {
        summary: "Request reset link (always answers ok)",
        responses: { "200": { description: "ok" } },
      },
    },
    "/auth/reset-password": {
      post: {
        summary: "Consume the one-hour, single-use token",
        responses: { "200": { description: "ok" }, "400": { description: "RESET_TOKEN_INVALID" } },
      },
    },
    "/openapi.json": {
      get: { summary: "This document", responses: { "200": { description: "openapi document" } } },
    },
    "/docs": {
      get: { summary: "Scalar/Redoc page for this document", responses: { "200": { description: "html" } } },
    },
  },
} as const;

/** GET /api/v1/openapi.json */
export function openapiHandler(_req: Request, res: Response): void {
  res.json(openapiDocument);
}

/** GET /api/v1/docs — Redoc standalone, CDN only, zero dependencies. */
export function docsHandler(_req: Request, res: Response): void {
  res.type("html").send(`<!doctype html>
<html><head><meta charset="utf-8"><title>NOVA API docs</title>
<style>body{margin:0;background:#F7F6F2}</style></head>
<body><redoc spec-url="/api/v1/openapi.json"></redoc>
<script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script></body></html>`);
}
