"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";

export interface AdminInfo {
  _id: string;
  name: string;
  email: string;
  lastLoginAt: string | null;
}

export function useAdmin() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ success: boolean; admin: AdminInfo }>("/api/admin/auth/me")
      .then((data) => {
        if (!cancelled) setAdmin(data.admin);
      })
      .catch(() => {
        // apiFetch already redirects to /login on unrecoverable 401
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }, [router]);

  return { admin, loading, logout };
}
