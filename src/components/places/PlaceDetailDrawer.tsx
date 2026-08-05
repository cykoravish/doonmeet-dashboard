"use client";

import { useEffect, useState, useCallback } from "react";
import { Star, Trash2, Loader2, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/Feedback";
import { apiFetch, ApiError } from "@/lib/apiClient";
import type { AdminPlaceListItem, PlaceStats, PlaceReviewItem } from "@/types/place";

type Tab = "overview" | "reviews" | "danger";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i < rating ? "fill-warning text-warning" : "text-border"}`}
        />
      ))}
    </div>
  );
}

export function PlaceDetailDrawer({
  placeId,
  onClose,
  onChanged,
}: {
  placeId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [place, setPlace] = useState<AdminPlaceListItem | null>(null);
  const [stats, setStats] = useState<PlaceStats | null>(null);
  const [reviews, setReviews] = useState<PlaceReviewItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [title, setTitle] = useState("");
  const [image, setImage] = useState("");
  const [category, setCategory] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [about, setAbout] = useState("");
  const [highlights, setHighlights] = useState<string[]>([]);
  const [highlightInput, setHighlightInput] = useState("");
  const [bestTimeToVisit, setBestTimeToVisit] = useState("");
  const [howToReach, setHowToReach] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    apiFetch<{ success: boolean; place: AdminPlaceListItem; stats: PlaceStats }>(
      `/api/admin/places/${placeId}`
    )
      .then((data) => {
        setPlace(data.place);
        setStats(data.stats);
        setTitle(data.place.title);
        setImage(data.place.image);
        setCategory(data.place.category);
        setShortDescription(data.place.shortDescription);
        setAbout(data.place.about);
        setHighlights(data.place.highlights);
        setBestTimeToVisit(data.place.bestTimeToVisit);
        setHowToReach(data.place.howToReach);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load place"))
      .finally(() => setLoading(false));
  }, [placeId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    load();
  }, [load]);

  useEffect(() => {
    if (tab !== "reviews" || reviews) return;
    apiFetch<{ success: boolean; reviews: PlaceReviewItem[] }>(
      `/api/admin/places/${placeId}/reviews?limit=50`
    )
      .then((data) => setReviews(data.reviews))
      .catch(() => setReviews([]));
  }, [tab, reviews, placeId]);

  function addHighlight() {
    const value = highlightInput.trim();
    if (!value || highlights.length >= 10) return;
    setHighlights((prev) => [...prev, value]);
    setHighlightInput("");
  }

  function removeHighlight(index: number) {
    setHighlights((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/places/${placeId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title,
          image,
          category,
          shortDescription,
          about,
          highlights,
          bestTimeToVisit,
          howToReach,
        }),
      });
      onChanged();
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function removeReview(reviewId: string) {
    try {
      await apiFetch(`/api/admin/places/${placeId}/reviews/${reviewId}`, { method: "DELETE" });
      setReviews((prev) => prev?.filter((r) => r._id !== reviewId) ?? null);
      onChanged();
    } catch {
      // no-op
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await apiFetch(`/api/admin/places/${placeId}`, { method: "DELETE" });
      onChanged();
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed");
      setSaving(false);
      setConfirmDelete(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-5 w-5 text-muted animate-spin" />
      </div>
    );
  }

  if (!place) {
    return <div className="p-5 text-sm text-danger">{error ?? "Could not load place."}</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={place.image} alt={place.title} className="w-full h-32 object-cover" />
        <div className="px-5 py-3">
          <p className="text-sm font-medium text-foreground truncate">{place.title}</p>
          <p className="text-xs text-muted mt-0.5">{place.category}</p>
        </div>
      </div>

      <div className="flex border-b border-border px-2 shrink-0">
        {(["overview", "reviews", "danger"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2.5 text-xs font-medium capitalize border-b-2 -mb-px transition-colors ${
              tab === t
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t === "danger" ? "Danger zone" : t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {error && (
          <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2 mb-4">
            {error}
          </div>
        )}

        {tab === "overview" && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <StatBlock label="Reviews" value={stats?.reviewCount ?? 0} />
              <StatBlock
                label="Avg rating"
                value={stats?.avgRating != null ? stats.avgRating : "—"}
              />
            </div>

            <Field label="Title">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40"
              />
            </Field>

            <Field label="Image URL">
              <input
                value={image}
                onChange={(e) => setImage(e.target.value)}
                className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40"
              />
            </Field>

            <Field label="Category">
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40"
              />
            </Field>

            <Field label="Short description">
              <input
                maxLength={200}
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40"
              />
            </Field>

            <Field label="About">
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                rows={4}
                className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 resize-none"
              />
            </Field>

            <Field label="Highlights">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {highlights.map((h, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-xs bg-surface-raised border border-border rounded-full pl-2.5 pr-1.5 py-1 text-foreground"
                  >
                    {h}
                    <button
                      onClick={() => removeHighlight(i)}
                      className="text-muted hover:text-danger transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              {highlights.length < 10 && (
                <div className="flex gap-1.5">
                  <input
                    value={highlightInput}
                    onChange={(e) => setHighlightInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addHighlight();
                      }
                    }}
                    placeholder="Add a highlight..."
                    className="flex-1 bg-surface-raised border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40"
                  />
                  <Button type="button" variant="secondary" size="sm" onClick={addHighlight}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </Field>

            <div className="grid grid-cols-1 gap-3">
              <Field label="Best time to visit">
                <input
                  value={bestTimeToVisit}
                  onChange={(e) => setBestTimeToVisit(e.target.value)}
                  className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40"
                />
              </Field>
              <Field label="How to reach">
                <textarea
                  value={howToReach}
                  onChange={(e) => setHowToReach(e.target.value)}
                  rows={2}
                  className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 resize-none"
                />
              </Field>
            </div>

            <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>
              Save changes
            </Button>

            <p className="text-xs text-muted pt-1">Added {formatDate(place.createdAt)}</p>
          </div>
        )}

        {tab === "reviews" && (
          <div>
            {reviews === null ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-4 w-4 text-muted animate-spin" />
              </div>
            ) : reviews.length === 0 ? (
              <EmptyState icon={Star} title="No reviews" description="Nobody has reviewed this place yet." />
            ) : (
              <div className="flex flex-col gap-2">
                {reviews.map((r) => (
                  <div key={r._id} className="bg-surface-raised border border-border rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium text-foreground">
                          {r.user?.name ?? "Deleted user"}
                        </p>
                        <StarRating rating={r.rating} />
                      </div>
                      <button
                        onClick={() => removeReview(r._id)}
                        className="text-muted hover:text-danger transition-colors shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-sm text-foreground mt-2">{r.text}</p>
                    <p className="text-[11px] text-muted mt-1.5">{formatDate(r.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "danger" && (
          <div className="border border-danger/20 bg-danger/5 rounded-xl p-4">
            <div className="flex items-start gap-2.5">
              <Trash2 className="h-4 w-4 mt-0.5 text-danger shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Delete this place</p>
                <p className="text-xs text-muted mt-0.5">
                  Permanently removes the place and all its reviews. This cannot be undone.
                </p>
              </div>
            </div>
            <Button
              variant="danger"
              size="sm"
              className="mt-3"
              onClick={() => setConfirmDelete(true)}
            >
              Delete place
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this place?"
        description={`This permanently deletes "${place.title}" and all its reviews.`}
        confirmLabel="Delete permanently"
        danger
        loading={saving}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-surface-raised border border-border rounded-lg p-3">
      <p className="text-xl font-semibold text-foreground font-mono tabular-nums">{value}</p>
      <p className="text-xs text-muted mt-0.5">{label}</p>
    </div>
  );
}
