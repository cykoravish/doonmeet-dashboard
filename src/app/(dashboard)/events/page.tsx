"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Search, Plus, CalendarDays, MapPin, Users2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Pagination, EmptyState } from "@/components/ui/Feedback";
import { Drawer } from "@/components/ui/Drawer";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { EventDetailDrawer } from "@/components/events/EventDetailDrawer";
import { CreateEventModal } from "@/components/events/CreateEventModal";
import { apiFetch } from "@/lib/apiClient";
import type { AdminEventListItem, EventStatus } from "@/types/event";
import { cn } from "@/lib/cn";

type StatusFilter = "all" | EventStatus;
type WhenFilter = "all" | "upcoming" | "past";

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Published", value: "published" },
  { label: "Draft", value: "draft" },
  { label: "Cancelled", value: "cancelled" },
];

function formatDateBadge(d: string) {
  const date = new Date(d);
  return {
    day: date.toLocaleDateString("en-IN", { day: "2-digit" }),
    month: date.toLocaleDateString("en-IN", { month: "short" }).toUpperCase(),
  };
}

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export default function EventsPage() {
  const [events, setEvents] = useState<AdminEventListItem[] | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [when, setWhen] = useState<WhenFilter>("upcoming");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchEvents = useCallback(
    (p: number, s: string, st: StatusFilter, w: WhenFilter) => {
      setEvents(null);
      const params = new URLSearchParams({ page: String(p), limit: "20" });
      if (s) params.set("search", s);
      if (st !== "all") params.set("status", st);
      if (w !== "all") params.set("when", w);

      apiFetch<{
        success: boolean;
        events: AdminEventListItem[];
        pagination: { page: number; totalPages: number; total: number };
      }>(`/api/admin/events?${params.toString()}`)
        .then((data) => {
          setEvents(data.events);
          setTotalPages(data.pagination.totalPages);
          setTotal(data.pagination.total);
        })
        .catch(() => setEvents([]));
    },
    []
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-param-change pattern
    fetchEvents(page, search, status, when);
  }, [page, status, when, fetchEvents, search]);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchEvents(1, value, status, when);
    }, 350);
  }

  function handleFilterChange(next: { status?: StatusFilter; when?: WhenFilter }) {
    const newStatus = next.status ?? status;
    const newWhen = next.when ?? when;
    setStatus(newStatus);
    setWhen(newWhen);
    setPage(1);
    fetchEvents(1, search, newStatus, newWhen);
  }

  function handleChanged() {
    fetchEvents(page, search, status, when);
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-medium text-foreground">Events</h1>
          <p className="text-sm text-muted mt-1">
            {total > 0 ? `${total.toLocaleString("en-IN")} events` : "Create and manage events"}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Create</span>
        </Button>
      </div>

      <div className="flex flex-col gap-3 mb-4">
        <div className="relative sm:max-w-xs">
          <Search className="h-4 w-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search events..."
            className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 transition-colors"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["upcoming", "past", "all"] as WhenFilter[]).map((w) => (
            <button
              key={w}
              onClick={() => handleFilterChange({ when: w })}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-full border capitalize whitespace-nowrap transition-colors shrink-0",
                when === w
                  ? "bg-accent/10 border-accent/25 text-accent"
                  : "bg-surface border-border text-muted hover:text-foreground"
              )}
            >
              {w}
            </button>
          ))}
          <span className="w-px bg-border mx-1 my-1" />
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => handleFilterChange({ status: f.value })}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-full border capitalize whitespace-nowrap transition-colors shrink-0",
                status === f.value
                  ? "bg-accent/10 border-accent/25 text-accent"
                  : "bg-surface border-border text-muted hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {events === null && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl h-[72px] animate-pulse" />
          ))}
        </div>
      )}

      {events?.length === 0 && (
        <EmptyState
          icon={CalendarDays}
          title="No events found"
          description="Try a different search, filter, or create a new one."
        />
      )}

      {events && events.length > 0 && (
        <div className="flex flex-col gap-2">
          {events.map((e) => {
            const badge = formatDateBadge(e.date);
            const statusTone = e.status === "published" ? "positive" : e.status === "cancelled" ? "negative" : "neutral";
            return (
              <button
                key={e._id}
                onClick={() => setSelectedId(e._id)}
                className="text-left bg-surface border border-border rounded-xl p-3.5 flex items-center gap-4 hover:border-accent/30 transition-colors"
              >
                <div className="flex flex-col items-center justify-center bg-surface-raised border border-border rounded-lg w-12 h-12 shrink-0">
                  <span className="text-[10px] font-medium text-accent leading-none">
                    {badge.month}
                  </span>
                  <span className="text-base font-semibold text-foreground leading-tight font-mono">
                    {badge.day}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{e.title}</p>
                    <Badge tone={statusTone}>{e.status}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted mt-1">
                    <span>{formatTime(e.date)}</span>
                    {e.location?.name && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {e.location.name}
                      </span>
                    )}
                  </div>
                </div>

                {e.capacity && (
                  <div className="hidden sm:flex items-center gap-1 text-xs text-muted shrink-0">
                    <Users2 className="h-3 w-3" />
                    {e.capacity}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <Drawer open={!!selectedId} onClose={() => setSelectedId(null)} title="Event details">
        {selectedId && (
          <EventDetailDrawer
            eventId={selectedId}
            onClose={() => setSelectedId(null)}
            onChanged={() => {
              handleChanged();
              setToast({ type: "success", message: "Updated successfully" });
            }}
          />
        )}
      </Drawer>

      <CreateEventModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          handleChanged();
          setToast({ type: "success", message: "Event created" });
        }}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
