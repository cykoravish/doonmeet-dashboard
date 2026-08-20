// A broadcast is one admin-authored announcement fanned out to many users
// as individual Notification docs (type "announcement", refModel
// "Broadcast", refId -> this doc). This doc itself just tracks the
// message content + delivery stats for the admin dashboard's history view.
import mongoose, { Document, Schema } from "mongoose";

export interface IBroadcast extends Document {
  title: string;
  message: string;
  url: string | null;
  sentByEmail: string; // admin who sent it
  recipientCount: number;
  pushSentCount: number;
  createdAt: Date;
}

const BroadcastSchema = new Schema<IBroadcast>(
  {
    title: { type: String, required: true, maxlength: 100 },
    message: { type: String, required: true, maxlength: 500 },
    url: { type: String, default: null },
    sentByEmail: { type: String, required: true },
    recipientCount: { type: Number, default: 0 },
    pushSentCount: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

BroadcastSchema.index({ createdAt: -1 });

export const Broadcast =
  mongoose.models.Broadcast ?? mongoose.model<IBroadcast>("Broadcast", BroadcastSchema);
