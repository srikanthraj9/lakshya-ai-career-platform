import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, AlertCircle, TrendingUp, Briefcase, FileText, Wand2, MessageSquare, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NextBestAction } from "@/types/career";
import { cn } from "@/lib/utils";

const iconMap = {
  FileText,
  Target: TrendingUp,
  MessageSquare,
  Briefcase,
  Map,
  Wand2,
};

interface AIInsightCardProps {
  action: NextBestAction;
  className?: string;
}

export function AIInsightCard({ action, className }: AIInsightCardProps) {
  const Icon = iconMap[action.iconName] || Sparkles;

  const priorityStyles = {
    high: {
      dot: "bg-rose-500",
      pill: "border-rose-500/30 bg-rose-500/10 text-rose-400",
      border: "hover:border-rose-500/30",
    },
    medium: {
      dot: "bg-amber-500",
      pill: "border-amber-500/30 bg-amber-500/10 text-amber-400",
      border: "hover:border-amber-500/30",
    },
    opportunity: {
      dot: "bg-emerald-500",
      pill: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
      border: "hover:border-emerald-500/30",
    },
  };

  const style = priorityStyles[action.priority] || priorityStyles.medium;

  return (
    <div
      className={cn(
        "glass-card glass-card-hover relative flex flex-col justify-between rounded-2xl p-5 transition-all duration-300",
        style.border,
        className
      )}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", style.dot)} />
            <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide", style.pill)}>
              {action.priority === "high" ? "High Priority" : action.priority === "medium" ? "Recommended" : "Opportunity"}
            </span>
          </div>

          <span className="text-xs font-semibold text-accent">{action.impactTag}</span>
        </div>

        <div>
          <h4 className="font-display text-base font-semibold text-foreground tracking-tight flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary shrink-0" />
            <span>{action.title}</span>
          </h4>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{action.description}</p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border/40">
        <Link to={action.ctaHref}>
          <Button variant="ghost" size="sm" className="w-full justify-between hover:bg-primary/10 hover:text-primary text-xs font-medium h-8 px-2">
            <span>{action.ctaText}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
