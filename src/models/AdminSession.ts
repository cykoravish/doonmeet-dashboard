import mongoose, { Document, Schema } from "mongoose";

// -------------------------
// AdminSession — one document per issued refresh token.
// Lets us revoke a single session (e.g. force-logout) or all
// sessions for an admin (e.g. after a password change) without
// needing a blocklist for short-lived access tokens.
// -------------------------
export interface IAdminSession extends Document {
  adminId: mongoose.Types.ObjectId;
  refreshTokenHash: string;
  userAgent: string | null;
  ip: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

const AdminSessionSchema = new Schema<IAdminSession>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    refreshTokenHash: { type: String, required: true, unique: true },
    userAgent: { type: String, default: null },
    ip: { type: String, default: null },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AdminSessionSchema.index({ adminId: 1 });
AdminSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL cleanup

export const AdminSession =
  mongoose.models.AdminSession ??
  mongoose.model<IAdminSession>("AdminSession", AdminSessionSchema);
