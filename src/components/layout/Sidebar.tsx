"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { NAV_ITEMS, isNavItemActive } from "@/config/nav-items";
import { cn } from "@/lib/cn";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-border shrink-0">
        <div className="h-8 w-8 rounded-lg bg-accent/10 border border-accent/25 flex items-center justify-center">
          <ShieldCheck className="h-4 w-4 text-accent" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground leading-tight">DoonMeet</p>
          <p className="text-[11px] text-muted leading-tight">Control Center</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isNavItemActive(pathname, item.href);
          const Icon = item.icon;

          if (item.comingSoon) {
            return (
              <div
                key={item.href}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-muted/50 cursor-default select-none"
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4" strokeWidth={2} />
                  {item.label}
                </span>
                <span className="text-[10px] border border-border rounded px-1.5 py-0.5 text-muted/60">
                  Soon
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:text-foreground hover:bg-white/5"
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
