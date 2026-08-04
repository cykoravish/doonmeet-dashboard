import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const ADMIN_ACCESS_COOKIE = "admin_access_token";

// Public paths that don't require an authenticated admin session
const PUBLIC_PATHS = ["/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  const token = req.cookies.get(ADMIN_ACCESS_COOKIE)?.value;

  let isValid = false;
  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.ADMIN_ACCESS_TOKEN_SECRET);
      await jwtVerify(token, secret);
      isValid = true;
    } catch {
      isValid = false;
    }
  }

  // Not logged in and hitting a protected page → send to login
  if (!isValid && !isPublicPath) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Already logged in and hitting /login → send to dashboard home
  if (isValid && isPublicPath) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except API routes (those protect themselves via
  // withAdminAuth), static assets, and Next internals.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
