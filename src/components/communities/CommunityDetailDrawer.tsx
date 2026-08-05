"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users2,
  MessageSquare,
  Megaphone,
  Trash2,
  EyeOff,
  Eye,
  Loader2,
  UserX,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/Feedback";
import { apiFetch, ApiError } from "@/lib/apiClient";
import type {
  AdminCommunityListItem,
  CommunityStats,
  CommunityMemberItem,
  CommunityPostItem,
  CommunityCategory,
} from "@/types/community";

type Tab = "overview" | "members" | "posts" | "danger";

const CATEGORIES: CommunityCategory[] = [
  "general",
  "tech",
  "nature",
  "food",
  "photography",
  "sports",
  "arts",
];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function CommunityDetailDrawer({
  communityId,
  onClose,
  onChanged,
}: {
  communityId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [community, setCommunity] = useState<AdminCommunityListItem | null>(null);
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [members, setMembers] = useState<CommunityMemberItem[] | null>(null);
  const [posts, setPosts] = useState<CommunityPostItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Editable fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<CommunityCategory>("general");
  const [announcement, setAnnouncement] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    apiFetch<{ success: boolean; community: AdminCommunityListItem; stats: CommunityStats }>(
      `/api/admin/communities/${communityId}`
    )
      .then((data) => {
        setCommunity(data.community);
        setStats(data.stats);
        setName(data.community.name);
        setDescription(data.community.description);
        setCategory(data.community.category);
        setAnnouncement(data.community.announcement?.text ?? "");
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load community"))
      .finally(() => setLoading(false));
  }, [communityId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    load();
  }, [load]);

  useEffect(() => {
    if (tab !== "members" || members) return;
    apiFetch<{ success: boolean; members: CommunityMemberItem[] }>(
      `/api/admin/communities/${communityId}/members?limit=50`
    )
      .then((data) => setMembers(data.members))
      .catch(() => setMembers([]));
  }, [tab, members, communityId]);

  useEffect(() => {
    if (tab !== "posts" || posts) return;
    apiFetch<{ success: boolean; posts: CommunityPostItem[] }>(
      `/api/admin/communities/${communityId}/posts?limit=50`
    )
      .then((data) => setPosts(data.posts))
      .catch(() => setPosts([]));
  }, [tab, posts, communityId]);

  async function handleSaveDetails() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/communities/${communityId}`, {
        method: "PATCH",
        body: JSON.stringify({ name, description, category }),
      });
      onChanged();
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAnnouncement() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/communities/${communityId}`, {
        method: "PATCH",
        body: JSON.stringify({ announcementText: announcement || null }),
      });
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to save announcement");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    if (!community) return;
    setSaving(true);
    try {
      await apiFetch(`/api/admin/communities/${communityId}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !community.isActive }),
      });
      onChanged();
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Action failed");
    } finally {
      setSaving(false);
    }
  }

  async function removeMember(memberId: string) {
    try {
      await apiFetch(`/api/admin/communities/${communityId}/members/${memberId}`, {
        method: "DELETE",
      });
      setMembers((prev) => prev?.filter((m) => m._id !== memberId) ?? null);
      onChanged();
    } catch {
      // no-op
    }
  }

  async function removePost(postId: string) {
    try {
      await apiFetch(`/api/admin/communities/${communityId}/posts/${postId}`, {
        method: "DELETE",
      });
      setPosts((prev) => prev?.filter((p) => p._id !== postId) ?? null);
    } catch {
      // no-op
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await apiFetch(`/api/admin/communities/${communityId}`, { method: "DELETE" });
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

  if (!community) {
    return <div className="p-5 text-sm text-danger">{error ?? "Could not load community."}</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center text-sm font-medium text-accent shrink-0 uppercase">
            {community.name.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{community.name}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <Badge tone={community.isActive ? "positive" : "negative"}>
                {community.isActive ? "Active" : "Deactivated"}
              </Badge>
              <Badge tone="neutral">{community.category}</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="flex border-b border-border px-2 shrink-0 overflow-x-auto">
        {(["overview", "members", "posts", "danger"] as Tab[]).map((t) => (
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
              <StatBlock label="Members" value={stats?.memberCount ?? community.memberCount} />
              <StatBlock label="Posts" value={stats?.postCount ?? 0} />
            </div>

            <Field label="Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
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

            <Field label="Category">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CommunityCategory)}
                className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 capitalize"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="capitalize">
                    {c}
                  </option>
                ))}
              </select>
            </Field>

            <Button variant="primary" size="sm" loading={saving} onClick={handleSaveDetails}>
              Save changes
            </Button>

            <div className="border-t border-border pt-4 mt-1">
              <Field label="Community announcement (shown to all members)">
                <textarea
                  value={announcement}
                  onChange={(e) => setAnnouncement(e.target.value)}
                  rows={2}
                  placeholder="No announcement set"
                  className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 resize-none"
                />
              </Field>
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                loading={saving}
                onClick={handleSaveAnnouncement}
              >
                <Megaphone className="h-3.5 w-3.5" />
                Update announcement
              </Button>
            </div>

            <p className="text-xs text-muted pt-2">Created {formatDate(community.createdAt)}</p>
          </div>
        )}

        {tab === "members" && (
          <div>
            {members === null ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-4 w-4 text-muted animate-spin" />
              </div>
            ) : members.length === 0 ? (
              <EmptyState icon={Users2} title="No members" description="Nobody has joined yet." />
            ) : (
              <div className="flex flex-col gap-2">
                {members.map((m) => (
                  <div
                    key={m._id}
                    className="flex items-center justify-between gap-3 bg-surface-raised border border-border rounded-lg px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">
                        {m.user?.name ?? "Deleted user"}
                      </p>
                      <p className="text-[11px] text-muted truncate">
                        {m.user?.email ?? "—"} · joined {formatDate(m.joinedAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeMember(m._id)}
                      className="text-muted hover:text-danger transition-colors shrink-0 p-1"
                      title="Remove from community"
                    >
                      <UserX className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "posts" && (
          <div>
            {posts === null ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-4 w-4 text-muted animate-spin" />
              </div>
            ) : posts.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No posts"
                description="Nothing has been posted here yet."
              />
            ) : (
              <div className="flex flex-col gap-2">
                {posts.map((p) => (
                  <div key={p._id} className="bg-surface-raised border border-border rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-foreground">
                        {p.author?.name ?? "Deleted user"}
                      </p>
                      <button
                        onClick={() => removePost(p._id)}
                        className="text-muted hover:text-danger transition-colors shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-sm text-foreground mt-1 line-clamp-3">{p.content}</p>
                    <p className="text-[11px] text-muted mt-1.5">
                      {formatDate(p.createdAt)} · {p.commentCount} comment
                      {p.commentCount === 1 ? "" : "s"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "danger" && (
          <div className="flex flex-col gap-3">
            <div
              className={`border rounded-xl p-4 ${
                community.isActive ? "border-warning/20 bg-warning/5" : "border-border bg-surface-raised"
              }`}
            >
              <div className="flex items-start gap-2.5">
                {community.isActive ? (
                  <EyeOff className="h-4 w-4 mt-0.5 text-warning shrink-0" />
                ) : (
                  <Eye className="h-4 w-4 mt-0.5 text-muted shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {community.isActive ? "Deactivate community" : "Reactivate community"}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {community.isActive
                      ? "Hides it from discovery. Members and posts are kept."
                      : "Makes it visible and joinable again."}
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                loading={saving}
                onClick={toggleActive}
              >
                {community.isActive ? "Deactivate" : "Reactivate"}
              </Button>
            </div>

            <div className="border border-danger/20 bg-danger/5 rounded-xl p-4">
              <div className="flex items-start gap-2.5">
                <Trash2 className="h-4 w-4 mt-0.5 text-danger shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Delete this community</p>
                  <p className="text-xs text-muted mt-0.5">
                    Permanently removes the community, its members, posts, and comments. This
                    cannot be undone.
                  </p>
                </div>
              </div>
              <Button
                variant="danger"
                size="sm"
                className="mt-3"
                onClick={() => setConfirmDelete(true)}
              >
                Delete community
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this community?"
        description={`This permanently deletes "${community.name}" and all its members, posts, and comments.`}
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

function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface-raised border border-border rounded-lg p-3">
      <p className="text-xl font-semibold text-foreground font-mono tabular-nums">{value}</p>
      <p className="text-xs text-muted mt-0.5">{label}</p>
    </div>
  );
}
