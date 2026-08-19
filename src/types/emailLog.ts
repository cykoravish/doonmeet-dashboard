export type EmailLogType = "verification" | "password_reset" | "new_dm" | "inactivity_reminder";
export type EmailLogStatus = "sent" | "failed";

export interface EmailLogEntry {
  _id: string;
  recipient: string | null;
  recipientEmail: string;
  type: EmailLogType;
  subject: string;
  status: EmailLogStatus;
  errorMessage: string | null;
  createdAt: string;
}
