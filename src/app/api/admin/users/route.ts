import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
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
    const status = searchParams.get("status"); // active | banned | guest | unverified
    const sortBy = searchParams.get("sortBy") ?? "createdAt";
    const sortDir = searchParams.get("sortDir") === "asc" ? 1 : -1;

    const query: Record<string, unknown> = {};

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    }

    if (status === "active") query.isActive = true;
    if (status === "banned") query.isActive = false;
    if (status === "guest") query.isGuest = true;
    if (status === "unverified") query.isVerified = false;

    const allowedSort = new Set(["createdAt", "lastSeenAt", "name"]);
    const sortField = allowedSort.has(sortBy) ? sortBy : "createdAt";

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-passwordHash -googleId -verificationToken -resetPasswordToken")
        .sort({ [sortField]: sortDir })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error("[admin users list] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch users" },
      { status: 500 }
    );
  }
});
