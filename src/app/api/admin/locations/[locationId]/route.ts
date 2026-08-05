import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Location } from "@/models/Location";
import { withAdminAuth, AuthenticatedAdminRequest } from "@/middleware/withAdminAuth";
import { logAdminAction } from "@/models/AdminAuditLog";
import { validateBody } from "@/middleware/validate";
import { adminApiLimiter } from "@/lib/rateLimit";

type Params = { params: Promise<{ locationId: string }> };

const updateSchema = z.object({
  isVisible: z.boolean(),
});

export const PATCH = withAdminAuth(async (req: AuthenticatedAdminRequest, context) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  const { locationId } = await (context as unknown as Params).params;
  if (!mongoose.Types.ObjectId.isValid(locationId)) {
    return NextResponse.json({ success: false, message: "Invalid location id" }, { status: 400 });
  }

  const result = await validateBody(req, updateSchema);
  if (result instanceof NextResponse) return result;
  const { isVisible } = result.data;

  try {
    await connectDB();

    const location = await Location.findByIdAndUpdate(locationId, { isVisible }, { new: true });
    if (!location) {
      return NextResponse.json({ success: false, message: "Location not found" }, { status: 404 });
    }

    await logAdminAction({
      adminId: req.admin._id,
      adminEmail: req.admin.email,
      action: isVisible ? "location.unhide" : "location.hide",
      targetType: "Location",
      targetId: locationId,
      metadata: { userId: String(location.user) },
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    return NextResponse.json({ success: true, message: "Location updated", location });
  } catch (error) {
    console.error("[admin location update] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update location" },
      { status: 500 }
    );
  }
});

export const DELETE = withAdminAuth(async (req: AuthenticatedAdminRequest, context) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  const { locationId } = await (context as unknown as Params).params;
  if (!mongoose.Types.ObjectId.isValid(locationId)) {
    return NextResponse.json({ success: false, message: "Invalid location id" }, { status: 400 });
  }

  try {
    await connectDB();

    const location = await Location.findByIdAndDelete(locationId);
    if (!location) {
      return NextResponse.json({ success: false, message: "Location not found" }, { status: 404 });
    }

    await logAdminAction({
      adminId: req.admin._id,
      adminEmail: req.admin.email,
      action: "location.delete",
      targetType: "Location",
      targetId: locationId,
      metadata: { userId: String(location.user) },
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    return NextResponse.json({ success: true, message: "Location removed" });
  } catch (error) {
    console.error("[admin location delete] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete location" },
      { status: 500 }
    );
  }
});
