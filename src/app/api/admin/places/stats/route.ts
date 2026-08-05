import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Place } from "@/models/Place";
import { PlaceReview } from "@/models/PlaceReview";
import { withAdminAuth } from "@/middleware/withAdminAuth";

export const GET = withAdminAuth(async () => {
  try {
    await connectDB();

    const [total, categoryCount, totalReviews, avgRatingResult] = await Promise.all([
      Place.countDocuments({}),
      Place.distinct("category").then((c) => c.length),
      PlaceReview.countDocuments({}),
      PlaceReview.aggregate([{ $group: { _id: null, avg: { $avg: "$rating" } } }]),
    ]);

    const avgRating = avgRatingResult[0]?.avg ? Math.round(avgRatingResult[0].avg * 10) / 10 : null;

    return NextResponse.json({
      success: true,
      stats: { total, categoryCount, totalReviews, avgRating },
    });
  } catch (error) {
    console.error("[admin places stats] Error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch stats" }, { status: 500 });
  }
});
