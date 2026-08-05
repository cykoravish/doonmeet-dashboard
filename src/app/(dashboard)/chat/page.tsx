"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Search, MessageCircle, Trash2, Loader2, ShieldAlert } from "lucide-react";
import { Pagination, EmptyState, SkeletonRow } from "@/components/ui/Feedback";
import { Drawer } from "@/components/ui/Drawer";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { ConversationThreadDrawer } from "@/components/chat/ConversationThreadDrawer";
import { apiFetch, ApiError } from "@/lib/apiClient";
import type { AdminConversationListItem, RoomMessageItem } from "@/types/chat";
import { cn } from "@/lib/cn";

type ChatTab = "dm" | "room";

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DirectMessagesTab({
  onSelectConversation,
}: {
  onSelectConversation: (id: string) => void;
}) {
  const [conversations, setConversations] = useState<AdminConversationListItem[] | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchConversations = useCallback((p: number, s: string) => {
    setConversations(null);
    const params = new URLSearchParams({ page: String(p), limit: "20" });
    if (s) params.set("search", s);

    apiFetch<{
      success: boolean;
      conversations: AdminConversationListItem[];
      pagination: { page: number; totalPages: number };
    }>(`/api/admin/conversations?${params.toString()}`)
      .then((data) => {
        setConversations(data.conversations);
        setTotalPages(data.pagination.totalPages);
      })
      .catch(() => setConversations([]));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-param-change pattern
    fetchConversations(page, search);
  }, [page, fetchConversations, search]);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchConversations(1, value);
    }, 350);
  }

  return (
    <div>
      <div className="flex items-start gap-2 bg-warning/5 border border-warning/20 rounded-lg px-3 py-2.5 mb-4">
        <ShieldAlert className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
        <p className="text-xs text-warning">
          Every time you open a conversation, that view is recorded in the audit log.
        </p>
      </div>

      <div className="relative sm:max-w-xs mb-4">
        <Search className="h-4 w-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by user name or email..."
          className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 transition-colors"
        />
      </div>

      {conversations === null && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl h-16 animate-pulse" />
          ))}
        </div>
      )}

      {conversations?.length === 0 && (
        <EmptyState
          icon={MessageCircle}
          title="No conversations found"
          description="Try a different search."
        />
      )}

      {conversations && conversations.length > 0 && (
        <div className="flex flex-col gap-2">
          {conversations.map((c) => {
            const names = c.participants.map((p) => p.name).join(" & ");
            return (
              <button
                key={c._id}
                onClick={() => onSelectConversation(c._id)}
                className="text-left bg-surface border border-border rounded-xl p-3.5 flex items-center gap-3 hover:border-accent/30 transition-colors"
              >
                <div className="flex -space-x-2 shrink-0">
                  {c.participants.slice(0, 2).map((p) => (
                    <div
                      key={p._id}
                      className="h-8 w-8 rounded-full bg-accent/15 border-2 border-surface flex items-center justify-center text-[10px] font-medium text-accent"
                    >
                      {p.name
                        .split(" ")
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </div>
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{names}</p>
                  <p className="text-xs text-muted truncate mt-0.5">
                    {c.lastMessage.content ?? "No messages yet"}
                  </p>
                </div>
                {c.lastMessage.sentAt && (
                  <span className="text-[11px] text-muted shrink-0">
                    {formatDateTime(c.lastMessage.sentAt)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}

function RoomChatTab({ onToast }: { onToast: (t: ToastState) => void }) {
  const [messages, setMessages] = useState<RoomMessageItem[] | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMessages = useCallback((p: number, s: string) => {
    setMessages(null);
    const params = new URLSearchParams({ page: String(p), limit: "30" });
    if (s) params.set("search", s);

    apiFetch<{
      success: boolean;
      messages: RoomMessageItem[];
      pagination: { page: number; totalPages: number };
    }>(`/api/admin/room-messages?${params.toString()}`)
      .then((data) => {
        setMessages(data.messages);
        setTotalPages(data.pagination.totalPages);
      })
      .catch(() => setMessages([]));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-param-change pattern
    fetchMessages(page, search);
  }, [page, fetchMessages, search]);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchMessages(1, value);
    }, 350);
  }

  async function deleteMessage(messageId: string) {
    setDeletingId(messageId);
    try {
      await apiFetch(`/api/admin/room-messages/${messageId}`, { method: "DELETE" });
      setMessages((prev) => prev?.filter((m) => m._id !== messageId) ?? null);
      onToast({ type: "success", message: "Message deleted" });
    } catch (e) {
      onToast({ type: "error", message: e instanceof ApiError ? e.message : "Failed to delete" });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="relative sm:max-w-xs mb-4">
        <Search className="h-4 w-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search messages or sender..."
          className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 transition-colors"
        />
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {messages === null && (
          <table className="w-full">
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonRow key={i} cols={3} />
              ))}
            </tbody>
          </table>
        )}

        {messages?.length === 0 && (
          <EmptyState icon={MessageCircle} title="No messages found" description="Try a different search." />
        )}

        {messages && messages.length > 0 && (
          <div className="divide-y divide-border">
            {messages.map((m) => (
              <div key={m._id} className="group flex items-start gap-3 px-4 py-3">
                <div className="h-7 w-7 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center text-[10px] font-medium text-accent shrink-0">
                  {(m.sender?.name ?? "?")
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium text-foreground">
                      {m.sender?.name ?? "Deleted user"}
                    </span>
                    {m.isGuest && (
                      <span className="text-[10px] text-muted border border-border rounded-full px-1.5">
                        guest
                      </span>
                    )}
                    <span className="text-[10px] text-muted">{formatDateTime(m.createdAt)}</span>
                  </div>
                  <p className="text-sm text-foreground mt-0.5">{m.content}</p>
                </div>
                <button
                  onClick={() => deleteMessage(m._id)}
                  disabled={deletingId === m._id}
                  className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger transition-all shrink-0 p-1"
                >
                  {deletingId === m._id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}

export default function ChatPage() {
  const [tab, setTab] = useState<ChatTab>("dm");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Chat</h1>
        <p className="text-sm text-muted mt-1">Moderate direct messages and public room chat.</p>
      </div>

      <div className="flex gap-1.5 mb-5 border-b border-border">
        {(["dm", "room"] as ChatTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground"
            )}
          >
            {t === "dm" ? "Direct messages" : "Room chat"}
          </button>
        ))}
      </div>

      {tab === "dm" && <DirectMessagesTab onSelectConversation={setSelectedConversationId} />}
      {tab === "room" && <RoomChatTab onToast={setToast} />}

      <Drawer
        open={!!selectedConversationId}
        onClose={() => setSelectedConversationId(null)}
        title="Conversation"
      >
        {selectedConversationId && (
          <ConversationThreadDrawer
            conversationId={selectedConversationId}
            onDeleted={() => setToast({ type: "success", message: "Message deleted" })}
          />
        )}
      </Drawer>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
