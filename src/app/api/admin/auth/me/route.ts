import { NextResponse } from "next/server";
import { withAdminAuth, AuthenticatedAdminRequest } from "@/middleware/withAdminAuth";

export const GET = withAdminAuth(async (req: AuthenticatedAdminRequest) => {
  const { admin } = req;
  return NextResponse.json({
    success: true,
    admin: {
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      lastLoginAt: admin.lastLoginAt,
    },
  });
});
