"use client";

import { useState, useRef } from "react";
import { Search, X, Send, Mail, Users } from "lucide-react";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { apiFetch } from "@/lib/apiClient";
import type { AdminUserListItem } from "@/types/user";

const MAX_RECIPIENTS = 60;

export default function SendEmailPage() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<AdminUserListItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Map<string, AdminUserListItem>>(new Map());
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setSearching(true);
      apiFetch<{ success: boolean; users: AdminUserListItem[] }>(
        `/api/admin/users?search=${encodeURIComponent(value)}&limit=10`
      )
        .then((data) => setResults(data.users.filter((u) => !u.isGuest && u.email)))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350);
  }

  function toggleUser(user: AdminUserListItem) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(user._id)) next.delete(user._id);
      else next.set(user._id, user);
      return next;
    });
  }

  async function selectAllActiveUsers() {
    setSelectingAll(true);
    try {
      // status=active already excludes banned accounts; guests and users
      // with no email on file are filtered out client-side, same as the
      // search results are.
      const data = await apiFetch<{ success: boolean; users: AdminUserListItem[] }>(
        "/api/admin/users?status=active&limit=100"
      );
      const eligible = data.users.filter((u) => !u.isGuest && u.email);

      if (eligible.length === 0) {
        setToast({ type: "error", message: "No eligible active users with an email on file." });
        return;
      }

      const capped = eligible.slice(0, MAX_RECIPIENTS);
      setSelected(new Map(capped.map((u) => [u._id, u])));

      if (eligible.length > MAX_RECIPIENTS) {
        setToast({
          type: "error",
          message: `${eligible.length} eligible users found — only the first ${MAX_RECIPIENTS} were selected (per-send cap). Send this batch, then run it again for the rest.`,
        });
      } else {
        setToast({ type: "success", message: `Selected all ${eligible.length} eligible users.` });
      }
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to load users.",
      });
    } finally {
      setSelectingAll(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const res = await apiFetch<{ success: boolean; sent: number; failed: number }>(
        "/api/admin/emails/send",
        {
          method: "POST",
          body: JSON.stringify({
            userIds: [...selected.keys()],
            subject,
            message,
          }),
        }
      );
      setToast({
        type: "success",
        message: `Sent to ${res.sent} recipient${res.sent === 1 ? "" : "s"}${res.failed ? `, ${res.failed} failed` : ""}.`,
      });
      setSelected(new Map());
      setSubject("");
      setMessage("");
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to send emails.",
      });
    } finally {
      setSending(false);
    }
  }

  const selectedList = [...selected.values()];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Send email</h1>
        <p className="text-sm text-muted mt-1">
          Send a one-off email to specific users via Resend, from ravish@doonmeet.in.
        </p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-muted block">Recipients</label>
          <button
            type="button"
            onClick={selectAllActiveUsers}
            disabled={selectingAll}
            className="flex items-center gap-1.5 text-xs text-accent hover:brightness-110 disabled:opacity-50"
          >
            <Users className="h-3 w-3" />
            {selectingAll ? "Loading..." : "Select all active users"}
          </button>
        </div>

        {selectedList.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {selectedList.map((u) => (
              <span
                key={u._id}
                className="inline-flex items-center gap-1 bg-accent/10 border border-accent/25 text-accent text-xs px-2 py-1 rounded-full"
              >
                {u.name}
                <button type="button" onClick={() => toggleUser(u)} className="hover:opacity-70">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="relative">
          <Search className="h-4 w-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name or email..."
            disabled={selectedList.length >= MAX_RECIPIENTS}
            className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 disabled:opacity-50"
          />
        </div>

        {search && (
          <div className="mt-2 border border-border rounded-lg overflow-hidden max-h-52 overflow-y-auto">
            {searching && <p className="text-xs text-muted p-3">Searching...</p>}
            {!searching && results.length === 0 && (
              <p className="text-xs text-muted p-3">No matching users with an email on file.</p>
            )}
            {results.map((u) => (
              <button
                key={u._id}
                type="button"
                onClick={() => toggleUser(u)}
                className="w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-white/[0.03] border-b border-border last:border-0"
              >
                <span className="min-w-0">
                  <span className="text-foreground font-medium">{u.name}</span>
                  <span className="text-muted ml-2 text-xs">{u.email}</span>
                </span>
                <span className="text-[11px] text-accent shrink-0">
                  {selected.has(u._id) ? "Remove" : "Add"}
                </span>
              </button>
            ))}
          </div>
        )}

        <p className="text-[11px] text-muted mt-2">
          {selectedList.length}/{MAX_RECIPIENTS} selected — capped to protect Resend&apos;s shared 100/day free-tier quota.
        </p>
      </div>

      <form onSubmit={handleSend} className="bg-surface border border-border rounded-xl p-4 space-y-3">
        <div>
          <label className="text-xs font-medium text-muted mb-1 block">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={150}
            required
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted mb-1 block">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            rows={6}
            placeholder="Hi {name}, ..."
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 resize-none"
          />
          <p className="text-[11px] text-muted mt-1">
            Each recipient sees &quot;Hi [their name],&quot; automatically before this message.
          </p>
        </div>

        <button
          type="submit"
          disabled={sending || selectedList.length === 0 || !subject.trim() || !message.trim()}
          className="flex items-center gap-2 bg-accent text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-accent/90 transition-colors"
        >
          <Send className="h-3.5 w-3.5" />
          {sending ? "Sending..." : `Send to ${selectedList.length || ""} recipient${selectedList.length === 1 ? "" : "s"}`}
        </button>
      </form>

      {selectedList.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-muted mt-4">
          <Mail className="h-3.5 w-3.5" />
          Search and add recipients above to get started.
        </div>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
