import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Session } from "@/models/Session";
import { withAdminAuth, AuthenticatedAdminRequest } from "@/middleware/withAdminAuth";
import { logAdminAction } from "@/models/AdminAuditLog";
import { adminApiLimiter } from "@/lib/rateLimit";

type Params = { params: Promise<{ userId: string; sessionId: string }> };

export const DELETE = withAdminAuth(async (req: AuthenticatedAdminRequest, context) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  const { userId, sessionId } = await (context as unknown as Params).params;
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    return NextResponse.json({ success: false, message: "Invalid session id" }, { status: 400 });
  }

  try {
    await connectDB();
    const session = await Session.findOneAndDelete({ _id: sessionId, userId });

    if (!session) {
      return NextResponse.json({ success: false, message: "Session not found" }, { status: 404 });
    }

    await logAdminAction({
      adminId: req.admin._id,
      adminEmail: req.admin.email,
      action: "user.session_revoke",
      targetType: "User",
      targetId: userId,
      metadata: { sessionId },
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    return NextResponse.json({ success: true, message: "Session revoked" });
  } catch (error) {
    console.error("[admin session revoke] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to revoke session" },
      { status: 500 }
    );
  }
});
