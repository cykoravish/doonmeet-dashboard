import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { CommunityMember } from "@/models/CommunityMember";
import { Community } from "@/models/Community";
import { withAdminAuth, AuthenticatedAdminRequest } from "@/middleware/withAdminAuth";
import { logAdminAction } from "@/models/AdminAuditLog";
import { adminApiLimiter } from "@/lib/rateLimit";

type Params = { params: Promise<{ communityId: string; memberId: string }> };

export const DELETE = withAdminAuth(async (req: AuthenticatedAdminRequest, context) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  const { communityId, memberId } = await (context as unknown as Params).params;
  if (!mongoose.Types.ObjectId.isValid(memberId)) {
    return NextResponse.json({ success: false, message: "Invalid member id" }, { status: 400 });
  }

  try {
    await connectDB();

    const member = await CommunityMember.findOneAndDelete({
      _id: memberId,
      community: communityId,
    });

    if (!member) {
      return NextResponse.json({ success: false, message: "Member not found" }, { status: 404 });
    }

    await Community.findByIdAndUpdate(communityId, { $inc: { memberCount: -1 } });

    await logAdminAction({
      adminId: req.admin._id,
      adminEmail: req.admin.email,
      action: "community.member_remove",
      targetType: "Community",
      targetId: communityId,
      metadata: { userId: String(member.user) },
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    return NextResponse.json({ success: true, message: "Member removed" });
  } catch (error) {
    console.error("[admin community member remove] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to remove member" },
      { status: 500 }
    );
  }
});
