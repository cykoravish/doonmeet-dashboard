"use client";

import { useEffect, useState, useCallback } from "react";
import { Trash2, Loader2, ShieldAlert } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/apiClient";
import type { AdminConversationListItem, DirectMessageItem } from "@/types/chat";

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ConversationThreadDrawer({
  conversationId,
  onDeleted,
}: {
  conversationId: string;
  onDeleted?: () => void;
}) {
  const [conversation, setConversation] = useState<AdminConversationListItem | null>(null);
  const [messages, setMessages] = useState<DirectMessageItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch<{
      success: boolean;
      conversation: AdminConversationListItem;
      messages: DirectMessageItem[];
    }>(`/api/admin/conversations/${conversationId}/messages?limit=100`)
      .then((data) => {
        setConversation(data.conversation);
        setMessages(data.messages);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load conversation"))
      .finally(() => setLoading(false));
  }, [conversationId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    load();
  }, [load]);

  async function deleteMessage(messageId: string) {
    setDeletingId(messageId);
    try {
      await apiFetch(`/api/admin/conversations/${conversationId}/messages/${messageId}`, {
        method: "DELETE",
      });
      setMessages((prev) => prev?.filter((m) => m._id !== messageId) ?? null);
      onDeleted?.();
    } catch {
      // no-op
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-5 w-5 text-muted animate-spin" />
      </div>
    );
  }

  if (!conversation || error) {
    return <div className="p-5 text-sm text-danger">{error ?? "Could not load conversation."}</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 bg-warning/5 border-b border-warning/20 flex items-center gap-2">
        <ShieldAlert className="h-3.5 w-3.5 text-warning shrink-0" />
        <p className="text-[11px] text-warning">
          Viewing this private conversation has been recorded in the audit log.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages?.length === 0 && (
          <p className="text-sm text-muted text-center py-10">No messages yet.</p>
        )}
        {messages?.map((m) => (
          <div key={m._id} className="group flex flex-col gap-0.5">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-medium text-foreground">
                {m.sender?.name ?? "Deleted user"}
              </span>
              <span className="text-[10px] text-muted">{formatDateTime(m.createdAt)}</span>
            </div>
            <div className="flex items-start gap-2">
              <p className="text-sm text-foreground bg-surface-raised border border-border rounded-lg px-3 py-2 max-w-[85%]">
                {m.content}
              </p>
              <button
                onClick={() => deleteMessage(m._id)}
                disabled={deletingId === m._id}
                className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger transition-all shrink-0 mt-2 p-1"
              >
                {deletingId === m._id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
