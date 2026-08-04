import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Admin } from "@/models/Admin";
import { AdminSession } from "@/models/AdminSession";
import { logAdminAction } from "@/models/AdminAuditLog";
import { validateBody } from "@/middleware/validate";
import { adminLoginLimiter } from "@/lib/rateLimit";
import { adminLoginSchema } from "@/validations/auth";
import {
  generateAdminAccessToken,
  generateAdminRefreshToken,
  hashToken,
  setAdminAuthCookies,
} from "@/lib/tokens";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function getClientIp(req: NextRequest): string | null {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export async function POST(req: NextRequest) {
  const limited = adminLoginLimiter(req);
  if (limited) return limited;

  const result = await validateBody(req, adminLoginSchema);
  if (result instanceof NextResponse) return result;
  const { email, password } = result.data;

  const invalidMsg = "Invalid email or password";
  const ip = getClientIp(req);

  try {
    await connectDB();

    const admin = await Admin.findOne({ email }).select("+passwordHash");

    if (!admin) {
      // Generic message — do not reveal whether the email exists
      return NextResponse.json({ success: false, message: invalidMsg }, { status: 401 });
    }

    // Locked out from too many recent failed attempts
    if (admin.lockedUntil && admin.lockedUntil.getTime() > Date.now()) {
      const minutesLeft = Math.ceil((admin.lockedUntil.getTime() - Date.now()) / 60000);
      return NextResponse.json(
        {
          success: false,
          message: `Too many failed attempts. Try again in ${minutesLeft} minute(s).`,
          code: "ADMIN_LOCKED",
        },
        { status: 403 }
      );
    }

    if (!admin.isActive) {
      return NextResponse.json(
        { success: false, message: "This admin account has been deactivated" },
        { status: 403 }
      );
    }

    const passwordMatch = await admin.comparePassword(password);

    if (!passwordMatch) {
      admin.failedLoginAttempts += 1;
      if (admin.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        admin.lockedUntil = new Date(Date.now() + LOCKOUT_MS);
        admin.failedLoginAttempts = 0;
      }
      await admin.save();

      await logAdminAction({
        adminId: admin._id,
        adminEmail: admin.email,
        action: "auth.login_failed",
        ip,
      });

      return NextResponse.json({ success: false, message: invalidMsg }, { status: 401 });
    }

    // Successful login — reset lockout state
    admin.failedLoginAttempts = 0;
    admin.lockedUntil = null;
    admin.lastLoginAt = new Date();
    admin.lastLoginIp = ip;
    await admin.save();

    const accessToken = generateAdminAccessToken(String(admin._id), admin.email);

    // Create the session first so we have a stable sessionId to embed in the
    // refresh token, then store the token's hash back onto that same session.
    const session = await AdminSession.create({
      adminId: admin._id,
      refreshTokenHash: "pending",
      userAgent: req.headers.get("user-agent"),
      ip,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const finalRefreshToken = generateAdminRefreshToken(String(admin._id), String(session._id));
    session.refreshTokenHash = hashToken(finalRefreshToken);
    await session.save();

    await logAdminAction({
      adminId: admin._id,
      adminEmail: admin.email,
      action: "auth.login",
      ip,
    });

    const response = NextResponse.json(
      {
        success: true,
        message: "Logged in successfully",
        admin: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
        },
      },
      { status: 200 }
    );

    setAdminAuthCookies(response as unknown as Response, accessToken, finalRefreshToken);
    return response;
  } catch (error) {
    console.error("[admin login] Error:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
