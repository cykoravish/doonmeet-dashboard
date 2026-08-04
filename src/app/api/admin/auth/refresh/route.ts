import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Admin } from "@/models/Admin";
import { AdminSession } from "@/models/AdminSession";
import {
  ADMIN_REFRESH_COOKIE,
  generateAdminAccessToken,
  generateAdminRefreshToken,
  hashToken,
  setAdminAuthCookies,
  verifyAdminRefreshToken,
  clearAdminAuthCookies,
} from "@/lib/tokens";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(ADMIN_REFRESH_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ success: false, message: "No refresh token" }, { status: 401 });
  }

  try {
    const payload = verifyAdminRefreshToken(token);

    await connectDB();

    const session = await AdminSession.findById(payload.sessionId);

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() < Date.now() ||
      session.refreshTokenHash !== hashToken(token)
    ) {
      const response = NextResponse.json(
        { success: false, message: "Session invalid or expired. Please log in again." },
        { status: 401 }
      );
      clearAdminAuthCookies(response as unknown as Response);
      return response;
    }

    const admin = await Admin.findById(payload.adminId);
    if (!admin || !admin.isActive) {
      const response = NextResponse.json(
        { success: false, message: "Admin account unavailable" },
        { status: 401 }
      );
      clearAdminAuthCookies(response as unknown as Response);
      return response;
    }

    // Rotate: revoke old session, issue a new one
    session.revokedAt = new Date();
    await session.save();

    const newSession = await AdminSession.create({
      adminId: admin._id,
      refreshTokenHash: "pending",
      userAgent: req.headers.get("user-agent"),
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const newAccessToken = generateAdminAccessToken(String(admin._id), admin.email);
    const newRefreshToken = generateAdminRefreshToken(String(admin._id), String(newSession._id));
    newSession.refreshTokenHash = hashToken(newRefreshToken);
    await newSession.save();

    const response = NextResponse.json({ success: true, message: "Session refreshed" });
    setAdminAuthCookies(response as unknown as Response, newAccessToken, newRefreshToken);
    return response;
  } catch (error) {
    console.error("[admin refresh] Error:", error);
    const response = NextResponse.json(
      { success: false, message: "Invalid or expired session" },
      { status: 401 }
    );
    clearAdminAuthCookies(response as unknown as Response);
    return response;
  }
}
