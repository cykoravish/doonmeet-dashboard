import { NextRequest, NextResponse } from "next/server";
import { ZodType } from "zod";

export async function validateBody<T>(
  req: NextRequest,
  schema: ZodType<T>
): Promise<{ data: T } | NextResponse> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    return NextResponse.json(
      { success: false, message: firstIssue?.message ?? "Invalid request body" },
      { status: 400 }
    );
  }

  return { data: result.data };
}
