import mongoose, { Schema, model, type Types } from "mongoose";

/** Append-only record of who changed what. Never edited or deleted by the API. */
export interface AuditLogShape {
  actor: Types.ObjectId;
  actorRole: string;
  /** Dotted verb: `article.create`, `article.status`, `user.role` … */
  action: string;
  entity: string;
  entityId: string;
  meta: Record<string, unknown>;
  createdAt: Date;
}

const auditSchema = new Schema<AuditLogShape>(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true, index: true },
    entity: { type: String, required: true },
    entityId: { type: String, required: true },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false }, minimize: false },
);

auditSchema.index({ createdAt: -1, _id: -1 });
auditSchema.index({ entity: 1, entityId: 1, createdAt: -1 });

export const AuditLogModel: mongoose.Model<AuditLogShape> =
  (mongoose.models.AuditLog as mongoose.Model<AuditLogShape> | undefined) ??
  model<AuditLogShape>("AuditLog", auditSchema, "audit_log");
