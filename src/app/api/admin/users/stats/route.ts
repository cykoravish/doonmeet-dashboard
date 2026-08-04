import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { withAdminAuth } from "@/middleware/withAdminAuth";

export const GET = withAdminAuth(async () => {
  try {
    await connectDB();

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [total, active, banned, guests, unverified, newThisWeek] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: false }),
      User.countDocuments({ isGuest: true }),
      User.countDocuments({ isVerified: false, isGuest: false }),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    ]);

    return NextResponse.json({
      success: true,
      stats: { total, active, banned, guests, unverified, newThisWeek },
    });
  } catch (error) {
    console.error("[admin users stats] Error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch stats" }, { status: 500 });
  }
});
