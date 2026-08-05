import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { DirectMessage } from "@/models/DirectMessage";
import { Conversation } from "@/models/Conversation";
import { withAdminAuth, AuthenticatedAdminRequest } from "@/middleware/withAdminAuth";
import { adminApiLimiter } from "@/lib/rateLimit";
import { logAdminAction } from "@/models/AdminAuditLog";

type Params = { params: Promise<{ conversationId: string }> };

export const GET = withAdminAuth(async (req: AuthenticatedAdminRequest, context) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  const { conversationId } = await (context as unknown as Params).params;
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    return NextResponse.json({ success: false, message: "Invalid conversation id" }, { status: 400 });
  }

  try {
    await connectDB();

    const conversation = await Conversation.findById(conversationId)
      .populate("participants", "name email avatar")
      .lean();

    if (!conversation) {
      return NextResponse.json({ success: false, message: "Conversation not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? 50)));

    const [messages, total] = await Promise.all([
      DirectMessage.find({ conversationId })
        .populate("sender", "name email avatar")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DirectMessage.countDocuments({ conversationId }),
    ]);

    // Accessing private DM content is sensitive — log every view, not just edits,
    // so there's an accountable trail of which admin read which conversation.
    await logAdminAction({
      adminId: req.admin._id,
      adminEmail: req.admin.email,
      action: "conversation.view",
      targetType: "Conversation",
      targetId: conversationId,
      metadata: { page },
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    return NextResponse.json({
      success: true,
      conversation,
      messages: messages.reverse(), // oldest-first for reading order
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    console.error("[admin conversation messages] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch messages" },
      { status: 500 }
    );
  }
});
