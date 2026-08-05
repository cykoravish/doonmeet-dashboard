import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Event } from "@/models/Event";
import { withAdminAuth } from "@/middleware/withAdminAuth";

export const GET = withAdminAuth(async () => {
  try {
    await connectDB();

    const now = new Date();

    const [total, published, draft, cancelled, upcoming] = await Promise.all([
      Event.countDocuments({}),
      Event.countDocuments({ status: "published" }),
      Event.countDocuments({ status: "draft" }),
      Event.countDocuments({ status: "cancelled" }),
      Event.countDocuments({ status: "published", date: { $gte: now } }),
    ]);

    return NextResponse.json({
      success: true,
      stats: { total, published, draft, cancelled, upcoming },
    });
  } catch (error) {
    console.error("[admin events stats] Error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch stats" }, { status: 500 });
  }
});
