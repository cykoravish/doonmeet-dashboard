import { cn } from "@/lib/cn";

type StatusTone = "positive" | "negative" | "neutral" | "warning";

const TONE_DOT: Record<StatusTone, string> = {
  positive: "bg-accent",
  negative: "bg-danger",
  neutral: "bg-muted",
  warning: "bg-warning",
};

const TONE_BADGE: Record<StatusTone, string> = {
  positive: "bg-accent/10 text-accent border-accent/20",
  negative: "bg-danger/10 text-danger border-danger/20",
  neutral: "bg-white/5 text-muted border-border",
  warning: "bg-warning/10 text-warning border-warning/20",
};

export function StatusDot({ tone, className }: { tone: StatusTone; className?: string }) {
  return <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", TONE_DOT[tone], className)} />;
}

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_BADGE[tone],
        className
      )}
    >
      <StatusDot tone={tone} />
      {children}
    </span>
  );
}
