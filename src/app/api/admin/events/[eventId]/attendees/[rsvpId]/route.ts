import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { EventRSVP } from "@/models/EventRSVP";
import { withAdminAuth, AuthenticatedAdminRequest } from "@/middleware/withAdminAuth";
import { logAdminAction } from "@/models/AdminAuditLog";
import { adminApiLimiter } from "@/lib/rateLimit";

type Params = { params: Promise<{ eventId: string; rsvpId: string }> };

export const DELETE = withAdminAuth(async (req: AuthenticatedAdminRequest, context) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  const { eventId, rsvpId } = await (context as unknown as Params).params;
  if (!mongoose.Types.ObjectId.isValid(rsvpId)) {
    return NextResponse.json({ success: false, message: "Invalid RSVP id" }, { status: 400 });
  }

  try {
    await connectDB();

    const rsvp = await EventRSVP.findOneAndDelete({ _id: rsvpId, event: eventId });
    if (!rsvp) {
      return NextResponse.json({ success: false, message: "RSVP not found" }, { status: 404 });
    }

    await logAdminAction({
      adminId: req.admin._id,
      adminEmail: req.admin.email,
      action: "event.attendee_remove",
      targetType: "Event",
      targetId: eventId,
      metadata: { userId: String(rsvp.user) },
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    return NextResponse.json({ success: true, message: "Attendee removed" });
  } catch (error) {
    console.error("[admin event attendee remove] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to remove attendee" },
      { status: 500 }
    );
  }
});
