import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Location } from "@/models/Location";
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
    const visibility = searchParams.get("visibility"); // visible | hidden

    let query: Record<string, unknown> = {};

    if (visibility === "visible") query.isVisible = true;
    if (visibility === "hidden") query.isVisible = false;

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const matchingUsers = await User.find({ $or: [{ name: regex }, { email: regex }] })
        .select("_id")
        .lean();
      const userIds = matchingUsers.map((u) => u._id);
      query = { ...query, user: { $in: userIds } };
    }

    const [locations, total, visibleCount, hiddenCount] = await Promise.all([
      Location.find(query)
        .populate("user", "name email avatar isActive")
        .sort({ checkedInAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Location.countDocuments(query),
      Location.countDocuments({ isVisible: true }),
      Location.countDocuments({ isVisible: false }),
    ]);

    return NextResponse.json({
      success: true,
      locations,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
      stats: { total: visibleCount + hiddenCount, visible: visibleCount, hidden: hiddenCount },
    });
  } catch (error) {
    console.error("[admin locations list] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch locations" },
      { status: 500 }
    );
  }
});
