import React, { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles, CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import type { RecommendationReason } from "@/services/intelligenceService";

interface RecommendationWhyProps {
  reason?: RecommendationReason;
  impactScore: number;
  confidenceScore: number;
  urgencyScore: number;
}

export function RecommendationWhy({
  reason,
  impactScore,
  confidenceScore,
  urgencyScore,
}: RecommendationWhyProps) {
  const [expanded, setExpanded] = useState(false);

  if (!reason && !impactScore) return null;

  return (
    <div className="rounded-2xl border border-border/50 bg-secondary/30 overflow-hidden text-xs transition-all">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold text-foreground text-[11px]">Why this matters</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            Impact: <strong className="text-foreground">{impactScore}%</strong> • Confidence: <strong className="text-foreground">{confidenceScore}%</strong>
          </span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </div>
      </button>

      {expanded && (
        <div className="px-3.5 pb-3.5 pt-1 space-y-3 border-t border-border/40 text-[11px]">
          {reason?.explanation && (
            <p className="text-muted-foreground leading-relaxed italic">
              "{reason.explanation}"
            </p>
          )}

          {reason?.factors && reason.factors.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Contributing Signals
              </span>
              {reason.factors.map((factor, idx) => (
                <div key={idx} className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{factor}</span>
                </div>
              ))}
            </div>
          )}

          {/* Metric Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">
              <Zap className="h-2.5 w-2.5" />
              Impact: {impactScore}%
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
              <ShieldCheck className="h-2.5 w-2.5" />
              Confidence: {confidenceScore}%
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400">
              Urgency: {Math.round(urgencyScore * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
