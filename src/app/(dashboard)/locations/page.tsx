"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Search, MapPinned, ExternalLink, EyeOff, Eye, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { Pagination, EmptyState, SkeletonRow } from "@/components/ui/Feedback";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { apiFetch, ApiError } from "@/lib/apiClient";
import type { AdminLocationItem, LocationStats } from "@/types/location";
import { cn } from "@/lib/cn";

type VisibilityFilter = "all" | "visible" | "hidden";

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<AdminLocationItem[] | null>(null);
  const [stats, setStats] = useState<LocationStats | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState<VisibilityFilter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLocations = useCallback((p: number, s: string, v: VisibilityFilter) => {
    setLocations(null);
    const params = new URLSearchParams({ page: String(p), limit: "30" });
    if (s) params.set("search", s);
    if (v !== "all") params.set("visibility", v);

    apiFetch<{
      success: boolean;
      locations: AdminLocationItem[];
      stats: LocationStats;
      pagination: { page: number; totalPages: number };
    }>(`/api/admin/locations?${params.toString()}`)
      .then((data) => {
        setLocations(data.locations);
        setStats(data.stats);
        setTotalPages(data.pagination.totalPages);
      })
      .catch(() => setLocations([]));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-param-change pattern
    fetchLocations(page, search, visibility);
  }, [page, visibility, fetchLocations, search]);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchLocations(1, value, visibility);
    }, 350);
  }

  function handleVisibilityChange(value: VisibilityFilter) {
    setVisibility(value);
    setPage(1);
    fetchLocations(1, search, value);
  }

  async function toggleVisibility(loc: AdminLocationItem) {
    setBusyId(loc._id);
    try {
      await apiFetch(`/api/admin/locations/${loc._id}`, {
        method: "PATCH",
        body: JSON.stringify({ isVisible: !loc.isVisible }),
      });
      fetchLocations(page, search, visibility);
      setToast({ type: "success", message: loc.isVisible ? "Hidden from map" : "Made visible" });
    } catch (e) {
      setToast({ type: "error", message: e instanceof ApiError ? e.message : "Action failed" });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(locationId: string) {
    setBusyId(locationId);
    try {
      await apiFetch(`/api/admin/locations/${locationId}`, { method: "DELETE" });
      fetchLocations(page, search, visibility);
      setToast({ type: "success", message: "Check-in removed" });
    } catch (e) {
      setToast({ type: "error", message: e instanceof ApiError ? e.message : "Delete failed" });
    } finally {
      setBusyId(null);
      setConfirmDeleteId(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Locations</h1>
        <p className="text-sm text-muted mt-1">Live check-ins currently shown on the map.</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6 max-w-md">
        <StatCard label="Total" value={stats ? stats.total : "–"} icon={MapPinned} />
        <StatCard label="Visible" value={stats ? stats.visible : "–"} icon={Eye} />
        <StatCard
          label="Hidden"
          value={stats ? stats.hidden : "–"}
          icon={EyeOff}
          tone={stats && stats.hidden > 0 ? "warning" : "default"}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="h-4 w-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by user..."
            className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 transition-colors"
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "visible", "hidden"] as VisibilityFilter[]).map((v) => (
            <button
              key={v}
              onClick={() => handleVisibilityChange(v)}
              className={cn(
                "text-xs font-medium px-3 py-2 rounded-lg border capitalize whitespace-nowrap transition-colors shrink-0",
                visibility === v
                  ? "bg-accent/10 border-accent/25 text-accent"
                  : "bg-surface border-border text-muted hover:text-foreground"
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {locations === null && (
          <table className="w-full">
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonRow key={i} cols={4} />
              ))}
            </tbody>
          </table>
        )}

        {locations?.length === 0 && (
          <EmptyState icon={MapPinned} title="No check-ins found" description="Nobody is currently on the map." />
        )}

        {locations && locations.length > 0 && (
          <div className="divide-y divide-border">
            {locations.map((loc) => (
              <div key={loc._id} className="flex items-center gap-3 px-4 py-3">
                <div className="h-8 w-8 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center text-[11px] font-medium text-accent shrink-0">
                  {(loc.user?.name ?? "?")
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-foreground truncate">
                      {loc.user?.name ?? "Deleted user"}
                    </p>
                    <Badge tone={loc.isVisible ? "positive" : "neutral"}>
                      {loc.isVisible ? "Visible" : "Hidden"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted truncate mt-0.5">
                    {loc.label ?? "No label"} · {formatDateTime(loc.checkedInAt)}
                  </p>
                </div>
                <a
                  href={`https://www.google.com/maps?q=${loc.coords.lat},${loc.coords.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted hover:text-foreground transition-colors shrink-0 p-1.5"
                  title="Open in Google Maps"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button
                  onClick={() => toggleVisibility(loc)}
                  disabled={busyId === loc._id}
                  className="text-muted hover:text-warning transition-colors shrink-0 p-1.5"
                  title={loc.isVisible ? "Hide from map" : "Make visible"}
                >
                  {busyId === loc._id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : loc.isVisible ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  onClick={() => setConfirmDeleteId(loc._id)}
                  className="text-muted hover:text-danger transition-colors shrink-0 p-1.5"
                  title="Remove check-in"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Remove this check-in?"
        description="This removes the user's location from the map. They can check in again later."
        confirmLabel="Remove"
        danger
        loading={!!busyId}
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
