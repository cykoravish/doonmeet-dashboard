import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { CommunityPost } from "@/models/CommunityPost";
import { CommunityPostComment } from "@/models/CommunityPostComment";
import { withAdminAuth, AuthenticatedAdminRequest } from "@/middleware/withAdminAuth";
import { logAdminAction } from "@/models/AdminAuditLog";
import { adminApiLimiter } from "@/lib/rateLimit";

type Params = { params: Promise<{ communityId: string; postId: string }> };

export const DELETE = withAdminAuth(async (req: AuthenticatedAdminRequest, context) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  const { communityId, postId } = await (context as unknown as Params).params;
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return NextResponse.json({ success: false, message: "Invalid post id" }, { status: 400 });
  }

  try {
    await connectDB();

    const post = await CommunityPost.findOneAndDelete({ _id: postId, community: communityId });
    if (!post) {
      return NextResponse.json({ success: false, message: "Post not found" }, { status: 404 });
    }

    await CommunityPostComment.deleteMany({ post: postId });

    await logAdminAction({
      adminId: req.admin._id,
      adminEmail: req.admin.email,
      action: "community.post_delete",
      targetType: "CommunityPost",
      targetId: postId,
      metadata: { communityId },
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    return NextResponse.json({ success: true, message: "Post deleted" });
  } catch (error) {
    console.error("[admin community post delete] Error:", error);
    return NextResponse.json({ success: false, message: "Failed to delete post" }, { status: 500 });
  }
});
