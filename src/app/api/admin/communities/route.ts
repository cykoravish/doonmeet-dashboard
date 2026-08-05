import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Community } from "@/models/Community";
import { withAdminAuth, AuthenticatedAdminRequest } from "@/middleware/withAdminAuth";
import { adminApiLimiter } from "@/lib/rateLimit";
import { logAdminAction } from "@/models/AdminAuditLog";
import { validateBody } from "@/middleware/validate";
import { createCommunitySchema } from "@/validations/community";
import { generateUniqueSlug } from "@/lib/slugify";
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
    const category = searchParams.get("category");
    const status = searchParams.get("status"); // active | inactive

    const query: Record<string, unknown> = {};

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ name: regex }, { description: regex }];
    }
    if (category && category !== "all") query.category = category;
    if (status === "active") query.isActive = true;
    if (status === "inactive") query.isActive = false;

    const [communities, total] = await Promise.all([
      Community.find(query)
        .populate("createdBy", "name email avatar")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Community.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      communities,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    console.error("[admin communities list] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch communities" },
      { status: 500 }
    );
  }
});

export const POST = withAdminAuth(async (req: AuthenticatedAdminRequest) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  const result = await validateBody(req, createCommunitySchema);
  if (result instanceof NextResponse) return result;
  const { name, description, category } = result.data;

  try {
    await connectDB();

    const slug = await generateUniqueSlug(name, async (s) => {
      const existing = await Community.findOne({ slug: s }).lean();
      return !!existing;
    });

    const systemUserId = await getSystemUserId();

    const community = await Community.create({
      name,
      slug,
      description,
      category,
      createdBy: systemUserId,
      memberCount: 0,
      isActive: true,
    });

    await logAdminAction({
      adminId: req.admin._id,
      adminEmail: req.admin.email,
      action: "community.create",
      targetType: "Community",
      targetId: String(community._id),
      metadata: { name },
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    return NextResponse.json({ success: true, community }, { status: 201 });
  } catch (error) {
    console.error("[admin community create] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create community" },
      { status: 500 }
    );
  }
});
