// Verifies the admin access token and attaches the admin to the request.
// This is deliberately independent of doonmeet's own user auth —
// it never accepts a user session token, only an admin one.
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Admin, IAdmin } from "@/models/Admin";
import { verifyAdminAccessToken, ADMIN_ACCESS_COOKIE } from "@/lib/tokens";
import jwt from "jsonwebtoken";

export interface AuthenticatedAdminRequest extends NextRequest {
  admin: IAdmin;
}

type RouteHandler = (
  req: AuthenticatedAdminRequest,
  context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

export function withAdminAuth(handler: RouteHandler) {
  return async (
    req: NextRequest,
    context: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    try {
      const authHeader = req.headers.get("authorization");
      const token = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : req.cookies.get(ADMIN_ACCESS_COOKIE)?.value;

      if (!token) {
        return NextResponse.json(
          { success: false, message: "Admin authentication required" },
          { status: 401 }
        );
      }

      let payload: { adminId: string; email: string };
      try {
        payload = verifyAdminAccessToken(token);
      } catch (err) {
        const isExpired = err instanceof jwt.TokenExpiredError;
        return NextResponse.json(
          {
            success: false,
            message: isExpired ? "Session expired. Please log in again." : "Invalid token",
            code: isExpired ? "ADMIN_SESSION_EXPIRED" : "ADMIN_TOKEN_INVALID",
          },
          { status: 401 }
        );
      }

      await connectDB();
      const admin = await Admin.findById(payload.adminId).lean<IAdmin>();

      if (!admin) {
        return NextResponse.json(
          { success: false, message: "Admin account not found" },
          { status: 401 }
        );
      }

      if (!admin.isActive) {
        return NextResponse.json(
          { success: false, message: "This admin account has been deactivated" },
          { status: 403 }
        );
      }

      (req as AuthenticatedAdminRequest).admin = admin;
      return handler(
        req as AuthenticatedAdminRequest,
        context as { params: Promise<Record<string, string>> }
      );
    } catch (error) {
      console.error("[withAdminAuth] Unexpected error:", error);
      return NextResponse.json(
        { success: false, message: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
