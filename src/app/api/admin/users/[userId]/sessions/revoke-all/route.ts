import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Session } from "@/models/Session";
import { withAdminAuth, AuthenticatedAdminRequest } from "@/middleware/withAdminAuth";
import { logAdminAction } from "@/models/AdminAuditLog";
import { adminApiLimiter } from "@/lib/rateLimit";

type Params = { params: Promise<{ userId: string }> };

export const POST = withAdminAuth(async (req: AuthenticatedAdminRequest, context) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  const { userId } = await (context as unknown as Params).params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ success: false, message: "Invalid user id" }, { status: 400 });
  }

  try {
    await connectDB();
    const result = await Session.deleteMany({ userId });

    await logAdminAction({
      adminId: req.admin._id,
      adminEmail: req.admin.email,
      action: "user.session_revoke_all",
      targetType: "User",
      targetId: userId,
      metadata: { count: result.deletedCount },
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    return NextResponse.json({
      success: true,
      message: `Signed out of ${result.deletedCount} session(s)`,
    });
  } catch (error) {
    console.error("[admin session revoke-all] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to revoke sessions" },
      { status: 500 }
    );
  }
});
