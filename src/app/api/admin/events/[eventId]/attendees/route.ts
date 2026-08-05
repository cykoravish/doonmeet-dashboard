import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { EventRSVP } from "@/models/EventRSVP";
import { withAdminAuth, AuthenticatedAdminRequest } from "@/middleware/withAdminAuth";
import { adminApiLimiter } from "@/lib/rateLimit";

type Params = { params: Promise<{ eventId: string }> };

export const GET = withAdminAuth(async (req: AuthenticatedAdminRequest, context) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  const { eventId } = await (context as unknown as Params).params;
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return NextResponse.json({ success: false, message: "Invalid event id" }, { status: 400 });
  }

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));

    const [attendees, total] = await Promise.all([
      EventRSVP.find({ event: eventId })
        .populate("user", "name email avatar isActive")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      EventRSVP.countDocuments({ event: eventId }),
    ]);

    return NextResponse.json({
      success: true,
      attendees,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    console.error("[admin event attendees] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch attendees" },
      { status: 500 }
    );
  }
});
