"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, UserCheck, Ban, UserRoundX, ShieldAlert, TrendingUp, ArrowRight } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { apiFetch } from "@/lib/apiClient";

interface UserStats {
  total: number;
  active: number;
  banned: number;
  guests: number;
  unverified: number;
  newThisWeek: number;
}

export default function OverviewPage() {
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    apiFetch<{ success: boolean; stats: UserStats }>("/api/admin/users/stats")
      .then((data) => setStats(data.stats))
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Overview</h1>
        <p className="text-sm text-muted mt-1">A snapshot of what&apos;s happening on DoonMeet.</p>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-medium text-muted uppercase tracking-wide">Users</h2>
        <Link
          href="/users"
          className="text-xs text-accent hover:brightness-110 flex items-center gap-1"
        >
          Manage users
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <StatCard label="Total users" value={stats ? stats.total : "–"} icon={Users} />
        <StatCard label="Active" value={stats ? stats.active : "–"} icon={UserCheck} />
        <StatCard
          label="Banned"
          value={stats ? stats.banned : "–"}
          icon={Ban}
          tone={stats && stats.banned > 0 ? "danger" : "default"}
        />
        <StatCard label="Guests" value={stats ? stats.guests : "–"} icon={UserRoundX} />
        <StatCard
          label="Unverified"
          value={stats ? stats.unverified : "–"}
          icon={ShieldAlert}
          tone={stats && stats.unverified > 0 ? "warning" : "default"}
        />
        <StatCard label="New this week" value={stats ? stats.newThisWeek : "–"} icon={TrendingUp} />
      </div>

      <h2 className="text-xs font-medium text-muted uppercase tracking-wide mb-3">
        Other modules
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {["Communities", "Events", "Places", "Chat", "Locations"].map((name) => (
          <div
            key={name}
            className="bg-surface border border-border rounded-xl p-4 opacity-50 select-none"
          >
            <p className="text-sm font-medium text-foreground">{name}</p>
            <p className="text-xs text-muted mt-1">Coming soon</p>
          </div>
        ))}
      </div>
    </div>
  );
}
