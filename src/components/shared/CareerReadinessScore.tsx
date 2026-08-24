import React from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Target, ShieldCheck, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import type { CareerReadinessBreakdown } from "@/types/career";
import { cn } from "@/lib/utils";

interface CareerReadinessScoreProps {
  breakdown: CareerReadinessBreakdown;
  targetRoleTitle?: string;
  className?: string;
}

export function CareerReadinessScore({
  breakdown,
  targetRoleTitle = "No Target Role Selected",
  className,
}: CareerReadinessScoreProps) {
  const { overallScore, resumeHealth, roleMatch, interviewReadiness, marketOpportunity, statusLabel, isMeasured } =
    breakdown;

  return (
    <div
      className={cn(
        "glass-card gradient-border relative overflow-hidden rounded-3xl p-6 sm:p-8 transition-all duration-300",
        className
      )}
    >
      {/* Background ambient glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Left Info */}
        <div className="space-y-3 max-w-xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <StatusBadge variant="ai" dot>
              AI Career Intelligence
            </StatusBadge>
            <span className="text-xs text-muted-foreground">Target Role:</span>
            <span className="font-semibold text-foreground">{targetRoleTitle}</span>
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Overall Career Readiness
          </h2>

          <p className="text-sm leading-relaxed text-muted-foreground">
            {isMeasured ? (
              <>
                Your profile is performing strongly. Continue practicing system design and optimizing your resume keywords to achieve full hire readiness.
              </>
            ) : (
              <>
                Upload your first resume and complete a 5-minute mock interview to calculate your comprehensive career readiness score.
              </>
            )}
          </p>

          {/* Sub-Metric Pills */}
          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
            <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-secondary/40 px-3 py-1.5">
              <span className="text-muted-foreground">Resume:</span>
              <span className="font-semibold text-foreground">
                {resumeHealth !== null ? `${resumeHealth}%` : "Not Analyzed"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-secondary/40 px-3 py-1.5">
              <span className="text-muted-foreground">Skill Match:</span>
              <span className="font-semibold text-foreground">
                {roleMatch !== null ? `${roleMatch}%` : "Not Scored"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-secondary/40 px-3 py-1.5">
              <span className="text-muted-foreground">Interview:</span>
              <span className="font-semibold text-foreground">
                {interviewReadiness !== null ? `${interviewReadiness}%` : "Not Measured"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-secondary/40 px-3 py-1.5">
              <span className="text-muted-foreground">Market Match:</span>
              <span className="font-semibold text-foreground">
                {marketOpportunity !== null ? `${marketOpportunity}%` : "Not Scored"}
              </span>
            </div>
          </div>
        </div>

        {/* Right Score Gauge & Action */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 shadow-[0_0_30px_-5px_rgba(124,92,252,0.3)]">
              <span className="font-display text-4xl sm:text-5xl font-bold tracking-tight gradient-text">
                {isMeasured ? `${overallScore}%` : "--"}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Readiness Status</span>
              <p className="font-display text-base font-semibold text-foreground">{statusLabel}</p>
              <span className="inline-block text-xs font-medium text-emerald-400">
                {isMeasured ? "▲ Calculated from live metrics" : "Awaiting initial inputs"}
              </span>
            </div>
          </div>

          <Link to="/roles/analyze" className="w-full sm:w-auto">
            <Button
              className="w-full sm:w-auto gap-2 bg-gradient-to-r from-primary to-accent font-medium text-white shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span>View Career Strategy</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Progress Bar Line */}
      <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-secondary/60">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-emerald-400"
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(overallScore, isMeasured ? 5 : 0)}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
