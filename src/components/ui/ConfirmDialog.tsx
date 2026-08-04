"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-surface border border-border rounded-2xl p-5 max-w-sm w-full shadow-2xl">
        <div className="flex items-start gap-3">
          <div
            className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
              danger ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"
            }`}
          >
            <AlertTriangle className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-foreground">{title}</h3>
            <p className="text-sm text-muted mt-1">{description}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            size="sm"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
