import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Unable to load data",
  message = "Please check your network connection and try again.",
  onRetry,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      className={`glass-card rounded-3xl p-6 text-center space-y-4 border border-destructive/20 bg-destructive/5 ${className}`}
    >
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
        <AlertCircle className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <h4 className="font-display text-sm font-semibold text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">{message}</p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="rounded-xl text-xs gap-1.5 border-border/60 hover:bg-secondary"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </Button>
      )}
    </div>
  );
}
