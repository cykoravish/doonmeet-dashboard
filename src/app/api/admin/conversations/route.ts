import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Conversation } from "@/models/Conversation";
import { User } from "@/models/User";
import { withAdminAuth, AuthenticatedAdminRequest } from "@/middleware/withAdminAuth";
import { adminApiLimiter } from "@/lib/rateLimit";

export const GET = withAdminAuth(async (req: AuthenticatedAdminRequest) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));
    const search = searchParams.get("search")?.trim();

    let participantFilter: Record<string, unknown> = {};

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const matchingUsers = await User.find({ $or: [{ name: regex }, { email: regex }] })
        .select("_id")
        .lean();
      const userIds = matchingUsers.map((u) => u._id);
      if (userIds.length === 0) {
        return NextResponse.json({
          success: true,
          conversations: [],
          pagination: { page, limit, total: 0, totalPages: 1 },
        });
      }
      participantFilter = { participants: { $in: userIds } };
    }

    const [conversations, total] = await Promise.all([
      Conversation.find(participantFilter)
        .populate("participants", "name email avatar isActive")
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Conversation.countDocuments(participantFilter),
    ]);

    return NextResponse.json({
      success: true,
      conversations,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    console.error("[admin conversations list] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
});
