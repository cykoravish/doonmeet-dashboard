"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Search, ScrollText, Eye } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Pagination, EmptyState, SkeletonRow } from "@/components/ui/Feedback";
import { apiFetch } from "@/lib/apiClient";
import type { AdminAuditLogEntry } from "@/types/auditLog";
import { cn } from "@/lib/cn";

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function actionTone(action: string): "positive" | "negative" | "neutral" | "warning" {
  const isBanNotUnban = action.includes("ban") && !action.includes("unban");
  if (action.includes("delete") || isBanNotUnban) return "negative";
  if (action.includes("view")) return "warning";
  if (
    action.includes("create") ||
    action.includes("unban") ||
    action.includes("unhide") ||
    action.includes("verify")
  ) {
    return "positive";
  }
  return "neutral";
}

function actionLabel(action: string): string {
  return action.replace(/_/g, " ").replace(/\./g, " · ");
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AdminAuditLogEntry[] | null>(null);
  const [actions, setActions] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchEntries = useCallback((p: number, s: string, a: string) => {
    setEntries(null);
    const params = new URLSearchParams({ page: String(p), limit: "40" });
    if (s) params.set("search", s);
    if (a !== "all") params.set("action", a);

    apiFetch<{
      success: boolean;
      entries: AdminAuditLogEntry[];
      actions: string[];
      pagination: { page: number; totalPages: number; total: number };
    }>(`/api/admin/audit-log?${params.toString()}`)
      .then((data) => {
        setEntries(data.entries);
        setActions(data.actions);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      })
      .catch(() => setEntries([]));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-param-change pattern
    fetchEntries(page, search, actionFilter);
  }, [page, actionFilter, fetchEntries, search]);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchEntries(1, value, actionFilter);
    }, 350);
  }

  function handleActionChange(value: string) {
    setActionFilter(value);
    setPage(1);
    fetchEntries(1, search, value);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Audit log</h1>
        <p className="text-sm text-muted mt-1">
          {total > 0 ? `${total.toLocaleString("en-IN")} recorded actions` : "Every admin action, recorded"}
          . This is append-only — nothing here can be edited or deleted.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="h-4 w-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by admin email or target id..."
            className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 transition-colors"
          />
        </div>
        {actions.length > 0 && (
          <select
            value={actionFilter}
            onChange={(e) => handleActionChange(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 sm:max-w-[220px]"
          >
            <option value="all">All actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {actionLabel(a)}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {entries === null && (
          <table className="w-full">
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonRow key={i} cols={4} />
              ))}
            </tbody>
          </table>
        )}

        {entries?.length === 0 && (
          <EmptyState icon={ScrollText} title="No entries found" description="Try a different search or filter." />
        )}

        {entries && entries.length > 0 && (
          <div className="divide-y divide-border">
            {entries.map((e) => (
              <div key={e._id} className="flex items-start gap-3 px-4 py-3">
                <div className="mt-0.5 shrink-0">
                  {e.action.includes("view") ? (
                    <Eye className="h-3.5 w-3.5 text-warning" />
                  ) : (
                    <span
                      className={cn(
                        "block h-2 w-2 rounded-full mt-1",
                        actionTone(e.action) === "negative" && "bg-danger",
                        actionTone(e.action) === "positive" && "bg-accent",
                        actionTone(e.action) === "warning" && "bg-warning",
                        actionTone(e.action) === "neutral" && "bg-muted"
                      )}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={actionTone(e.action)}>{actionLabel(e.action)}</Badge>
                    <span className="text-xs text-muted">{e.adminEmail}</span>
                  </div>
                  {(e.targetType || e.targetId) && (
                    <p className="text-xs text-muted mt-1 font-mono">
                      {e.targetType}
                      {e.targetId ? ` · ${e.targetId}` : ""}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] text-muted font-mono">{formatDateTime(e.createdAt)}</p>
                  {e.ip && <p className="text-[11px] text-muted/70 mt-0.5">{e.ip}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
