import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Event } from "@/models/Event";
import { withAdminAuth, AuthenticatedAdminRequest } from "@/middleware/withAdminAuth";
import { adminApiLimiter } from "@/lib/rateLimit";
import { logAdminAction } from "@/models/AdminAuditLog";
import { validateBody } from "@/middleware/validate";
import { createEventSchema } from "@/validations/event";
import { getSystemUserId } from "@/lib/systemUser";

export const GET = withAdminAuth(async (req: AuthenticatedAdminRequest) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));
    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status"); // draft | published | cancelled
    const when = searchParams.get("when"); // upcoming | past

    const query: Record<string, unknown> = {};

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ title: regex }, { description: regex }];
    }
    if (status && status !== "all") query.status = status;
    if (when === "upcoming") query.date = { $gte: new Date() };
    if (when === "past") query.date = { $lt: new Date() };

    const [events, total] = await Promise.all([
      Event.find(query)
        .populate("creator", "name email avatar")
        .populate("community", "name")
        .sort({ date: when === "past" ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Event.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      events,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    console.error("[admin events list] Error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch events" }, { status: 500 });
  }
});

export const POST = withAdminAuth(async (req: AuthenticatedAdminRequest) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  const result = await validateBody(req, createEventSchema);
  if (result instanceof NextResponse) return result;
  const { title, description, locationName, locationAddress, date, endsAt, capacity, tags, status } =
    result.data;

  try {
    await connectDB();

    const systemUserId = await getSystemUserId();

    const event = await Event.create({
      creator: systemUserId,
      title,
      description,
      location: { name: locationName, address: locationAddress, coords: { lat: null, lng: null } },
      date,
      endsAt: endsAt ?? null,
      capacity: capacity ?? null,
      tags,
      status,
      commentCount: 0,
    });

    await logAdminAction({
      adminId: req.admin._id,
      adminEmail: req.admin.email,
      action: "event.create",
      targetType: "Event",
      targetId: String(event._id),
      metadata: { title },
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (error) {
    console.error("[admin event create] Error:", error);
    return NextResponse.json({ success: false, message: "Failed to create event" }, { status: 500 });
  }
});
