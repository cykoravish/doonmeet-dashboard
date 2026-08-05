import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Place } from "@/models/Place";
import { PlaceReview } from "@/models/PlaceReview";
import { withAdminAuth, AuthenticatedAdminRequest } from "@/middleware/withAdminAuth";
import { adminApiLimiter } from "@/lib/rateLimit";
import { logAdminAction } from "@/models/AdminAuditLog";
import { validateBody } from "@/middleware/validate";
import { createPlaceSchema } from "@/validations/place";
import { generateUniqueSlug } from "@/lib/slugify";

export const GET = withAdminAuth(async (req: AuthenticatedAdminRequest) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));
    const search = searchParams.get("search")?.trim();
    const category = searchParams.get("category");

    const query: Record<string, unknown> = {};
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ title: regex }, { shortDescription: regex }, { category: regex }];
    }
    if (category && category !== "all") query.category = category;

    const [places, total, categories] = await Promise.all([
      Place.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Place.countDocuments(query),
      Place.distinct("category"),
    ]);

    // Attach review counts + avg rating in one aggregate pass
    const placeIds = places.map((p) => p._id);
    const reviewAgg = await PlaceReview.aggregate([
      { $match: { place: { $in: placeIds } } },
      { $group: { _id: "$place", count: { $sum: 1 }, avgRating: { $avg: "$rating" } } },
    ]);
    const reviewMap = new Map(
      reviewAgg.map((r) => [String(r._id), { count: r.count, avgRating: Math.round(r.avgRating * 10) / 10 }])
    );

    const placesWithStats = places.map((p) => ({
      ...p,
      reviewCount: reviewMap.get(String(p._id))?.count ?? 0,
      avgRating: reviewMap.get(String(p._id))?.avgRating ?? null,
    }));

    return NextResponse.json({
      success: true,
      places: placesWithStats,
      categories,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    console.error("[admin places list] Error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch places" }, { status: 500 });
  }
});

export const POST = withAdminAuth(async (req: AuthenticatedAdminRequest) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  const result = await validateBody(req, createPlaceSchema);
  if (result instanceof NextResponse) return result;
  const data = result.data;

  try {
    await connectDB();

    const slug = await generateUniqueSlug(data.title, async (s) => {
      const existing = await Place.findOne({ slug: s }).lean();
      return !!existing;
    });

    const place = await Place.create({ ...data, slug });

    await logAdminAction({
      adminId: req.admin._id,
      adminEmail: req.admin.email,
      action: "place.create",
      targetType: "Place",
      targetId: String(place._id),
      metadata: { title: data.title },
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    return NextResponse.json({ success: true, place }, { status: 201 });
  } catch (error) {
    console.error("[admin place create] Error:", error);
    return NextResponse.json({ success: false, message: "Failed to create place" }, { status: 500 });
  }
});
