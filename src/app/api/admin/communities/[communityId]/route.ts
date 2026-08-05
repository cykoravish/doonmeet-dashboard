import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Community } from "@/models/Community";
import { CommunityMember } from "@/models/CommunityMember";
import { CommunityPost } from "@/models/CommunityPost";
import { CommunityPostComment } from "@/models/CommunityPostComment";
import { withAdminAuth, AuthenticatedAdminRequest } from "@/middleware/withAdminAuth";
import { logAdminAction } from "@/models/AdminAuditLog";
import { validateBody } from "@/middleware/validate";
import { updateCommunitySchema } from "@/validations/community";
import { adminApiLimiter } from "@/lib/rateLimit";

type Params = { params: Promise<{ communityId: string }> };

function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

export const GET = withAdminAuth(async (req: AuthenticatedAdminRequest, context) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  const { communityId } = await (context as unknown as Params).params;
  if (!isValidId(communityId)) {
    return NextResponse.json({ success: false, message: "Invalid community id" }, { status: 400 });
  }

  try {
    await connectDB();

    const community = await Community.findById(communityId)
      .populate("createdBy", "name email avatar")
      .lean();

    if (!community) {
      return NextResponse.json({ success: false, message: "Community not found" }, { status: 404 });
    }

    const [memberCount, postCount] = await Promise.all([
      CommunityMember.countDocuments({ community: communityId }),
      CommunityPost.countDocuments({ community: communityId }),
    ]);

    return NextResponse.json({
      success: true,
      community,
      stats: { memberCount, postCount },
    });
  } catch (error) {
    console.error("[admin community detail] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch community" },
      { status: 500 }
    );
  }
});

export const PATCH = withAdminAuth(async (req: AuthenticatedAdminRequest, context) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  const { communityId } = await (context as unknown as Params).params;
  if (!isValidId(communityId)) {
    return NextResponse.json({ success: false, message: "Invalid community id" }, { status: 400 });
  }

  const result = await validateBody(req, updateCommunitySchema);
  if (result instanceof NextResponse) return result;
  const { announcementText, ...rest } = result.data;

  if (Object.keys(rest).length === 0 && announcementText === undefined) {
    return NextResponse.json({ success: false, message: "No fields to update" }, { status: 400 });
  }

  try {
    await connectDB();

    const community = await Community.findById(communityId);
    if (!community) {
      return NextResponse.json({ success: false, message: "Community not found" }, { status: 404 });
    }

    const before: Record<string, unknown> = {};
    for (const key of Object.keys(rest) as (keyof typeof rest)[]) {
      before[key] = (community as unknown as Record<string, unknown>)[key];
      (community as unknown as Record<string, unknown>)[key] = rest[key];
    }

    if (announcementText !== undefined) {
      before.announcement = community.announcement;
      community.announcement = {
        text: announcementText,
        updatedAt: announcementText ? new Date() : null,
      };
    }

    await community.save();

    await logAdminAction({
      adminId: req.admin._id,
      adminEmail: req.admin.email,
      action: "community.update",
      targetType: "Community",
      targetId: communityId,
      metadata: { before, after: { ...rest, announcementText } },
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    return NextResponse.json({ success: true, message: "Community updated", community });
  } catch (error) {
    console.error("[admin community update] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update community" },
      { status: 500 }
    );
  }
});

export const DELETE = withAdminAuth(async (req: AuthenticatedAdminRequest, context) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  const { communityId } = await (context as unknown as Params).params;
  if (!isValidId(communityId)) {
    return NextResponse.json({ success: false, message: "Invalid community id" }, { status: 400 });
  }

  try {
    await connectDB();

    const community = await Community.findById(communityId);
    if (!community) {
      return NextResponse.json({ success: false, message: "Community not found" }, { status: 404 });
    }

    const postIds = await CommunityPost.find({ community: communityId }).distinct("_id");

    await Promise.all([
      CommunityMember.deleteMany({ community: communityId }),
      CommunityPost.deleteMany({ community: communityId }),
      CommunityPostComment.deleteMany({ post: { $in: postIds } }),
    ]);

    await community.deleteOne();

    await logAdminAction({
      adminId: req.admin._id,
      adminEmail: req.admin.email,
      action: "community.delete",
      targetType: "Community",
      targetId: communityId,
      metadata: { name: community.name },
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    return NextResponse.json({ success: true, message: "Community deleted" });
  } catch (error) {
    console.error("[admin community delete] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete community" },
      { status: 500 }
    );
  }
});
