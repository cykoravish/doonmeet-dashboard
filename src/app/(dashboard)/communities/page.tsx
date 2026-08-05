"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Search, Plus, Users2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Pagination, EmptyState } from "@/components/ui/Feedback";
import { Drawer } from "@/components/ui/Drawer";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { CommunityDetailDrawer } from "@/components/communities/CommunityDetailDrawer";
import { CreateCommunityModal } from "@/components/communities/CreateCommunityModal";
import { apiFetch } from "@/lib/apiClient";
import type { AdminCommunityListItem, CommunityCategory } from "@/types/community";
import { cn } from "@/lib/cn";

type StatusFilter = "all" | "active" | "inactive";

const CATEGORY_FILTERS: { label: string; value: CommunityCategory | "all" }[] = [
  { label: "All", value: "all" },
  { label: "General", value: "general" },
  { label: "Tech", value: "tech" },
  { label: "Nature", value: "nature" },
  { label: "Food", value: "food" },
  { label: "Photography", value: "photography" },
  { label: "Sports", value: "sports" },
  { label: "Arts", value: "arts" },
];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<AdminCommunityListItem[] | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CommunityCategory | "all">("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCommunities = useCallback(
    (p: number, s: string, cat: CommunityCategory | "all", st: StatusFilter) => {
      setCommunities(null);
      const params = new URLSearchParams({ page: String(p), limit: "12" });
      if (s) params.set("search", s);
      if (cat !== "all") params.set("category", cat);
      if (st !== "all") params.set("status", st);

      apiFetch<{
        success: boolean;
        communities: AdminCommunityListItem[];
        pagination: { page: number; totalPages: number; total: number };
      }>(`/api/admin/communities?${params.toString()}`)
        .then((data) => {
          setCommunities(data.communities);
          setTotalPages(data.pagination.totalPages);
          setTotal(data.pagination.total);
        })
        .catch(() => setCommunities([]));
    },
    []
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-param-change pattern
    fetchCommunities(page, search, category, status);
  }, [page, category, status, fetchCommunities, search]);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchCommunities(1, value, category, status);
    }, 350);
  }

  function handleFilterChange(next: { category?: CommunityCategory | "all"; status?: StatusFilter }) {
    const newCategory = next.category ?? category;
    const newStatus = next.status ?? status;
    setCategory(newCategory);
    setStatus(newStatus);
    setPage(1);
    fetchCommunities(1, search, newCategory, newStatus);
  }

  function handleChanged() {
    fetchCommunities(page, search, category, status);
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-medium text-foreground">Communities</h1>
          <p className="text-sm text-muted mt-1">
            {total > 0 ? `${total.toLocaleString("en-IN")} communities` : "Create and moderate communities"}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Create</span>
        </Button>
      </div>

      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="h-4 w-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search communities..."
              className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 transition-colors"
            />
          </div>
          <div className="flex gap-1.5">
            {(["all", "active", "inactive"] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => handleFilterChange({ status: s })}
                className={cn(
                  "text-xs font-medium px-3 py-2 rounded-lg border capitalize whitespace-nowrap transition-colors shrink-0",
                  status === s
                    ? "bg-accent/10 border-accent/25 text-accent"
                    : "bg-surface border-border text-muted hover:text-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => handleFilterChange({ category: f.value })}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors shrink-0",
                category === f.value
                  ? "bg-accent/10 border-accent/25 text-accent"
                  : "bg-surface border-border text-muted hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {communities === null && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl h-36 animate-pulse" />
          ))}
        </div>
      )}

      {communities?.length === 0 && (
        <EmptyState
          icon={Users2}
          title="No communities found"
          description="Try a different search, filter, or create a new one."
        />
      )}

      {communities && communities.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {communities.map((c) => (
            <button
              key={c._id}
              onClick={() => setSelectedId(c._id)}
              className="text-left bg-surface border border-border rounded-xl p-4 flex flex-col gap-2.5 hover:border-accent/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="h-9 w-9 rounded-lg bg-accent/15 border border-accent/25 flex items-center justify-center text-xs font-medium text-accent uppercase shrink-0">
                  {c.name.slice(0, 2)}
                </div>
                <Badge tone={c.isActive ? "positive" : "negative"}>
                  {c.isActive ? "Active" : "Off"}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                <p className="text-xs text-muted mt-0.5 line-clamp-2">
                  {c.description || "No description"}
                </p>
              </div>
              <div className="flex items-center justify-between mt-auto pt-1">
                <Badge tone="neutral">{c.category}</Badge>
                <div className="flex items-center gap-3 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <Users2 className="h-3 w-3" />
                    {c.memberCount}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-muted/70">Created {formatDate(c.createdAt)}</p>
            </button>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <Drawer open={!!selectedId} onClose={() => setSelectedId(null)} title="Community details">
        {selectedId && (
          <CommunityDetailDrawer
            communityId={selectedId}
            onClose={() => setSelectedId(null)}
            onChanged={() => {
              handleChanged();
              setToast({ type: "success", message: "Updated successfully" });
            }}
          />
        )}
      </Drawer>

      <CreateCommunityModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          handleChanged();
          setToast({ type: "success", message: "Community created" });
        }}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
