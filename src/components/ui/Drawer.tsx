"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-40 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`absolute right-0 top-0 h-full w-full sm:w-[420px] bg-surface border-l border-border shadow-2xl flex flex-col transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-foreground truncate">{title}</h2>
            {subtitle && <p className="text-xs text-muted mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors shrink-0 p-1 -m-1"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
