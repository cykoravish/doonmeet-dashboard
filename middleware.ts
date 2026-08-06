import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const ADMIN_ACCESS_COOKIE = "admin_access_token";
const ADMIN_REFRESH_COOKIE = "admin_refresh_token";

// Public paths that don't require an authenticated admin session
const PUBLIC_PATHS = ["/login"];

async function verifyCookie(token: string | undefined, secretEnvVar: string): Promise<boolean> {
  if (!token) return false;
  try {
    const secret = new TextEncoder().encode(process.env[secretEnvVar]);
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  const accessToken = req.cookies.get(ADMIN_ACCESS_COOKIE)?.value;
  const hasValidAccess = await verifyCookie(accessToken, "ADMIN_ACCESS_TOKEN_SECRET");

  // The 15-minute access token expiring mid-session is expected and common.
  // Rather than bounce the admin to /login on every idle tab, fall back to
  // checking whether a still-valid refresh token exists — if so, let the
  // page load; the client's apiFetch wrapper will silently refresh the
  // access token on its first 401 and the admin never notices.
  let isAuthenticated = hasValidAccess;
  if (!hasValidAccess) {
    const refreshToken = req.cookies.get(ADMIN_REFRESH_COOKIE)?.value;
    isAuthenticated = await verifyCookie(refreshToken, "ADMIN_REFRESH_TOKEN_SECRET");
  }

  // Not logged in and hitting a protected page → send to login
  if (!isAuthenticated && !isPublicPath) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Already logged in and hitting /login → send to dashboard home
  if (isAuthenticated && isPublicPath) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except API routes (those protect themselves via
  // withAdminAuth), static assets, and Next internals.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
