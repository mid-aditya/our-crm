import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "success"
    | "warning";
  /** Microlabel mono — untuk tag/status singkat */
  micro?: boolean;
}

export function Badge({
  className,
  variant = "default",
  micro,
  ...props
}: BadgeProps) {
  const variants = {
    default: "bg-primary/10 text-primary",
    secondary: "bg-secondary text-secondary-foreground",
    destructive: "bg-destructive/10 text-destructive",
    outline: "text-foreground border border-border",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
  };

  return (
    <div
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded px-1.5 text-[11px] font-semibold leading-none",
        micro && "microlabel",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
