import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Session } from "@/models/Session";
import { CommunityMember } from "@/models/CommunityMember";
import { CommunityPost } from "@/models/CommunityPost";
import { EventRSVP } from "@/models/EventRSVP";
import { Event } from "@/models/Event";
import { PlaceReview } from "@/models/PlaceReview";
import { RoomMessage } from "@/models/RoomMessage";
import { Conversation } from "@/models/Conversation";
import { DirectMessage } from "@/models/DirectMessage";
import { Notification } from "@/models/Notification";
import { Location } from "@/models/Location";
import { withAdminAuth, AuthenticatedAdminRequest } from "@/middleware/withAdminAuth";
import { logAdminAction } from "@/models/AdminAuditLog";
import { validateBody } from "@/middleware/validate";
import { adminApiLimiter } from "@/lib/rateLimit";

type Params = { params: Promise<{ userId: string }> };

function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

// -------------------------
// GET — full profile + activity counts
// -------------------------
export const GET = withAdminAuth(async (req: AuthenticatedAdminRequest, context) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  const { userId } = await (context as unknown as Params).params;
  if (!isValidId(userId)) {
    return NextResponse.json({ success: false, message: "Invalid user id" }, { status: 400 });
  }

  try {
    await connectDB();

    const user = await User.findById(userId)
      .select("-passwordHash -googleId -verificationToken -resetPasswordToken")
      .lean();

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    const [
      communityCount,
      eventsCreatedCount,
      eventRsvpCount,
      reviewCount,
      sessionCount,
      location,
    ] = await Promise.all([
      CommunityMember.countDocuments({ user: userId }),
      Event.countDocuments({ creator: userId }),
      EventRSVP.countDocuments({ user: userId }),
      PlaceReview.countDocuments({ user: userId }),
      Session.countDocuments({ userId }),
      Location.findOne({ user: userId }).lean(),
    ]);

    return NextResponse.json({
      success: true,
      user,
      activity: {
        communityCount,
        eventsCreatedCount,
        eventRsvpCount,
        reviewCount,
        sessionCount,
      },
      location,
    });
  } catch (error) {
    console.error("[admin user detail] Error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch user" }, { status: 500 });
  }
});

// -------------------------
// PATCH — edit profile fields, ban/unban, force-verify
// -------------------------
const updateSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  bio: z.string().max(300).optional(),
  address: z.string().max(100).optional(),
  isActive: z.boolean().optional(), // false = ban
  isVerified: z.boolean().optional(),
});

export const PATCH = withAdminAuth(async (req: AuthenticatedAdminRequest, context) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  const { userId } = await (context as unknown as Params).params;
  if (!isValidId(userId)) {
    return NextResponse.json({ success: false, message: "Invalid user id" }, { status: 400 });
  }

  const result = await validateBody(req, updateSchema);
  if (result instanceof NextResponse) return result;
  const updates = result.data;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: false, message: "No fields to update" }, { status: 400 });
  }

  try {
    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    const before: Record<string, unknown> = {};
    for (const key of Object.keys(updates) as (keyof typeof updates)[]) {
      before[key] = (user as unknown as Record<string, unknown>)[key];
      (user as unknown as Record<string, unknown>)[key] = updates[key];
    }
    await user.save();

    // If banned, revoke all their active sessions immediately
    if (updates.isActive === false) {
      await Session.deleteMany({ userId });
    }

    await logAdminAction({
      adminId: req.admin._id,
      adminEmail: req.admin.email,
      action: "user.update",
      targetType: "User",
      targetId: userId,
      metadata: { before, after: updates },
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    return NextResponse.json({ success: true, message: "User updated", user });
  } catch (error) {
    console.error("[admin user update] Error:", error);
    return NextResponse.json({ success: false, message: "Failed to update user" }, { status: 500 });
  }
});

// -------------------------
// DELETE — permanently remove user + cascade their data
// -------------------------
export const DELETE = withAdminAuth(async (req: AuthenticatedAdminRequest, context) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  const { userId } = await (context as unknown as Params).params;
  if (!isValidId(userId)) {
    return NextResponse.json({ success: false, message: "Invalid user id" }, { status: 400 });
  }

  try {
    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    const userEmail = user.email;

    // Cascade delete everything owned by / referencing this user.
    // Events/communities they created are NOT deleted (they may have
    // other members/attendees) — ownership is cleared instead so the
    // content survives; comments/posts by the user ARE removed.
    await Promise.all([
      Session.deleteMany({ userId }),
      CommunityMember.deleteMany({ user: userId }),
      CommunityPost.deleteMany({ author: userId }),
      EventRSVP.deleteMany({ user: userId }),
      PlaceReview.deleteMany({ user: userId }),
      RoomMessage.deleteMany({ sender: userId }),
      Notification.deleteMany({ recipient: userId }),
      Location.deleteMany({ user: userId }),
      DirectMessage.deleteMany({ sender: userId }),
      Conversation.deleteMany({ participants: userId }),
    ]);

    await user.deleteOne();

    await logAdminAction({
      adminId: req.admin._id,
      adminEmail: req.admin.email,
      action: "user.delete",
      targetType: "User",
      targetId: userId,
      metadata: { email: userEmail },
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    return NextResponse.json({ success: true, message: "User deleted" });
  } catch (error) {
    console.error("[admin user delete] Error:", error);
    return NextResponse.json({ success: false, message: "Failed to delete user" }, { status: 500 });
  }
});
