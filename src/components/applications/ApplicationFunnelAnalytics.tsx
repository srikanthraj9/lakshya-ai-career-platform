import React from "react";
import { TrendingUp, Sparkles, Brain, CheckCircle2, ShieldCheck, Zap, ArrowRight } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { JobApplicationStats, OutcomeLearningInsight } from "@/services/applicationTrackerService";

interface ApplicationFunnelAnalyticsProps {
  stats: JobApplicationStats;
  outcomeInsights: OutcomeLearningInsight[];
}

export function ApplicationFunnelAnalytics({
  stats,
  outcomeInsights,
}: ApplicationFunnelAnalyticsProps) {
  const funnelSteps = [
    { label: "Wishlist", count: stats.wishlist_count, color: "bg-muted-foreground" },
    { label: "Applied", count: stats.applied_count, color: "bg-primary" },
    { label: "Screening", count: stats.screening_count, color: "bg-cyan-400" },
    { label: "Interviewing", count: stats.interviewing_count, color: "bg-amber-400" },
    { label: "Offer", count: stats.offer_count, color: "bg-emerald-400" },
  ];

  const maxCount = Math.max(...funnelSteps.map((s) => s.count), 1);

  return (
    <div className="space-y-6">
      {/* 1. Funnel Stages Visualizer */}
      <div className="glass-card rounded-3xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <h3 className="font-display text-base font-bold text-foreground">
              Application Pipeline & Conversion Funnel
            </h3>
          </div>
          <StatusBadge variant="success" dot>
            {stats.conversion_rate}% Conversion Rate
          </StatusBadge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {funnelSteps.map((step) => {
            const widthPct = Math.max(15, Math.round((step.count / maxCount) * 100));
            return (
              <div key={step.label} className="rounded-2xl border border-border/60 bg-secondary/20 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground font-semibold">{step.label}</span>
                  <span className="text-base font-bold text-foreground">{step.count}</span>
                </div>
                <div className="h-1.5 w-full bg-secondary/80 rounded-full overflow-hidden">
                  <div className={`h-full ${step.color}`} style={{ width: `${widthPct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Outcome Learning Insights */}
      {outcomeInsights && outcomeInsights.length > 0 && (
        <div className="glass-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-accent" />
              <h3 className="font-display text-base font-bold text-foreground">
                Outcome-Driven Learning Insights
              </h3>
            </div>
            <StatusBadge variant="ai" dot>
              AI Pattern Feedback
            </StatusBadge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {outcomeInsights.map((insight) => (
              <div
                key={insight.id}
                className="p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-foreground text-sm">{insight.title}</h4>
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    {insight.confidence_score}% Confidence
                  </span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {insight.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
