import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingStateProps {
  rows?: number;
  className?: string;
}

export function LoadingState({ rows = 3, className = "" }: LoadingStateProps) {
  return (
    <div className={`glass-card rounded-3xl p-6 space-y-4 ${className}`}>
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <Skeleton className="h-5 w-36 rounded-lg" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3.5 w-3/4 rounded-md" />
              <Skeleton className="h-2.5 w-1/2 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
