import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { PlaceReview } from "@/models/PlaceReview";
import { withAdminAuth, AuthenticatedAdminRequest } from "@/middleware/withAdminAuth";
import { logAdminAction } from "@/models/AdminAuditLog";
import { adminApiLimiter } from "@/lib/rateLimit";

type Params = { params: Promise<{ placeId: string; reviewId: string }> };

export const DELETE = withAdminAuth(async (req: AuthenticatedAdminRequest, context) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  const { placeId, reviewId } = await (context as unknown as Params).params;
  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    return NextResponse.json({ success: false, message: "Invalid review id" }, { status: 400 });
  }

  try {
    await connectDB();

    const review = await PlaceReview.findOneAndDelete({ _id: reviewId, place: placeId });
    if (!review) {
      return NextResponse.json({ success: false, message: "Review not found" }, { status: 404 });
    }

    await logAdminAction({
      adminId: req.admin._id,
      adminEmail: req.admin.email,
      action: "place.review_delete",
      targetType: "Place",
      targetId: placeId,
      metadata: { reviewId, userId: String(review.user) },
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    return NextResponse.json({ success: true, message: "Review deleted" });
  } catch (error) {
    console.error("[admin place review delete] Error:", error);
    return NextResponse.json({ success: false, message: "Failed to delete review" }, { status: 500 });
  }
});
