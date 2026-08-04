"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Mail,
  Phone,
  Calendar,
  Clock,
  ShieldCheck,
  Ban,
  CheckCircle2,
  Trash2,
  Monitor,
  LogOut,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { apiFetch, ApiError } from "@/lib/apiClient";
import type { AdminUserDetail, UserActivity, AdminUserSession } from "@/types/user";

type Tab = "profile" | "activity" | "sessions" | "danger";

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function UserDetailDrawer({
  userId,
  onClose,
  onChanged,
}: {
  userId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<Tab>("profile");
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [activity, setActivity] = useState<UserActivity | null>(null);
  const [sessions, setSessions] = useState<AdminUserSession[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<"ban" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch<{ success: boolean; user: AdminUserDetail; activity: UserActivity }>(
      `/api/admin/users/${userId}`
    )
      .then((data) => {
        setUser(data.user);
        setActivity(data.activity);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load user"))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    load();
  }, [load]);

  useEffect(() => {
    if (tab !== "sessions" || sessions) return;
    apiFetch<{ success: boolean; sessions: AdminUserSession[] }>(
      `/api/admin/users/${userId}/sessions`
    )
      .then((data) => setSessions(data.sessions))
      .catch(() => setSessions([]));
  }, [tab, sessions, userId]);

  async function patchUser(updates: Record<string, unknown>, actionKey: string) {
    setActionLoading(actionKey);
    try {
      await apiFetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      load();
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Action failed");
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
    }
  }

  async function handleDelete() {
    setActionLoading("delete");
    try {
      await apiFetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      onChanged();
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed");
      setActionLoading(null);
      setConfirmAction(null);
    }
  }

  async function revokeSession(sessionId: string) {
    setActionLoading(`session-${sessionId}`);
    try {
      await apiFetch(`/api/admin/users/${userId}/sessions/${sessionId}`, { method: "DELETE" });
      setSessions((prev) => prev?.filter((s) => s._id !== sessionId) ?? null);
    } catch {
      // no-op, keep it simple
    } finally {
      setActionLoading(null);
    }
  }

  async function revokeAllSessions() {
    setActionLoading("session-all");
    try {
      await apiFetch(`/api/admin/users/${userId}/sessions/revoke-all`, { method: "POST" });
      setSessions([]);
    } catch {
      // no-op
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-5 w-5 text-muted animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-5 text-sm text-danger">{error ?? "Could not load this user."}</div>
    );
  }

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col h-full">
      {/* Identity header */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center text-sm font-medium text-accent shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {!user.isActive && <Badge tone="negative">Banned</Badge>}
              {user.isActive && <Badge tone="positive">Active</Badge>}
              {user.isGuest && <Badge tone="neutral">Guest</Badge>}
              {!user.isVerified && !user.isGuest && <Badge tone="warning">Unverified</Badge>}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border px-2 shrink-0">
        {(["profile", "activity", "sessions", "danger"] as Tab[]).map((t) => (
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

        {tab === "profile" && (
          <div className="flex flex-col gap-4">
            <InfoRow icon={Mail} label="Email" value={user.email ?? "—"} />
            <InfoRow icon={Phone} label="Phone" value={user.phone ?? "—"} />
            <InfoRow icon={Calendar} label="Joined" value={formatDate(user.createdAt)} />
            <InfoRow icon={Clock} label="Last seen" value={formatDateTime(user.lastSeenAt)} />
            {user.bio && (
              <div>
                <p className="text-xs text-muted mb-1">Bio</p>
                <p className="text-sm text-foreground">{user.bio}</p>
              </div>
            )}
            {user.address && (
              <div>
                <p className="text-xs text-muted mb-1">Address</p>
                <p className="text-sm text-foreground">{user.address}</p>
              </div>
            )}
            {user.interests.length > 0 && (
              <div>
                <p className="text-xs text-muted mb-1.5">Interests</p>
                <div className="flex flex-wrap gap-1.5">
                  {user.interests.map((i) => (
                    <span
                      key={i}
                      className="text-xs bg-surface-raised border border-border rounded-full px-2 py-0.5 text-muted"
                    >
                      {i}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              {!user.isVerified && !user.isGuest && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="justify-start"
                  loading={actionLoading === "verify"}
                  onClick={() => patchUser({ isVerified: true }, "verify")}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Force verify email
                </Button>
              )}
            </div>
          </div>
        )}

        {tab === "activity" && activity && (
          <div className="grid grid-cols-2 gap-3">
            <ActivityStat label="Communities" value={activity.communityCount} />
            <ActivityStat label="Events created" value={activity.eventsCreatedCount} />
            <ActivityStat label="Event RSVPs" value={activity.eventRsvpCount} />
            <ActivityStat label="Place reviews" value={activity.reviewCount} />
          </div>
        )}

        {tab === "sessions" && (
          <div>
            {sessions === null ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-4 w-4 text-muted animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">No active sessions.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {sessions.length > 1 && (
                  <Button
                    variant="danger"
                    size="sm"
                    className="mb-1 self-start"
                    loading={actionLoading === "session-all"}
                    onClick={revokeAllSessions}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out of all sessions
                  </Button>
                )}
                {sessions.map((s) => (
                  <div
                    key={s._id}
                    className="flex items-center justify-between gap-3 bg-surface-raised border border-border rounded-lg px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Monitor className="h-4 w-4 text-muted shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-foreground truncate">
                          {s.userAgent ?? "Unknown device"}
                        </p>
                        <p className="text-[11px] text-muted">
                          {s.ip ?? "Unknown IP"} · {formatDateTime(s.createdAt)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => revokeSession(s._id)}
                      disabled={actionLoading === `session-${s._id}`}
                      className="text-muted hover:text-danger transition-colors shrink-0 p-1"
                    >
                      {actionLoading === `session-${s._id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <LogOut className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "danger" && (
          <div className="flex flex-col gap-3">
            {user.isActive ? (
              <ActionCard
                icon={Ban}
                title="Ban this user"
                description="They'll be signed out everywhere and blocked from logging back in."
                buttonLabel="Ban user"
                variant="danger"
                loading={actionLoading === "ban"}
                onClick={() => setConfirmAction("ban")}
              />
            ) : (
              <ActionCard
                icon={CheckCircle2}
                title="Unban this user"
                description="Restores their access to log in and use the platform."
                buttonLabel="Unban user"
                variant="secondary"
                loading={actionLoading === "unban"}
                onClick={() => patchUser({ isActive: true }, "unban")}
              />
            )}

            <ActionCard
              icon={Trash2}
              title="Delete this account"
              description="Permanently removes the user and their posts, RSVPs, reviews, messages, and sessions. This cannot be undone."
              buttonLabel="Delete account"
              variant="danger"
              loading={actionLoading === "delete"}
              onClick={() => setConfirmAction("delete")}
            />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmAction === "ban"}
        title="Ban this user?"
        description={`${user.name} will be signed out immediately and won't be able to log back in until unbanned.`}
        confirmLabel="Ban user"
        danger
        loading={actionLoading === "ban"}
        onConfirm={() => patchUser({ isActive: false }, "ban")}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmDialog
        open={confirmAction === "delete"}
        title="Delete this account?"
        description={`This permanently deletes ${user.name}'s account and all associated data. This cannot be undone.`}
        confirmLabel="Delete permanently"
        danger
        loading={actionLoading === "delete"}
        onConfirm={handleDelete}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] text-muted leading-tight">{label}</p>
        <p className="text-sm text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

function ActivityStat({ label, value }: { label: string; value: number }) {
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
