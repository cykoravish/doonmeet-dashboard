import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { EmailLog } from "@/models/EmailLog";
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
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    const query: Record<string, unknown> = {};
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.recipientEmail = regex;
    }
    if (type && type !== "all") query.type = type;
    if (status && status !== "all") query.status = status;

    const [entries, total] = await Promise.all([
      EmailLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      EmailLog.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      entries,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    console.error("[admin email-logs] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch email logs" },
      { status: 500 }
    );
  }
});
