import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { DirectMessage } from "@/models/DirectMessage";
import { withAdminAuth, AuthenticatedAdminRequest } from "@/middleware/withAdminAuth";
import { logAdminAction } from "@/models/AdminAuditLog";
import { adminApiLimiter } from "@/lib/rateLimit";

type Params = { params: Promise<{ conversationId: string; messageId: string }> };

export const DELETE = withAdminAuth(async (req: AuthenticatedAdminRequest, context) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  const { conversationId, messageId } = await (context as unknown as Params).params;
  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    return NextResponse.json({ success: false, message: "Invalid message id" }, { status: 400 });
  }

  try {
    await connectDB();

    const message = await DirectMessage.findOneAndDelete({
      _id: messageId,
      conversationId,
    });

    if (!message) {
      return NextResponse.json({ success: false, message: "Message not found" }, { status: 404 });
    }

    await logAdminAction({
      adminId: req.admin._id,
      adminEmail: req.admin.email,
      action: "conversation.message_delete",
      targetType: "Conversation",
      targetId: conversationId,
      metadata: { messageId, senderId: String(message.sender) },
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    return NextResponse.json({ success: true, message: "Message deleted" });
  } catch (error) {
    console.error("[admin conversation message delete] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete message" },
      { status: 500 }
    );
  }
});
