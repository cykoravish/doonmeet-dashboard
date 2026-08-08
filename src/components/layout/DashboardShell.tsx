"use client";

import { useState } from "react";
import { Menu, X, LogOut, ChevronDown } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { useAdmin } from "@/hooks/useAdmin";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { admin, logout } = useAdmin();

  const initials = admin?.name
    ? admin.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-60 shrink-0 border-r border-border">
        <div className="fixed w-60 h-screen">
          <Sidebar />
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 border-r border-border">
            <div className="absolute right-3 top-3 z-10">
              <button
                onClick={() => setMobileOpen(false)}
                className="h-8 w-8 rounded-lg bg-surface-raised border border-border flex items-center justify-center text-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-6 shrink-0 sticky top-0 bg-background/80 backdrop-blur-sm z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden h-9 w-9 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-white/5"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>

          <div className="hidden md:block" />

          <div className="relative">
            <button
              onClick={() => setMenuOpen((s) => !s)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              <div className="h-7 w-7 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center text-[11px] font-medium text-accent">
                {initials || "•"}
              </div>
              <span className="text-sm text-foreground hidden sm:block max-w-[140px] truncate">
                {admin?.name ?? "Admin"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-52 bg-surface border border-border rounded-xl shadow-2xl py-1.5 z-20">
                  <div className="px-3 py-2 border-b border-border mb-1">
                    <p className="text-xs text-muted truncate">{admin?.email}</p>
                  </div>
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 min-w-0 px-4 md:px-6 py-5 md:py-6">{children}</main>
      </div>
    </div>
  );
}
