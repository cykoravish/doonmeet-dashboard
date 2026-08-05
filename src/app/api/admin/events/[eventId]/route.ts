import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Event } from "@/models/Event";
import { EventRSVP } from "@/models/EventRSVP";
import { EventComment } from "@/models/EventComment";
import { withAdminAuth, AuthenticatedAdminRequest } from "@/middleware/withAdminAuth";
import { logAdminAction } from "@/models/AdminAuditLog";
import { validateBody } from "@/middleware/validate";
import { updateEventSchema } from "@/validations/event";
import { adminApiLimiter } from "@/lib/rateLimit";

type Params = { params: Promise<{ eventId: string }> };

function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

export const GET = withAdminAuth(async (req: AuthenticatedAdminRequest, context) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  const { eventId } = await (context as unknown as Params).params;
  if (!isValidId(eventId)) {
    return NextResponse.json({ success: false, message: "Invalid event id" }, { status: 400 });
  }

  try {
    await connectDB();

    const event = await Event.findById(eventId)
      .populate("creator", "name email avatar")
      .populate("community", "name")
      .lean();

    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found" }, { status: 404 });
    }

    const rsvpCount = await EventRSVP.countDocuments({ event: eventId });

    return NextResponse.json({ success: true, event, stats: { rsvpCount } });
  } catch (error) {
    console.error("[admin event detail] Error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch event" }, { status: 500 });
  }
});

export const PATCH = withAdminAuth(async (req: AuthenticatedAdminRequest, context) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  const { eventId } = await (context as unknown as Params).params;
  if (!isValidId(eventId)) {
    return NextResponse.json({ success: false, message: "Invalid event id" }, { status: 400 });
  }

  const result = await validateBody(req, updateEventSchema);
  if (result instanceof NextResponse) return result;
  const { locationName, locationAddress, ...rest } = result.data;

  try {
    await connectDB();

    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found" }, { status: 404 });
    }

    const before: Record<string, unknown> = {};
    for (const key of Object.keys(rest) as (keyof typeof rest)[]) {
      before[key] = (event as unknown as Record<string, unknown>)[key];
      (event as unknown as Record<string, unknown>)[key] = rest[key];
    }

    if (locationName !== undefined) event.location.name = locationName;
    if (locationAddress !== undefined) event.location.address = locationAddress;

    await event.save();

    await logAdminAction({
      adminId: req.admin._id,
      adminEmail: req.admin.email,
      action: "event.update",
      targetType: "Event",
      targetId: eventId,
      metadata: { before, after: rest },
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    return NextResponse.json({ success: true, message: "Event updated", event });
  } catch (error) {
    console.error("[admin event update] Error:", error);
    return NextResponse.json({ success: false, message: "Failed to update event" }, { status: 500 });
  }
});

export const DELETE = withAdminAuth(async (req: AuthenticatedAdminRequest, context) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  const { eventId } = await (context as unknown as Params).params;
  if (!isValidId(eventId)) {
    return NextResponse.json({ success: false, message: "Invalid event id" }, { status: 400 });
  }

  try {
    await connectDB();

    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found" }, { status: 404 });
    }

    await Promise.all([
      EventRSVP.deleteMany({ event: eventId }),
      EventComment.deleteMany({ event: eventId }),
    ]);

    await event.deleteOne();

    await logAdminAction({
      adminId: req.admin._id,
      adminEmail: req.admin.email,
      action: "event.delete",
      targetType: "Event",
      targetId: eventId,
      metadata: { title: event.title },
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    return NextResponse.json({ success: true, message: "Event deleted" });
  } catch (error) {
    console.error("[admin event delete] Error:", error);
    return NextResponse.json({ success: false, message: "Failed to delete event" }, { status: 500 });
  }
});
