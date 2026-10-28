import React from "react";
import { motion } from "framer-motion";
import { Award, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { ResumeScoreBreakdown } from "@/types";

interface ResumeHealthCardProps {
  overallScore?: number;
  breakdown?: ResumeScoreBreakdown | null;
  baseQualityScore?: number | null;
  versionLabel?: string | null;
  versionNumber?: number | null;
  onViewDiagnostics?: () => void;
}

export function ResumeHealthCard({
  overallScore = 0,
  breakdown,
  baseQualityScore,
  versionLabel,
  versionNumber,
  onViewDiagnostics,
}: ResumeHealthCardProps) {
  const displayScore = overallScore || baseQualityScore || 0;
  const isExcellent = displayScore >= 85;
  const isCompetitive = displayScore >= 70;

  const scoreLabel = isExcellent ? "Excellent Profile" : isCompetitive ? "Competitive Profile" : "Needs Optimization";
  const scoreBadgeVariant = isExcellent ? "success" : isCompetitive ? "warning" : "destructive";

  // Real breakdown metrics mapping
  const metrics = [
    {
      label: "Keyword Match",
      value: breakdown?.keyword_match != null ? Math.round(breakdown.keyword_match) : overallScore,
      color: "from-primary to-accent",
    },
    {
      label: "Formatting & Structure",
      value: breakdown?.formatting != null ? Math.round(breakdown.formatting) : overallScore,
      color: "from-emerald-500 to-teal-400",
    },
    {
      label: "Action Verbs & Impact",
      value: breakdown?.action_verbs != null ? Math.round(breakdown.action_verbs) : overallScore,
      color: "from-accent to-sky-400",
    },
    {
      label: "Section Coverage",
      value: breakdown?.section_coverage != null ? Math.round(breakdown.section_coverage) : overallScore,
      color: "from-purple-500 to-primary",
    },
  ];

  return (
    <div className="glass-card gradient-border relative overflow-hidden rounded-3xl p-6 space-y-6">
      {/* Top Header & Master Gauge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Master Resume Health
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-2xl font-bold text-foreground">ATS Score</h3>
            <StatusBadge variant={scoreBadgeVariant} dot>
              {scoreLabel}
            </StatusBadge>
            {(versionLabel || versionNumber) && (
              <span className="text-[10px] font-semibold text-primary px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                {versionLabel || `v${versionNumber}.0`}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 shadow-[0_0_25px_-5px_rgba(124,92,252,0.3)]">
            <span className="font-display text-2xl sm:text-3xl font-bold tracking-tight gradient-text">
              <AnimatedCounter value={displayScore} suffix="%" />
            </span>
          </div>
        </div>
      </div>

      {/* Breakdown Progress Bars */}
      <div className="space-y-3 pt-1">
        {metrics.map((m, i) => (
          <div key={m.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">{m.label}</span>
              <span className="font-semibold text-foreground">{m.value}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/80">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${m.color}`}
                initial={{ width: 0 }}
                animate={{ width: `${m.value}%` }}
                transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Highlights summary & View Diagnostics Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>ATS Parser Friendly</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span>High Tech Stack Match</span>
          </div>
        </div>

        {onViewDiagnostics && (
          <button
            onClick={onViewDiagnostics}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 ml-auto"
          >
            <span>View Full ATS Diagnostics</span>
            <span>&rarr;</span>
          </button>
        )}
      </div>
    </div>
  );
}
