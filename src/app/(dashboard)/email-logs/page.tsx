"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Search, Mail, MailWarning } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Pagination, EmptyState, SkeletonRow } from "@/components/ui/Feedback";
import { apiFetch } from "@/lib/apiClient";
import type { EmailLogEntry, EmailLogType } from "@/types/emailLog";

const TYPE_LABELS: Record<EmailLogType, string> = {
  verification: "Verification",
  password_reset: "Password reset",
  new_dm: "New DM",
  inactivity_reminder: "Inactivity reminder",
};

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

export default function EmailLogsPage() {
  const [entries, setEntries] = useState<EmailLogEntry[] | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchEntries = useCallback((p: number, s: string, t: string, st: string) => {
    setEntries(null);
    const params = new URLSearchParams({ page: String(p), limit: "40" });
    if (s) params.set("search", s);
    if (t !== "all") params.set("type", t);
    if (st !== "all") params.set("status", st);

    apiFetch<{
      success: boolean;
      entries: EmailLogEntry[];
      pagination: { page: number; totalPages: number; total: number };
    }>(`/api/admin/email-logs?${params.toString()}`)
      .then((data) => {
        setEntries(data.entries);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      })
      .catch(() => setEntries([]));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-param-change pattern
    fetchEntries(page, search, typeFilter, statusFilter);
  }, [page, typeFilter, statusFilter, fetchEntries, search]);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchEntries(1, value, typeFilter, statusFilter);
    }, 350);
  }

  function handleTypeChange(value: string) {
    setTypeFilter(value);
    setPage(1);
    fetchEntries(1, search, value, statusFilter);
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value);
    setPage(1);
    fetchEntries(1, search, typeFilter, value);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Email logs</h1>
        <p className="text-sm text-muted mt-1">
          {total > 0 ? `${total.toLocaleString("en-IN")} emails recorded` : "Every automated email, recorded"}
          . Sent via Resend from ravish@doonmeet.in.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="h-4 w-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by recipient email..."
            className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 transition-colors"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 sm:max-w-[200px]"
        >
          <option value="all">All types</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 sm:max-w-[160px]"
        >
          <option value="all">All statuses</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
        </select>
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
          <EmptyState icon={Mail} title="No emails found" description="Try a different search or filter." />
        )}

        {entries && entries.length > 0 && (
          <div className="divide-y divide-border">
            {entries.map((e) => (
              <div key={e._id} className="flex items-start gap-3 px-4 py-3">
                <div className="mt-0.5 shrink-0">
                  {e.status === "failed" ? (
                    <MailWarning className="h-3.5 w-3.5 text-danger" />
                  ) : (
                    <Mail className="h-3.5 w-3.5 text-accent" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={e.status === "failed" ? "negative" : "positive"}>
                      {e.status === "failed" ? "Failed" : "Sent"}
                    </Badge>
                    <Badge tone="neutral">{TYPE_LABELS[e.type]}</Badge>
                    <span className="text-xs text-muted">{e.recipientEmail}</span>
                  </div>
                  <p className="text-xs text-muted mt-1">{e.subject}</p>
                  {e.errorMessage && (
                    <p className="text-[11px] text-danger mt-1 font-mono truncate">{e.errorMessage}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] text-muted font-mono">{formatDateTime(e.createdAt)}</p>
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
