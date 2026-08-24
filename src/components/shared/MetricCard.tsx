import React from "react";
import { motion } from "framer-motion";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, type StatusVariant } from "./StatusBadge";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: number | string;
  suffix?: string;
  prefix?: string;
  icon: React.ComponentType<{ className?: string }>;
  delta?: string;
  statusLabel?: string;
  statusVariant?: StatusVariant;
  isLoading?: boolean;
  emptyFallbackText?: string;
  delay?: number;
  className?: string;
  onClick?: () => void;
}

export function MetricCard({
  label,
  value,
  suffix = "",
  prefix = "",
  icon: Icon,
  delta,
  statusLabel,
  statusVariant = "default",
  isLoading = false,
  emptyFallbackText,
  delay = 0,
  className,
  onClick,
}: MetricCardProps) {
  const isNumeric = typeof value === "number";
  const hasValue = isNumeric ? value > 0 : Boolean(value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay, ease: "easeOut" }}
      onClick={onClick}
      className={cn(
        "glass-card glass-card-hover relative flex flex-col justify-between overflow-hidden rounded-2xl p-5",
        onClick && "cursor-pointer",
        className
      )}
      role="group"
      aria-label={`${label}: ${value}${suffix}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          {isLoading ? (
            <Skeleton className="mt-1 h-9 w-20 rounded-lg bg-secondary/80" />
          ) : hasValue ? (
            <div className="flex items-baseline gap-1">
              {prefix && <span className="text-xl font-bold text-muted-foreground">{prefix}</span>}
              <span className="font-display text-3xl font-bold tracking-tight text-foreground">
                {isNumeric ? <AnimatedCounter value={value as number} suffix={suffix} /> : `${value}${suffix}`}
              </span>
            </div>
          ) : (
            <div className="flex items-baseline">
              <span className="text-sm font-medium text-muted-foreground">
                {emptyFallbackText || "Not measured"}
              </span>
            </div>
          )}
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-secondary/60 text-primary shadow-inner">
          <Icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
        {statusLabel ? (
          <StatusBadge variant={statusVariant} dot>
            {statusLabel}
          </StatusBadge>
        ) : (
          <span className="text-muted-foreground">Status active</span>
        )}

        {delta && <span className="font-medium text-emerald-400">{delta}</span>}
      </div>
    </motion.div>
  );
}
