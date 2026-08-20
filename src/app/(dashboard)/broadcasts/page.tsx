"use client";

import { useEffect, useState, useCallback } from "react";
import { Megaphone, Send, Eye, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Pagination, EmptyState, SkeletonRow } from "@/components/ui/Feedback";
import { Drawer } from "@/components/ui/Drawer";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { apiFetch } from "@/lib/apiClient";
import type { BroadcastListItem, BroadcastReader } from "@/types/broadcast";

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ComposeForm({ onSent }: { onSent: () => void }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSending(true);

    try {
      const res = await apiFetch<{ success: boolean; message?: string }>("/api/admin/broadcasts", {
        method: "POST",
        body: JSON.stringify({ title, message, url: url || undefined }),
      });
      if (res.success) {
        setTitle("");
        setMessage("");
        setUrl("");
        onSent();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send broadcast.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface border border-border rounded-xl p-4 space-y-3 mb-6"
    >
      <div>
        <label className="text-xs font-medium text-muted mb-1 block">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          required
          placeholder="e.g. New feature: Push notifications!"
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted mb-1 block">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={500}
          required
          rows={3}
          placeholder="What do you want to tell everyone?"
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 resize-none"
        />
        <p className="text-[11px] text-muted mt-1">{message.length}/500</p>
      </div>
      <div>
        <label className="text-xs font-medium text-muted mb-1 block">Link (optional)</label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          type="url"
          placeholder="https://doonmeet.in/events/..."
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40"
        />
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <button
        type="submit"
        disabled={sending || !title.trim() || !message.trim()}
        className="flex items-center gap-2 bg-accent text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-accent/90 transition-colors"
      >
        <Send className="h-3.5 w-3.5" />
        {sending ? "Sending..." : "Send to all users"}
      </button>
      <p className="text-[11px] text-muted">
        Goes out as an in-app notification + browser push to every non-guest user.
      </p>
    </form>
  );
}

function ReadersDrawer({
  broadcastId,
  onClose,
}: {
  broadcastId: string;
  onClose: () => void;
}) {
  const [readers, setReaders] = useState<BroadcastReader[] | null>(null);

  useEffect(() => {
    apiFetch<{ success: boolean; readers: BroadcastReader[] }>(
      `/api/admin/broadcasts/${broadcastId}`
    )
      .then((data) => setReaders(data.readers))
      .catch(() => setReaders([]));
  }, [broadcastId]);

  return (
    <Drawer open onClose={onClose} title="Who's read this">
      {readers === null && <p className="text-sm text-muted p-4">Loading...</p>}
      {readers?.length === 0 && (
        <EmptyState icon={Eye} title="No one yet" description="No one has opened this notification yet." />
      )}
      {readers && readers.length > 0 && (
        <div className="divide-y divide-border">
          {readers.map((r) => (
            <div key={r.user._id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{r.user.name}</p>
                <p className="text-xs text-muted truncate">{r.user.email ?? "—"}</p>
              </div>
              <p className="text-[11px] text-muted font-mono shrink-0">{formatDateTime(r.readAt)}</p>
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}

export default function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<BroadcastListItem[] | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const fetchBroadcasts = useCallback((p: number) => {
    setBroadcasts(null);
    apiFetch<{
      success: boolean;
      broadcasts: BroadcastListItem[];
      pagination: { totalPages: number };
    }>(`/api/admin/broadcasts?page=${p}&limit=20`)
      .then((data) => {
        setBroadcasts(data.broadcasts);
        setTotalPages(data.pagination.totalPages);
      })
      .catch(() => setBroadcasts([]));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-param-change pattern
    fetchBroadcasts(page);
  }, [page, fetchBroadcasts]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Broadcast</h1>
        <p className="text-sm text-muted mt-1">
          Send an announcement to every user, in-app and via push notification.
        </p>
      </div>

      <ComposeForm
        onSent={() => {
          setToast({ type: "success", message: "Broadcast sent!" });
          fetchBroadcasts(1);
          setPage(1);
        }}
      />

      <h2 className="text-sm font-medium text-foreground mb-3">History</h2>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {broadcasts === null && (
          <table className="w-full">
            <tbody>
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonRow key={i} cols={4} />
              ))}
            </tbody>
          </table>
        )}

        {broadcasts?.length === 0 && (
          <EmptyState icon={Megaphone} title="No broadcasts yet" description="Send your first one above." />
        )}

        {broadcasts && broadcasts.length > 0 && (
          <div className="divide-y divide-border">
            {broadcasts.map((b) => (
              <div key={b._id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{b.title}</p>
                    <p className="text-xs text-muted mt-0.5 line-clamp-2">{b.message}</p>
                    {b.url && (
                      <a
                        href={b.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-accent mt-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {b.url}
                      </a>
                    )}
                  </div>
                  <p className="text-[11px] text-muted font-mono shrink-0">{formatDateTime(b.createdAt)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge tone="neutral">{b.recipientCount} recipients</Badge>
                  <Badge tone="neutral">{b.pushSentCount} push sent</Badge>
                  <button
                    onClick={() => setSelectedId(b._id)}
                    className="text-[11px] font-medium text-accent hover:underline"
                  >
                    {b.readCount} read — view details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {selectedId && <ReadersDrawer broadcastId={selectedId} onClose={() => setSelectedId(null)} />}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
