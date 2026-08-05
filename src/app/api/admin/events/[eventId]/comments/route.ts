import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { EventComment } from "@/models/EventComment";
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

    const [comments, total] = await Promise.all([
      EventComment.find({ event: eventId })
        .populate("author", "name email avatar")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      EventComment.countDocuments({ event: eventId }),
    ]);

    return NextResponse.json({
      success: true,
      comments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    console.error("[admin event comments] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch comments" },
      { status: 500 }
    );
  }
});
