"use client";

import { useEffect } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

export interface ToastState {
  type: "success" | "error";
  message: string;
}

export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastState | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const isSuccess = toast.type === "success";

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2">
      <div
        className={`flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm shadow-2xl bg-surface ${
          isSuccess ? "border-accent/25 text-foreground" : "border-danger/25 text-foreground"
        }`}
      >
        {isSuccess ? (
          <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
        ) : (
          <XCircle className="h-4 w-4 text-danger shrink-0" />
        )}
        {toast.message}
      </div>
    </div>
  );
}
