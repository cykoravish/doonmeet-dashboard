import mongoose, { Document, Schema } from "mongoose";

// -------------------------
// AdminAuditLog — append-only record of admin actions.
// Never updated or deleted through the app; only useful as a
// trail if we ever need to investigate misuse of admin access.
// -------------------------
export interface IAdminAuditLog extends Document {
  adminId: mongoose.Types.ObjectId;
  adminEmail: string;
  action: string; // e.g. "user.ban", "event.delete", "auth.login"
  targetType: string | null; // e.g. "User", "Event", "Community"
  targetId: string | null;
  metadata: Record<string, unknown>;
  ip: string | null;
  createdAt: Date;
}

const AdminAuditLogSchema = new Schema<IAdminAuditLog>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    adminEmail: { type: String, required: true },
    action: { type: String, required: true },
    targetType: { type: String, default: null },
    targetId: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AdminAuditLogSchema.index({ adminId: 1, createdAt: -1 });
AdminAuditLogSchema.index({ action: 1, createdAt: -1 });
AdminAuditLogSchema.index({ targetType: 1, targetId: 1 });

export const AdminAuditLog =
  mongoose.models.AdminAuditLog ??
  mongoose.model<IAdminAuditLog>("AdminAuditLog", AdminAuditLogSchema);

// Helper — fire-and-forget style call from route handlers
export async function logAdminAction(params: {
  adminId: mongoose.Types.ObjectId | string;
  adminEmail: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}): Promise<void> {
  try {
    await AdminAuditLog.create({
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      action: params.action,
      targetType: params.targetType ?? null,
      targetId: params.targetId ?? null,
      metadata: params.metadata ?? {},
      ip: params.ip ?? null,
    });
  } catch (err) {
    // Audit logging must never break the primary action
    console.error("[logAdminAction] failed:", err);
  }
}
