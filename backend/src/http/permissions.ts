/**
 * Who may do what — the one place. Every back-office route asks `can("…")`
 * instead of naming roles, and the Roles page in the back office prints this
 * very table, so the screen and the guards cannot disagree.
 *
 * Roles only grow: writer ⊂ editor ⊂ admin. A reader has no back-office
 * permission at all (their own account is guarded by being signed in).
 *
 * Ownership rules live next to the data, not here: a writer's "write articles"
 * means *their own* (see articles.service), and nobody can change their own role.
 */
import type { RequestHandler } from "express";
import { requireRole } from "./auth.js";
import { ROLES, type Role } from "../models/user.model.js";

const STAFF: Role[] = ["writer", "editor", "admin"];
const EDITORIAL: Role[] = ["editor", "admin"];
const ADMIN: Role[] = ["admin"];

export const PERMISSIONS = {
  "backoffice.enter": { roles: STAFF, group: "access", note: "Sign in to the back office" },
  "stats.view": { roles: STAFF, group: "access", note: "The overview (writers see only their own stories)" },

  "articles.write": { roles: STAFF, group: "stories", note: "Draft and edit articles (writers: their own)" },
  "articles.publish": { roles: EDITORIAL, group: "stories", note: "Publish, schedule or archive any article" },
  "articles.delete": { roles: ADMIN, group: "stories", note: "Delete an article for good" },
  "media.upload": { roles: STAFF, group: "stories", note: "Upload and reuse images" },
  "directories.manage": { roles: EDITORIAL, group: "stories", note: "Desks, bylines and topics" },
  "frontpage.edit": { roles: EDITORIAL, group: "stories", note: "Choose what leads the front page" },

  "comments.moderate": { roles: EDITORIAL, group: "readers", note: "Approve or remove held and reported comments" },
  "reports.manage": { roles: EDITORIAL, group: "readers", note: "Resolve broken-link reports" },
  "searches.view": { roles: EDITORIAL, group: "readers", note: "See what readers search for" },
  "newsletter.manage": { roles: EDITORIAL, group: "readers", note: "Build, schedule and send Dispatch issues; see subscribers" },
  "newsletter.erase": { roles: ADMIN, group: "readers", note: "Erase a subscriber's address" },

  "users.manage": { roles: ADMIN, group: "administration", note: "Change anyone's role or suspend an account" },
  "audit.view": { roles: ADMIN, group: "administration", note: "Read the audit trail" },
  "permissions.view": { roles: ADMIN, group: "administration", note: "This table" },
} as const satisfies Record<string, { roles: readonly Role[]; group: string; note: string }>;

export type Permission = keyof typeof PERMISSIONS;

/** Route guard. Mount after `requireAuth`. */
export const can = (permission: Permission): RequestHandler => requireRole(...PERMISSIONS[permission].roles);

export const roleHas = (role: Role, permission: Permission): boolean =>
  (PERMISSIONS[permission].roles as readonly Role[]).includes(role);

/** What the Roles page shows: every role, every permission, who holds it. */
export function permissionMatrix() {
  return {
    roles: ROLES.map((role) => ({ role, permissions: (Object.keys(PERMISSIONS) as Permission[]).filter((p) => roleHas(role, p)) })),
    permissions: (Object.keys(PERMISSIONS) as Permission[]).map((key) => ({
      key,
      group: PERMISSIONS[key].group,
      note: PERMISSIONS[key].note,
      roles: [...PERMISSIONS[key].roles],
    })),
  };
}
