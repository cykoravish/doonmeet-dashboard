import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Admin } from "@/models/Admin";
import { AdminSession } from "@/models/AdminSession";
import { logAdminAction } from "@/models/AdminAuditLog";
import { ADMIN_REFRESH_COOKIE, clearAdminAuthCookies, verifyAdminRefreshToken } from "@/lib/tokens";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(ADMIN_REFRESH_COOKIE)?.value;

  try {
    if (token) {
      await connectDB();
      try {
        const payload = verifyAdminRefreshToken(token);
        const session = await AdminSession.findById(payload.sessionId);
        if (session && !session.revokedAt) {
          session.revokedAt = new Date();
          await session.save();
          const admin = await Admin.findById(payload.adminId).select("email").lean();
          await logAdminAction({
            adminId: payload.adminId,
            adminEmail: admin?.email ?? "unknown",
            action: "auth.logout",
          });
        }
      } catch {
        // Token invalid/expired — nothing to revoke, just clear cookies below
      }
    }
  } catch (error) {
    console.error("[admin logout] Error:", error);
  }

  const response = NextResponse.json({ success: true, message: "Logged out" });
  clearAdminAuthCookies(response as unknown as Response);
  return response;
}
