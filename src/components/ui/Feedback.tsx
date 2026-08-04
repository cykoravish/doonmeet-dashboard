import { cn } from "@/lib/cn";
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { Button } from "./Button";

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="h-10 w-10 rounded-xl bg-surface-raised border border-border flex items-center justify-center mb-3">
        <Icon className="h-4.5 w-4.5 text-muted" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted mt-1 max-w-xs">{description}</p>
    </div>
  );
}

export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-3.5 rounded bg-white/5 animate-pulse" style={{ width: `${60 + (i % 3) * 20}px` }} />
        </td>
      ))}
    </tr>
  );
}

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-1 py-3">
      <p className="text-xs text-muted">
        Page <span className="font-mono">{page}</span> of{" "}
        <span className="font-mono">{totalPages}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="ghost"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className={cn(page <= 1 && "opacity-30")}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className={cn(page >= totalPages && "opacity-30")}
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
