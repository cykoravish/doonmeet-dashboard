import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { EventComment } from "@/models/EventComment";
import { Event } from "@/models/Event";
import { withAdminAuth, AuthenticatedAdminRequest } from "@/middleware/withAdminAuth";
import { logAdminAction } from "@/models/AdminAuditLog";
import { adminApiLimiter } from "@/lib/rateLimit";

type Params = { params: Promise<{ eventId: string; commentId: string }> };

export const DELETE = withAdminAuth(async (req: AuthenticatedAdminRequest, context) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  const { eventId, commentId } = await (context as unknown as Params).params;
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    return NextResponse.json({ success: false, message: "Invalid comment id" }, { status: 400 });
  }

  try {
    await connectDB();

    const comment = await EventComment.findOneAndDelete({ _id: commentId, event: eventId });
    if (!comment) {
      return NextResponse.json({ success: false, message: "Comment not found" }, { status: 404 });
    }

    await Event.findByIdAndUpdate(eventId, { $inc: { commentCount: -1 } });

    await logAdminAction({
      adminId: req.admin._id,
      adminEmail: req.admin.email,
      action: "event.comment_delete",
      targetType: "Event",
      targetId: eventId,
      metadata: { commentId },
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    return NextResponse.json({ success: true, message: "Comment deleted" });
  } catch (error) {
    console.error("[admin event comment delete] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete comment" },
      { status: 500 }
    );
  }
});
