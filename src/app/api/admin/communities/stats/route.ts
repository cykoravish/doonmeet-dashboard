import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Community } from "@/models/Community";
import { CommunityPost } from "@/models/CommunityPost";
import { withAdminAuth } from "@/middleware/withAdminAuth";

export const GET = withAdminAuth(async () => {
  try {
    await connectDB();

    const [total, active, inactive, totalPosts] = await Promise.all([
      Community.countDocuments({}),
      Community.countDocuments({ isActive: true }),
      Community.countDocuments({ isActive: false }),
      CommunityPost.countDocuments({}),
    ]);

    return NextResponse.json({
      success: true,
      stats: { total, active, inactive, totalPosts },
    });
  } catch (error) {
    console.error("[admin communities stats] Error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch stats" }, { status: 500 });
  }
});
