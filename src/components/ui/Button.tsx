import { cn } from "@/lib/cn";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-accent text-accent-foreground hover:brightness-110 active:brightness-95",
  secondary:
    "bg-surface-raised text-foreground border border-border hover:bg-white/5 active:bg-white/10",
  danger: "bg-danger/10 text-danger border border-danger/25 hover:bg-danger/15",
  ghost: "text-muted hover:text-foreground hover:bg-white/5",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "text-xs px-2.5 py-1.5 rounded-md gap-1.5",
  md: "text-sm px-3.5 py-2 rounded-lg gap-2",
};

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
}
