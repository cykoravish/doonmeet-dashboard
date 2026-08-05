import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import { withAdminAuth, AuthenticatedAdminRequest } from "@/middleware/withAdminAuth";
import { adminApiLimiter } from "@/lib/rateLimit";

export const GET = withAdminAuth(async (req: AuthenticatedAdminRequest) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 40)));
    const search = searchParams.get("search")?.trim();
    const action = searchParams.get("action");

    const query: Record<string, unknown> = {};
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ adminEmail: regex }, { targetId: regex }, { action: regex }];
    }
    if (action && action !== "all") query.action = action;

    const [entries, total, distinctActions] = await Promise.all([
      AdminAuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AdminAuditLog.countDocuments(query),
      AdminAuditLog.distinct("action"),
    ]);

    return NextResponse.json({
      success: true,
      entries,
      actions: distinctActions.sort(),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    console.error("[admin audit log] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch audit log" },
      { status: 500 }
    );
  }
});
