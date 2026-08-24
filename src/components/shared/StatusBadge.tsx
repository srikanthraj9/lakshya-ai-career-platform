import React from "react";
import { cn } from "@/lib/utils";

export type StatusVariant = "default" | "success" | "warning" | "destructive" | "ai" | "accent";

interface StatusBadgeProps {
  children: React.ReactNode;
  variant?: StatusVariant;
  className?: string;
  dot?: boolean;
}

export function StatusBadge({
  children,
  variant = "default",
  className,
  dot = false,
}: StatusBadgeProps) {
  const variantStyles: Record<StatusVariant, string> = {
    default: "border-border/60 bg-secondary/60 text-muted-foreground",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    destructive: "border-destructive/30 bg-destructive/10 text-destructive",
    ai: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_12px_-3px_rgba(34,211,238,0.25)]",
    accent: "border-primary/30 bg-primary/10 text-primary-foreground",
  };

  const dotColors: Record<StatusVariant, string> = {
    default: "bg-muted-foreground",
    success: "bg-emerald-400",
    warning: "bg-amber-400",
    destructive: "bg-destructive",
    ai: "bg-cyan-400 animate-pulse",
    accent: "bg-primary",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide transition-colors",
        variantStyles[variant],
        className
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotColors[variant])} />}
      {children}
    </span>
  );
}
