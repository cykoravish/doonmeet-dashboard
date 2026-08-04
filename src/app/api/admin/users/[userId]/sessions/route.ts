import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Session } from "@/models/Session";
import { withAdminAuth, AuthenticatedAdminRequest } from "@/middleware/withAdminAuth";
import { adminApiLimiter } from "@/lib/rateLimit";

type Params = { params: Promise<{ userId: string }> };

export const GET = withAdminAuth(async (req: AuthenticatedAdminRequest, context) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  const { userId } = await (context as unknown as Params).params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ success: false, message: "Invalid user id" }, { status: 400 });
  }

  try {
    await connectDB();
    const sessions = await Session.find({ userId }).sort({ expiresAt: -1 }).lean();
    return NextResponse.json({ success: true, sessions });
  } catch (error) {
    console.error("[admin user sessions] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
});
