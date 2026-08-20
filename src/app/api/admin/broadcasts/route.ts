import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Broadcast } from "@/models/Broadcast";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";
import { PushSubscription } from "@/models/PushSubscription";
import { sendPushToSubscriptions } from "@/lib/push";
import { withAdminAuth, AuthenticatedAdminRequest } from "@/middleware/withAdminAuth";
import { adminApiLimiter } from "@/lib/rateLimit";

// A fixed "system" identity so the Notification schema's required
// actor.userId is satisfied without pointing at a real user — the bell UI
// only ever reads actor.name/avatar for display, never populates it.
const SYSTEM_ACTOR_ID = "000000000000000000000000";

export const POST = withAdminAuth(async (req: AuthenticatedAdminRequest) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  try {
    const body = await req.json();
    const title = String(body?.title ?? "").trim();
    const message = String(body?.message ?? "").trim();
    const url = body?.url ? String(body.url).trim() : null;

    if (!title || title.length > 100) {
      return NextResponse.json(
        { success: false, message: "Title is required (max 100 characters)." },
        { status: 400 }
      );
    }
    if (!message || message.length > 500) {
      return NextResponse.json(
        { success: false, message: "Message is required (max 500 characters)." },
        { status: 400 }
      );
    }
    if (url && !/^https?:\/\//.test(url)) {
      return NextResponse.json(
        { success: false, message: "URL must start with http:// or https://" },
        { status: 400 }
      );
    }

    await connectDB();

    // Audience: every real (non-guest), non-banned user.
    const recipients = await User.find({ isGuest: false, isActive: true })
      .select("_id")
      .lean();

    if (recipients.length === 0) {
      return NextResponse.json(
        { success: false, message: "No eligible users to broadcast to." },
        { status: 400 }
      );
    }

    const broadcast = await Broadcast.create({
      title,
      message,
      url,
      sentByEmail: req.admin.email,
      recipientCount: recipients.length,
      pushSentCount: 0,
    });

    // Bulk in-app notifications — one per recipient, so each has their own
    // isRead state (this is what powers the "who's read it" view).
    await Notification.insertMany(
      recipients.map((r) => ({
        recipient: r._id,
        type: "announcement",
        refModel: "Broadcast",
        refId: broadcast._id,
        preview: message,
        url,
        actor: { userId: SYSTEM_ACTOR_ID, name: title, avatar: null },
        isRead: false,
      })),
      { ordered: false }
    );

    // Push — fetch every subscription belonging to any recipient in one go.
    const recipientIds = recipients.map((r) => r._id);
    const subs = await PushSubscription.find({ user: { $in: recipientIds } }).lean();

    const pushSentCount = await sendPushToSubscriptions(subs, {
      title,
      body: message,
      url: url ?? "/",
      tag: `broadcast-${broadcast._id}`,
    });

    broadcast.pushSentCount = pushSentCount;
    await broadcast.save();

    return NextResponse.json({
      success: true,
      broadcast: {
        _id: broadcast._id,
        title: broadcast.title,
        recipientCount: broadcast.recipientCount,
        pushSentCount: broadcast.pushSentCount,
      },
    });
  } catch (error) {
    console.error("[POST /admin/broadcasts] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to send broadcast." },
      { status: 500 }
    );
  }
});

export const GET = withAdminAuth(async (req: AuthenticatedAdminRequest) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));

    const [broadcasts, total] = await Promise.all([
      Broadcast.find({})
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Broadcast.countDocuments({}),
    ]);

    // Read count per broadcast — one countDocuments per row, fine at this scale.
    const withReadCounts = await Promise.all(
      broadcasts.map(async (b) => {
        const readCount = await Notification.countDocuments({
          refModel: "Broadcast",
          refId: b._id,
          isRead: true,
        });
        return { ...b, readCount };
      })
    );

    return NextResponse.json({
      success: true,
      broadcasts: withReadCounts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    console.error("[GET /admin/broadcasts] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch broadcasts." },
      { status: 500 }
    );
  }
});
