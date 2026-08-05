import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Place } from "@/models/Place";
import { PlaceReview } from "@/models/PlaceReview";
import { withAdminAuth, AuthenticatedAdminRequest } from "@/middleware/withAdminAuth";
import { logAdminAction } from "@/models/AdminAuditLog";
import { validateBody } from "@/middleware/validate";
import { updatePlaceSchema } from "@/validations/place";
import { adminApiLimiter } from "@/lib/rateLimit";

type Params = { params: Promise<{ placeId: string }> };

function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

export const GET = withAdminAuth(async (req: AuthenticatedAdminRequest, context) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  const { placeId } = await (context as unknown as Params).params;
  if (!isValidId(placeId)) {
    return NextResponse.json({ success: false, message: "Invalid place id" }, { status: 400 });
  }

  try {
    await connectDB();

    const place = await Place.findById(placeId).lean();
    if (!place) {
      return NextResponse.json({ success: false, message: "Place not found" }, { status: 404 });
    }

    const [reviewCount, avgRatingResult] = await Promise.all([
      PlaceReview.countDocuments({ place: placeId }),
      PlaceReview.aggregate([
        { $match: { place: new mongoose.Types.ObjectId(placeId) } },
        { $group: { _id: null, avg: { $avg: "$rating" } } },
      ]),
    ]);
    const avgRating = avgRatingResult[0]?.avg ? Math.round(avgRatingResult[0].avg * 10) / 10 : null;

    return NextResponse.json({ success: true, place, stats: { reviewCount, avgRating } });
  } catch (error) {
    console.error("[admin place detail] Error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch place" }, { status: 500 });
  }
});

export const PATCH = withAdminAuth(async (req: AuthenticatedAdminRequest, context) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  const { placeId } = await (context as unknown as Params).params;
  if (!isValidId(placeId)) {
    return NextResponse.json({ success: false, message: "Invalid place id" }, { status: 400 });
  }

  const result = await validateBody(req, updatePlaceSchema);
  if (result instanceof NextResponse) return result;
  const updates = result.data;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: false, message: "No fields to update" }, { status: 400 });
  }

  try {
    await connectDB();

    const place = await Place.findById(placeId);
    if (!place) {
      return NextResponse.json({ success: false, message: "Place not found" }, { status: 404 });
    }

    const before: Record<string, unknown> = {};
    for (const key of Object.keys(updates) as (keyof typeof updates)[]) {
      before[key] = (place as unknown as Record<string, unknown>)[key];
      (place as unknown as Record<string, unknown>)[key] = updates[key];
    }
    await place.save();

    await logAdminAction({
      adminId: req.admin._id,
      adminEmail: req.admin.email,
      action: "place.update",
      targetType: "Place",
      targetId: placeId,
      metadata: { before, after: updates },
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    return NextResponse.json({ success: true, message: "Place updated", place });
  } catch (error) {
    console.error("[admin place update] Error:", error);
    return NextResponse.json({ success: false, message: "Failed to update place" }, { status: 500 });
  }
});

export const DELETE = withAdminAuth(async (req: AuthenticatedAdminRequest, context) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  const { placeId } = await (context as unknown as Params).params;
  if (!isValidId(placeId)) {
    return NextResponse.json({ success: false, message: "Invalid place id" }, { status: 400 });
  }

  try {
    await connectDB();

    const place = await Place.findById(placeId);
    if (!place) {
      return NextResponse.json({ success: false, message: "Place not found" }, { status: 404 });
    }

    await PlaceReview.deleteMany({ place: placeId });
    await place.deleteOne();

    await logAdminAction({
      adminId: req.admin._id,
      adminEmail: req.admin.email,
      action: "place.delete",
      targetType: "Place",
      targetId: placeId,
      metadata: { title: place.title },
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    return NextResponse.json({ success: true, message: "Place deleted" });
  } catch (error) {
    console.error("[admin place delete] Error:", error);
    return NextResponse.json({ success: false, message: "Failed to delete place" }, { status: 500 });
  }
});
