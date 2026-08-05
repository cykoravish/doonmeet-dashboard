import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { CommunityPost } from "@/models/CommunityPost";
import { withAdminAuth, AuthenticatedAdminRequest } from "@/middleware/withAdminAuth";
import { adminApiLimiter } from "@/lib/rateLimit";

type Params = { params: Promise<{ communityId: string }> };

export const GET = withAdminAuth(async (req: AuthenticatedAdminRequest, context) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  const { communityId } = await (context as unknown as Params).params;
  if (!mongoose.Types.ObjectId.isValid(communityId)) {
    return NextResponse.json({ success: false, message: "Invalid community id" }, { status: 400 });
  }

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));

    const [posts, total] = await Promise.all([
      CommunityPost.find({ community: communityId })
        .populate("author", "name email avatar")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CommunityPost.countDocuments({ community: communityId }),
    ]);

    return NextResponse.json({
      success: true,
      posts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    console.error("[admin community posts] Error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch posts" }, { status: 500 });
  }
});
