// Per-IP sliding-window rate limiter for the admin app.
// In-memory Map — fine for a single-instance admin dashboard.
// ============================================================
import { NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix: string;
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, keyPrefix } = options;

  return function checkRateLimit(req: NextRequest, identifierOverride?: string): NextResponse | null {
    const identifier = identifierOverride ?? getClientIp(req);
    const key = `${keyPrefix}:${identifier}`;
    const now = Date.now();

    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return null;
    }

    entry.count += 1;

    if (entry.count > max) {
      const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
      return NextResponse.json(
        {
          success: false,
          message: "Too many attempts. Please slow down.",
          retryAfter: retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSeconds),
          },
        }
      );
    }

    return null;
  };
}

// Login — strict, since this is the front door to full platform control
export const adminLoginLimiter = rateLimit({
  keyPrefix: "admin_login",
  windowMs: 15 * 60 * 1000,
  max: 8,
});

// General authenticated admin API traffic
export const adminApiLimiter = rateLimit({
  keyPrefix: "admin_api",
  windowMs: 60 * 1000,
  max: 300,
});

setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt) store.delete(key);
    }
  },
  10 * 60 * 1000
);
