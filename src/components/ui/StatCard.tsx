import { cn } from "@/lib/cn";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: "default" | "danger" | "warning";
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs text-muted font-medium truncate">{label}</p>
        <p
          className={cn(
            "text-2xl font-semibold mt-1.5 font-mono tabular-nums",
            tone === "danger" && "text-danger",
            tone === "warning" && "text-warning",
            tone === "default" && "text-foreground"
          )}
        >
          {value}
        </p>
      </div>
      {Icon && (
        <div className="h-8 w-8 rounded-lg bg-surface-raised border border-border flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-muted" strokeWidth={2} />
        </div>
      )}
    </div>
  );
}
