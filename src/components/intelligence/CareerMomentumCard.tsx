import React from "react";
import { TrendingUp, Sparkles, Zap, ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { CareerMomentum } from "@/services/intelligenceService";

interface CareerMomentumCardProps {
  momentum: CareerMomentum;
}

export function CareerMomentumCard({ momentum }: CareerMomentumCardProps) {
  return (
    <div className="glass-card rounded-3xl p-6 space-y-5">
      <div className="flex items-center justify-between pb-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          <h3 className="font-display text-sm font-bold text-foreground">Career Momentum & Velocity</h3>
        </div>
        <StatusBadge variant="success" dot>
          {momentum.delta_text}
        </StatusBadge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3 space-y-1">
          <p className="text-[10px] text-muted-foreground">Resume ATS</p>
          <p className="text-base font-bold text-foreground">
            {momentum.signals?.resume?.score ?? 78}%
          </p>
          <span className="text-[9px] font-semibold text-emerald-400">↑ Verified</span>
        </div>

        <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3 space-y-1">
          <p className="text-[10px] text-muted-foreground">Role Fit</p>
          <p className="text-base font-bold text-foreground">
            {momentum.signals?.role_match?.score ?? 86}%
          </p>
          <span className="text-[9px] font-semibold text-cyan-400">↑ Target Fit</span>
        </div>

        <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3 space-y-1">
          <p className="text-[10px] text-muted-foreground">Interview AI</p>
          <p className="text-base font-bold text-foreground">
            {momentum.signals?.interview?.score ?? 75}%
          </p>
          <span className="text-[9px] font-semibold text-accent">→ Active</span>
        </div>

        <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3 space-y-1">
          <p className="text-[10px] text-muted-foreground">Roadmap</p>
          <p className="text-base font-bold text-foreground">
            {momentum.signals?.roadmap?.score ?? 60}%
          </p>
          <span className="text-[9px] font-semibold text-primary">↑ 2 Steps</span>
        </div>
      </div>
    </div>
  );
}
