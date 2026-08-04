"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck, Loader2 } from "lucide-react";

interface AdminInfo {
  _id: string;
  name: string;
  email: string;
  lastLoginAt: string | null;
}

export default function Home() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setAdmin(data.admin);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 text-muted animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-accent/10 border border-accent/25 flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-accent" />
          </div>
          <span className="text-sm font-medium text-foreground">DoonMeet Control</span>
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-medium text-foreground">
            Welcome{admin ? `, ${admin.name}` : ""}
          </h1>
          <p className="text-sm text-muted mt-2">
            Admin auth is live. The full dashboard — users, communities, events, places, chat
            moderation — is being built out next, module by module.
          </p>
        </div>
      </main>
    </div>
  );
}
