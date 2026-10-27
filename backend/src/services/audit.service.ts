import type { Types } from "mongoose";
import { AuditLogModel } from "../models/audit-log.model.js";

export interface Actor {
  id: Types.ObjectId;
  role: string;
}

/** Appends one line to the audit log. A failed write must never undo the action it records. */
export async function audit(
  actor: Actor,
  action: string,
  entity: string,
  entityId: string,
  meta: Record<string, unknown> = {},
): Promise<void> {
  try {
    await AuditLogModel.create({ actor: actor.id, actorRole: actor.role, action, entity, entityId, meta });
  } catch {
    // swallowed on purpose: the audit trail is best-effort, the editorial action already happened
  }
}
