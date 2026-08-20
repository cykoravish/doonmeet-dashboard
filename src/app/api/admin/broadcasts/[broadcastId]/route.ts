import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Broadcast } from "@/models/Broadcast";
import { Notification } from "@/models/Notification";
import { withAdminAuth, AuthenticatedAdminRequest } from "@/middleware/withAdminAuth";
import { adminApiLimiter } from "@/lib/rateLimit";

export const GET = withAdminAuth(async (req: AuthenticatedAdminRequest, context) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  try {
    const { broadcastId } = await context.params;
    if (!/^[a-f\d]{24}$/i.test(broadcastId)) {
      return NextResponse.json({ success: false, message: "Invalid broadcast id." }, { status: 400 });
    }

    await connectDB();

    const broadcast = await Broadcast.findById(broadcastId).lean();
    if (!broadcast) {
      return NextResponse.json({ success: false, message: "Broadcast not found." }, { status: 404 });
    }

    // Only the readers list is needed for the detail view — an admin
    // scanning who's seen an announcement cares about who *has* read it,
    // not a full roster of everyone who hasn't.
    const readers = await Notification.find({
      refModel: "Broadcast",
      refId: broadcastId,
      isRead: true,
    })
      .populate("recipient", "name email avatar")
      .sort({ updatedAt: -1 })
      .select("recipient updatedAt")
      .lean();

    return NextResponse.json({
      success: true,
      broadcast,
      readers: readers
        .filter((r) => r.recipient) // guard against a deleted user
        .map((r) => ({
          user: r.recipient,
          readAt: r.updatedAt,
        })),
    });
  } catch (error) {
    console.error("[GET /admin/broadcasts/[id]] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch broadcast details." },
      { status: 500 }
    );
  }
});
