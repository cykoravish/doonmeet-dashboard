"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Search, Plus, MapPin, Star } from "lucide-react";
import { Pagination, EmptyState } from "@/components/ui/Feedback";
import { Drawer } from "@/components/ui/Drawer";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { PlaceDetailDrawer } from "@/components/places/PlaceDetailDrawer";
import { CreatePlaceModal } from "@/components/places/CreatePlaceModal";
import { apiFetch } from "@/lib/apiClient";
import type { AdminPlaceListItem } from "@/types/place";
import { cn } from "@/lib/cn";

export default function PlacesPage() {
  const [places, setPlaces] = useState<AdminPlaceListItem[] | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPlaces = useCallback((p: number, s: string, cat: string) => {
    setPlaces(null);
    const params = new URLSearchParams({ page: String(p), limit: "12" });
    if (s) params.set("search", s);
    if (cat !== "all") params.set("category", cat);

    apiFetch<{
      success: boolean;
      places: AdminPlaceListItem[];
      categories: string[];
      pagination: { page: number; totalPages: number; total: number };
    }>(`/api/admin/places?${params.toString()}`)
      .then((data) => {
        setPlaces(data.places);
        setCategories(data.categories);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      })
      .catch(() => setPlaces([]));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-param-change pattern
    fetchPlaces(page, search, category);
  }, [page, category, fetchPlaces, search]);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchPlaces(1, value, category);
    }, 350);
  }

  function handleCategoryChange(value: string) {
    setCategory(value);
    setPage(1);
    fetchPlaces(1, search, value);
  }

  function handleChanged() {
    fetchPlaces(page, search, category);
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-medium text-foreground">Places</h1>
          <p className="text-sm text-muted mt-1">
            {total > 0 ? `${total.toLocaleString("en-IN")} places` : "Curate local spots and moderate reviews"}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Add place</span>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="h-4 w-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search places..."
            className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 transition-colors"
          />
        </div>
        {categories.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => handleCategoryChange("all")}
              className={cn(
                "text-xs font-medium px-3 py-2 rounded-lg border capitalize whitespace-nowrap transition-colors shrink-0",
                category === "all"
                  ? "bg-accent/10 border-accent/25 text-accent"
                  : "bg-surface border-border text-muted hover:text-foreground"
              )}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => handleCategoryChange(c)}
                className={cn(
                  "text-xs font-medium px-3 py-2 rounded-lg border capitalize whitespace-nowrap transition-colors shrink-0",
                  category === c
                    ? "bg-accent/10 border-accent/25 text-accent"
                    : "bg-surface border-border text-muted hover:text-foreground"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {places === null && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl h-56 animate-pulse" />
          ))}
        </div>
      )}

      {places?.length === 0 && (
        <EmptyState
          icon={MapPin}
          title="No places found"
          description="Try a different search, filter, or add a new one."
        />
      )}

      {places && places.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {places.map((p) => (
            <button
              key={p._id}
              onClick={() => setSelectedId(p._id)}
              className="text-left bg-surface border border-border rounded-xl overflow-hidden hover:border-accent/30 transition-colors flex flex-col"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.image}
                alt={p.title}
                className="w-full h-32 object-cover bg-surface-raised"
                loading="lazy"
              />
              <div className="p-3.5 flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                  {p.avgRating != null && (
                    <span className="flex items-center gap-0.5 text-xs text-warning shrink-0">
                      <Star className="h-3 w-3 fill-warning" />
                      {p.avgRating}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted line-clamp-2">{p.shortDescription}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[11px] text-muted bg-surface-raised border border-border rounded-full px-2 py-0.5 capitalize">
                    {p.category}
                  </span>
                  <span className="text-[11px] text-muted">{p.reviewCount} reviews</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <Drawer open={!!selectedId} onClose={() => setSelectedId(null)} title="Place details">
        {selectedId && (
          <PlaceDetailDrawer
            placeId={selectedId}
            onClose={() => setSelectedId(null)}
            onChanged={() => {
              handleChanged();
              setToast({ type: "success", message: "Updated successfully" });
            }}
          />
        )}
      </Drawer>

      <CreatePlaceModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          handleChanged();
          setToast({ type: "success", message: "Place added" });
        }}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
