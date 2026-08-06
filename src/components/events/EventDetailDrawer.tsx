"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users2,
  MessageSquare,
  Trash2,
  Ban,
  RotateCcw,
  Loader2,
  UserX,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/Feedback";
import { apiFetch, ApiError } from "@/lib/apiClient";
import type {
  AdminEventListItem,
  EventStats,
  EventAttendee,
  EventCommentItem,
  EventStatus,
} from "@/types/event";

type Tab = "overview" | "attendees" | "comments" | "danger";

function toLocalDatetimeInputValue(iso: string): string {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EventDetailDrawer({
  eventId,
  onClose,
  onChanged,
}: {
  eventId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [event, setEvent] = useState<AdminEventListItem | null>(null);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [attendees, setAttendees] = useState<EventAttendee[] | null>(null);
  const [comments, setComments] = useState<EventCommentItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [capacity, setCapacity] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    apiFetch<{ success: boolean; event: AdminEventListItem; stats: EventStats }>(
      `/api/admin/events/${eventId}`
    )
      .then((data) => {
        setEvent(data.event);
        setStats(data.stats);
        setTitle(data.event.title);
        setDescription(data.event.description);
        setDate(toLocalDatetimeInputValue(data.event.date));
        setLocationName(data.event.location?.name ?? "");
        setLocationAddress(data.event.location?.address ?? "");
        setCapacity(data.event.capacity ? String(data.event.capacity) : "");
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load event"))
      .finally(() => setLoading(false));
  }, [eventId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    load();
  }, [load]);

  useEffect(() => {
    if (tab !== "attendees" || attendees) return;
    apiFetch<{ success: boolean; attendees: EventAttendee[] }>(
      `/api/admin/events/${eventId}/attendees?limit=50`
    )
      .then((data) => setAttendees(data.attendees))
      .catch(() => setAttendees([]));
  }, [tab, attendees, eventId]);

  useEffect(() => {
    if (tab !== "comments" || comments) return;
    apiFetch<{ success: boolean; comments: EventCommentItem[] }>(
      `/api/admin/events/${eventId}/comments?limit=50`
    )
      .then((data) => setComments(data.comments))
      .catch(() => setComments([]));
  }, [tab, comments, eventId]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title,
          description,
          date: new Date(date).toISOString(),
          locationName,
          locationAddress,
          capacity: capacity ? Number(capacity) : null,
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

  async function setStatus(status: EventStatus) {
    setSaving(true);
    try {
      await apiFetch(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      onChanged();
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Action failed");
    } finally {
      setSaving(false);
    }
  }

  async function removeAttendee(rsvpId: string) {
    try {
      await apiFetch(`/api/admin/events/${eventId}/attendees/${rsvpId}`, { method: "DELETE" });
      setAttendees((prev) => prev?.filter((a) => a._id !== rsvpId) ?? null);
      onChanged();
    } catch {
      // no-op
    }
  }

  async function removeComment(commentId: string) {
    try {
      await apiFetch(`/api/admin/events/${eventId}/comments/${commentId}`, { method: "DELETE" });
      setComments((prev) => prev?.filter((c) => c._id !== commentId) ?? null);
    } catch {
      // no-op
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await apiFetch(`/api/admin/events/${eventId}`, { method: "DELETE" });
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

  if (!event) {
    return <div className="p-5 text-sm text-danger">{error ?? "Could not load event."}</div>;
  }

  const statusTone = event.status === "published" ? "positive" : event.status === "cancelled" ? "negative" : "neutral";

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-border">
        <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          <Badge tone={statusTone}>{event.status}</Badge>
          {event.community && <Badge tone="neutral">{event.community.name}</Badge>}
        </div>
      </div>

      <div className="flex border-b border-border px-2 shrink-0 overflow-x-auto">
        {(["overview", "attendees", "comments", "danger"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2.5 text-xs font-medium capitalize border-b-2 -mb-px transition-colors whitespace-nowrap ${
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
              <StatBlock label="RSVPs" value={stats?.rsvpCount ?? 0} />
              <StatBlock label="Comments" value={event.commentCount} />
            </div>

            <Field label="Title">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40"
              />
            </Field>

            <Field label="Description">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 resize-none"
              />
            </Field>

            <Field label="Date & time">
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Location name">
                <input
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40"
                />
              </Field>
              <Field label="Capacity">
                <input
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="Unlimited"
                  className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40"
                />
              </Field>
            </div>

            <Field label="Address">
              <input
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
                className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40"
              />
            </Field>

            <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>
              Save changes
            </Button>
          </div>
        )}

        {tab === "attendees" && (
          <div>
            {attendees === null ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-4 w-4 text-muted animate-spin" />
              </div>
            ) : attendees.length === 0 ? (
              <EmptyState icon={Users2} title="No RSVPs yet" description="Nobody has RSVP'd." />
            ) : (
              <div className="flex flex-col gap-2">
                {attendees.map((a) => (
                  <div
                    key={a._id}
                    className="flex items-center justify-between gap-3 bg-surface-raised border border-border rounded-lg px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">
                        {a.user?.name ?? "Deleted user"}
                      </p>
                      <p className="text-[11px] text-muted truncate">
                        {a.user?.email ?? "—"} · RSVP&apos;d {formatDateTime(a.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeAttendee(a._id)}
                      className="text-muted hover:text-danger transition-colors shrink-0 p-1"
                      title="Remove RSVP"
                    >
                      <UserX className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "comments" && (
          <div>
            {comments === null ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-4 w-4 text-muted animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <EmptyState icon={MessageSquare} title="No comments" description="Nothing here yet." />
            ) : (
              <div className="flex flex-col gap-2">
                {comments.map((c) => (
                  <div key={c._id} className="bg-surface-raised border border-border rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-foreground">
                        {c.author?.name ?? "Deleted user"}
                      </p>
                      <button
                        onClick={() => removeComment(c._id)}
                        className="text-muted hover:text-danger transition-colors shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-sm text-foreground mt-1">{c.content}</p>
                    <p className="text-[11px] text-muted mt-1.5">{formatDateTime(c.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "danger" && (
          <div className="flex flex-col gap-3">
            {event.status !== "cancelled" ? (
              <ActionCard
                icon={Ban}
                title="Cancel this event"
                description="Marks it as cancelled. Attendees and comments are kept, but it's no longer shown as active."
                buttonLabel="Cancel event"
                variant="danger"
                loading={saving}
                onClick={() => setStatus("cancelled")}
              />
            ) : (
              <ActionCard
                icon={RotateCcw}
                title="Restore this event"
                description="Sets it back to published."
                buttonLabel="Restore event"
                variant="secondary"
                loading={saving}
                onClick={() => setStatus("published")}
              />
            )}

            <ActionCard
              icon={Trash2}
              title="Delete this event"
              description="Permanently removes the event, RSVPs, and comments. This cannot be undone."
              buttonLabel="Delete event"
              variant="danger"
              loading={saving}
              onClick={() => setConfirmDelete(true)}
            />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this event?"
        description={`This permanently deletes "${event.title}" and all its RSVPs and comments.`}
        confirmLabel="Delete permanently"
        danger
        loading={saving}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface-raised border border-border rounded-lg p-3">
      <p className="text-xl font-semibold text-foreground font-mono tabular-nums">{value}</p>
      <p className="text-xs text-muted mt-0.5">{label}</p>
    </div>
  );
}

function ActionCard({
  icon: Icon,
  title,
  description,
  buttonLabel,
  variant,
  loading,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  buttonLabel: string;
  variant: "danger" | "secondary";
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`border rounded-xl p-4 ${
        variant === "danger" ? "border-danger/20 bg-danger/5" : "border-border bg-surface-raised"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <Icon
          className={`h-4 w-4 mt-0.5 shrink-0 ${
            variant === "danger" ? "text-danger" : "text-muted"
          }`}
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted mt-0.5">{description}</p>
        </div>
      </div>
      <Button variant={variant} size="sm" className="mt-3" loading={loading} onClick={onClick}>
        {buttonLabel}
      </Button>
    </div>
  );
}
