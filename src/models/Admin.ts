import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

// -------------------------
// Admin — fully separate from the doonmeet User collection.
// No admin can ever be created through a public HTTP route;
// accounts are seeded only via scripts/create-admin.ts.
// -------------------------
export interface IAdmin extends Document {
  name: string;
  email: string;
  passwordHash: string;
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const AdminSchema = new Schema<IAdmin>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    isActive: { type: Boolean, default: true },

    // --- Brute-force protection ---
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },

    lastLoginAt: { type: Date, default: null },
    lastLoginIp: { type: String, default: null },
  },
  { timestamps: true }
);

AdminSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.passwordHash);
};

AdminSchema.pre("save", async function () {
  if (!this.isModified("passwordHash")) return;
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

AdminSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const result = ret as unknown as Record<string, unknown>;
    delete result.passwordHash;
    delete result.__v;
    return result;
  },
});

export const Admin = mongoose.models.Admin ?? mongoose.model<IAdmin>("Admin", AdminSchema);
