// Mirrors the EmailLog model in the main doonmeet app — this dashboard
// only ever reads from this collection, never writes to it.
import mongoose, { Document, Schema } from "mongoose";

export type EmailType =
  | "verification"
  | "password_reset"
  | "new_dm"
  | "inactivity_reminder"
  | "admin_manual";

export interface IEmailLog extends Document {
  recipient: mongoose.Types.ObjectId | null;
  recipientEmail: string;
  type: EmailType;
  subject: string;
  status: "sent" | "failed";
  errorMessage: string | null;
  createdAt: Date;
}

const EmailLogSchema = new Schema<IEmailLog>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: "User", default: null },
    recipientEmail: { type: String, required: true },
    type: {
      type: String,
      enum: ["verification", "password_reset", "new_dm", "inactivity_reminder", "admin_manual"],
      required: true,
    },
    subject: { type: String, required: true },
    status: { type: String, enum: ["sent", "failed"], required: true },
    errorMessage: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const EmailLog =
  mongoose.models.EmailLog ?? mongoose.model<IEmailLog>("EmailLog", EmailLogSchema);
