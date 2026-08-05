import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { RoomMessage } from "@/models/RoomMessage";
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
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 30)));
    const search = searchParams.get("search")?.trim();

    let query: Record<string, unknown> = {};

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const matchingUsers = await User.find({ name: regex }).select("_id").lean();
      const userIds = matchingUsers.map((u) => u._id);
      query = { $or: [{ content: regex }, { sender: { $in: userIds } }] };
    }

    const [messages, total] = await Promise.all([
      RoomMessage.find(query)
        .populate("sender", "name email avatar")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      RoomMessage.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      messages,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    console.error("[admin room messages] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch messages" },
      { status: 500 }
    );
  }
});
