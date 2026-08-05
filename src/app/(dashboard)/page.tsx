"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  Ban,
  UserRoundX,
  ShieldAlert,
  TrendingUp,
  ArrowRight,
  Users2,
  MessageSquare,
  EyeOff,
  CalendarDays,
  FileEdit,
  CalendarClock,
  MapPin,
  Star,
  Tag,
  MapPinned,
  Eye,
  ScrollText,
  MessageCircle,
} from "lucide-react";
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

interface CommunityStats {
  total: number;
  active: number;
  inactive: number;
  totalPosts: number;
}

interface EventStats {
  total: number;
  published: number;
  draft: number;
  cancelled: number;
  upcoming: number;
}

interface PlaceStats {
  total: number;
  categoryCount: number;
  totalReviews: number;
  avgRating: number | null;
}

interface LocationStats {
  total: number;
  visible: number;
  hidden: number;
}

export default function OverviewPage() {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [communityStats, setCommunityStats] = useState<CommunityStats | null>(null);
  const [eventStats, setEventStats] = useState<EventStats | null>(null);
  const [placeStats, setPlaceStats] = useState<PlaceStats | null>(null);
  const [locationStats, setLocationStats] = useState<LocationStats | null>(null);

  useEffect(() => {
    apiFetch<{ success: boolean; stats: UserStats }>("/api/admin/users/stats")
      .then((data) => setUserStats(data.stats))
      .catch(() => {});
    apiFetch<{ success: boolean; stats: CommunityStats }>("/api/admin/communities/stats")
      .then((data) => setCommunityStats(data.stats))
      .catch(() => {});
    apiFetch<{ success: boolean; stats: EventStats }>("/api/admin/events/stats")
      .then((data) => setEventStats(data.stats))
      .catch(() => {});
    apiFetch<{ success: boolean; stats: PlaceStats }>("/api/admin/places/stats")
      .then((data) => setPlaceStats(data.stats))
      .catch(() => {});
    apiFetch<{ success: boolean; stats: LocationStats }>("/api/admin/locations?limit=1")
      .then((data) => setLocationStats(data.stats))
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
        <StatCard label="Total users" value={userStats ? userStats.total : "–"} icon={Users} />
        <StatCard label="Active" value={userStats ? userStats.active : "–"} icon={UserCheck} />
        <StatCard
          label="Banned"
          value={userStats ? userStats.banned : "–"}
          icon={Ban}
          tone={userStats && userStats.banned > 0 ? "danger" : "default"}
        />
        <StatCard label="Guests" value={userStats ? userStats.guests : "–"} icon={UserRoundX} />
        <StatCard
          label="Unverified"
          value={userStats ? userStats.unverified : "–"}
          icon={ShieldAlert}
          tone={userStats && userStats.unverified > 0 ? "warning" : "default"}
        />
        <StatCard
          label="New this week"
          value={userStats ? userStats.newThisWeek : "–"}
          icon={TrendingUp}
        />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-medium text-muted uppercase tracking-wide">Communities</h2>
        <Link
          href="/communities"
          className="text-xs text-accent hover:brightness-110 flex items-center gap-1"
        >
          Manage communities
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard label="Total" value={communityStats ? communityStats.total : "–"} icon={Users2} />
        <StatCard
          label="Active"
          value={communityStats ? communityStats.active : "–"}
          icon={UserCheck}
        />
        <StatCard
          label="Deactivated"
          value={communityStats ? communityStats.inactive : "–"}
          icon={EyeOff}
          tone={communityStats && communityStats.inactive > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Total posts"
          value={communityStats ? communityStats.totalPosts : "–"}
          icon={MessageSquare}
        />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-medium text-muted uppercase tracking-wide">Events</h2>
        <Link
          href="/events"
          className="text-xs text-accent hover:brightness-110 flex items-center gap-1"
        >
          Manage events
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
        <StatCard label="Total" value={eventStats ? eventStats.total : "–"} icon={CalendarDays} />
        <StatCard
          label="Upcoming"
          value={eventStats ? eventStats.upcoming : "–"}
          icon={CalendarClock}
        />
        <StatCard
          label="Published"
          value={eventStats ? eventStats.published : "–"}
          icon={UserCheck}
        />
        <StatCard label="Draft" value={eventStats ? eventStats.draft : "–"} icon={FileEdit} />
        <StatCard
          label="Cancelled"
          value={eventStats ? eventStats.cancelled : "–"}
          icon={Ban}
          tone={eventStats && eventStats.cancelled > 0 ? "danger" : "default"}
        />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-medium text-muted uppercase tracking-wide">Places</h2>
        <Link
          href="/places"
          className="text-xs text-accent hover:brightness-110 flex items-center gap-1"
        >
          Manage places
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard label="Total" value={placeStats ? placeStats.total : "–"} icon={MapPin} />
        <StatCard
          label="Categories"
          value={placeStats ? placeStats.categoryCount : "–"}
          icon={Tag}
        />
        <StatCard
          label="Reviews"
          value={placeStats ? placeStats.totalReviews : "–"}
          icon={MessageSquare}
        />
        <StatCard
          label="Avg rating"
          value={placeStats?.avgRating != null ? placeStats.avgRating : "–"}
          icon={Star}
        />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-medium text-muted uppercase tracking-wide">Locations</h2>
        <Link
          href="/locations"
          className="text-xs text-accent hover:brightness-110 flex items-center gap-1"
        >
          View map activity
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8 max-w-md">
        <StatCard label="Total" value={locationStats ? locationStats.total : "–"} icon={MapPinned} />
        <StatCard label="Visible" value={locationStats ? locationStats.visible : "–"} icon={Eye} />
        <StatCard
          label="Hidden"
          value={locationStats ? locationStats.hidden : "–"}
          icon={EyeOff}
          tone={locationStats && locationStats.hidden > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-md">
        <Link
          href="/chat"
          className="bg-surface border border-border rounded-xl p-4 hover:border-accent/30 transition-colors flex items-center gap-3"
        >
          <div className="h-9 w-9 rounded-lg bg-surface-raised border border-border flex items-center justify-center shrink-0">
            <MessageCircle className="h-4 w-4 text-muted" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Chat</p>
            <p className="text-xs text-muted mt-0.5">Moderate DMs & room chat</p>
          </div>
        </Link>
        <Link
          href="/audit-log"
          className="bg-surface border border-border rounded-xl p-4 hover:border-accent/30 transition-colors flex items-center gap-3"
        >
          <div className="h-9 w-9 rounded-lg bg-surface-raised border border-border flex items-center justify-center shrink-0">
            <ScrollText className="h-4 w-4 text-muted" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Audit log</p>
            <p className="text-xs text-muted mt-0.5">Every admin action</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
