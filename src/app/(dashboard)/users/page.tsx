"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Search, Users as UsersIcon, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Pagination, SkeletonRow, EmptyState } from "@/components/ui/Feedback";
import { Drawer } from "@/components/ui/Drawer";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { UserDetailDrawer } from "@/components/users/UserDetailDrawer";
import { apiFetch } from "@/lib/apiClient";
import type { AdminUserListItem } from "@/types/user";
import { cn } from "@/lib/cn";

type StatusFilter = "all" | "active" | "banned" | "guest" | "unverified";

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Banned", value: "banned" },
  { label: "Guests", value: "guest" },
  { label: "Unverified", value: "unverified" },
];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function StatusBadges({ user }: { user: AdminUserListItem }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {!user.isActive && <Badge tone="negative">Banned</Badge>}
      {user.isActive && !user.isGuest && <Badge tone="positive">Active</Badge>}
      {user.isGuest && <Badge tone="neutral">Guest</Badge>}
      {!user.isVerified && !user.isGuest && <Badge tone="warning">Unverified</Badge>}
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUserListItem[] | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback((p: number, s: string, st: StatusFilter) => {
    setUsers(null);
    const params = new URLSearchParams({ page: String(p), limit: "20" });
    if (s) params.set("search", s);
    if (st !== "all") params.set("status", st);

    apiFetch<{
      success: boolean;
      users: AdminUserListItem[];
      pagination: { page: number; totalPages: number; total: number };
    }>(`/api/admin/users?${params.toString()}`)
      .then((data) => {
        setUsers(data.users);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      })
      .catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-param-change pattern
    fetchUsers(page, search, status);
  }, [page, status, fetchUsers, search]);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchUsers(1, value, status);
    }, 350);
  }

  function handleStatusChange(value: StatusFilter) {
    setStatus(value);
    setPage(1);
    fetchUsers(1, search, value);
  }

  function handleUserChanged() {
    fetchUsers(page, search, status);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Users</h1>
        <p className="text-sm text-muted mt-1">
          {total > 0 ? `${total.toLocaleString("en-IN")} people on DoonMeet` : "Search, review, and manage accounts"}
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="h-4 w-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search name, email, phone..."
            className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 transition-colors"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => handleStatusChange(f.value)}
              className={cn(
                "text-xs font-medium px-3 py-2 rounded-lg border whitespace-nowrap transition-colors shrink-0",
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

      {/* Desktop table */}
      <div className="hidden md:block bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 text-xs font-medium text-muted">Name</th>
              <th className="px-4 py-3 text-xs font-medium text-muted">Contact</th>
              <th className="px-4 py-3 text-xs font-medium text-muted">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-muted">Joined</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users === null &&
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={5} />)}

            {users?.map((user) => (
              <tr
                key={user._id}
                onClick={() => setSelectedUserId(user._id)}
                className="border-b border-border last:border-0 hover:bg-white/[0.03] cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center text-[11px] font-medium text-accent shrink-0">
                      {user.name
                        .split(" ")
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </div>
                    <span className="text-foreground font-medium truncate max-w-[160px]">
                      {user.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted">
                  <div className="truncate max-w-[200px]">{user.email ?? user.phone ?? "—"}</div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadges user={user} />
                </td>
                <td className="px-4 py-3 text-muted font-mono text-xs">
                  {formatDate(user.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <ChevronRight className="h-4 w-4 text-muted inline-block" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users?.length === 0 && (
          <EmptyState
            icon={UsersIcon}
            title="No users found"
            description="Try a different search term or filter."
          />
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-2">
        {users === null &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-3.5 h-[76px] animate-pulse" />
          ))}

        {users?.map((user) => (
          <button
            key={user._id}
            onClick={() => setSelectedUserId(user._id)}
            className="text-left bg-surface border border-border rounded-xl p-3.5 flex items-center gap-3 active:bg-white/[0.03] transition-colors"
          >
            <div className="h-9 w-9 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center text-xs font-medium text-accent shrink-0">
              {user.name
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
              <p className="text-xs text-muted truncate mt-0.5">{user.email ?? user.phone ?? "—"}</p>
              <div className="mt-1.5">
                <StatusBadges user={user} />
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted shrink-0" />
          </button>
        ))}

        {users?.length === 0 && (
          <EmptyState
            icon={UsersIcon}
            title="No users found"
            description="Try a different search term or filter."
          />
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <Drawer
        open={!!selectedUserId}
        onClose={() => setSelectedUserId(null)}
        title="User details"
      >
        {selectedUserId && (
          <UserDetailDrawer
            userId={selectedUserId}
            onClose={() => setSelectedUserId(null)}
            onChanged={() => {
              handleUserChanged();
              setToast({ type: "success", message: "Updated successfully" });
            }}
          />
        )}
      </Drawer>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
