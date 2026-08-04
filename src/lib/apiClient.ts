// Thin fetch wrapper for the admin app. On a 401 it tries a single silent
// refresh (via the httpOnly refresh cookie) and retries the request once
// before giving up and sending the user to /login.
// ============================================================

let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch("/api/admin/auth/refresh", { method: "POST" })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T = unknown>(
  input: string,
  init?: RequestInit,
  _retried = false
): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  if (res.status === 401 && !_retried) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return apiFetch<T>(input, init, true);
    }
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError("Session expired", 401);
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // no body
  }

  const body = (data ?? {}) as { success?: boolean; message?: string; code?: string };

  if (!res.ok || body.success === false) {
    throw new ApiError(body.message ?? "Request failed", res.status, body.code);
  }

  return data as T;
}
