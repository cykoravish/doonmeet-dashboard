import jwt from "jsonwebtoken";
import crypto from "crypto";

const ADMIN_ACCESS_TOKEN_SECRET = process.env.ADMIN_ACCESS_TOKEN_SECRET as string;
const ADMIN_REFRESH_TOKEN_SECRET = process.env.ADMIN_REFRESH_TOKEN_SECRET as string;

if (!ADMIN_ACCESS_TOKEN_SECRET || !ADMIN_REFRESH_TOKEN_SECRET) {
  throw new Error(
    "ADMIN_ACCESS_TOKEN_SECRET / ADMIN_REFRESH_TOKEN_SECRET are not defined in environment variables"
  );
}

export interface AdminAccessTokenPayload {
  adminId: string;
  email: string;
}

export interface AdminRefreshTokenPayload {
  adminId: string;
  sessionId: string;
}

export function generateAdminAccessToken(adminId: string, email: string): string {
  return jwt.sign({ adminId, email } as AdminAccessTokenPayload, ADMIN_ACCESS_TOKEN_SECRET, {
    expiresIn: "15m",
  });
}

export function generateAdminRefreshToken(adminId: string, sessionId: string): string {
  return jwt.sign(
    { adminId, sessionId } as AdminRefreshTokenPayload,
    ADMIN_REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" } // shorter-lived than the user-facing app's 30d, by design
  );
}

export function verifyAdminAccessToken(token: string): AdminAccessTokenPayload {
  return jwt.verify(token, ADMIN_ACCESS_TOKEN_SECRET) as AdminAccessTokenPayload;
}

export function verifyAdminRefreshToken(token: string): AdminRefreshTokenPayload {
  return jwt.verify(token, ADMIN_REFRESH_TOKEN_SECRET) as AdminRefreshTokenPayload;
}

// Refresh tokens are stored hashed (never plaintext) in AdminSession
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Distinct cookie names from doonmeet's own access_token/refresh_token —
// so a cookie leaked/stolen from one app is meaningless on the other.
const ADMIN_ACCESS_COOKIE = "admin_access_token";
const ADMIN_REFRESH_COOKIE = "admin_refresh_token";

export function setAdminAuthCookies(
  response: Response,
  accessToken: string,
  refreshToken: string
): void {
  const isProd = process.env.NODE_ENV === "production";
  const secureFlag = isProd ? "; Secure" : "";

  response.headers.append(
    "Set-Cookie",
    `${ADMIN_ACCESS_COOKIE}=${accessToken}; HttpOnly; Path=/; Max-Age=900; SameSite=Strict${secureFlag}`
  );
  response.headers.append(
    "Set-Cookie",
    `${ADMIN_REFRESH_COOKIE}=${refreshToken}; HttpOnly; Path=/api/admin/auth; Max-Age=604800; SameSite=Strict${secureFlag}`
  );
}

export function clearAdminAuthCookies(response: Response): void {
  response.headers.append(
    "Set-Cookie",
    `${ADMIN_ACCESS_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict`
  );
  response.headers.append(
    "Set-Cookie",
    `${ADMIN_REFRESH_COOKIE}=; HttpOnly; Path=/api/admin/auth; Max-Age=0; SameSite=Strict`
  );
}

export { ADMIN_ACCESS_COOKIE, ADMIN_REFRESH_COOKIE };
