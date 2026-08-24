import React from "react";
import { Link } from "react-router-dom";
import { Target, AlertTriangle, Plus, CheckCircle2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { CriticalSkillGapItem } from "@/services/intelligenceService";

interface CriticalSkillGapsProps {
  gaps: CriticalSkillGapItem[];
  onAddToRoadmap?: (skill: string) => void;
}

export function CriticalSkillGaps({ gaps, onAddToRoadmap }: CriticalSkillGapsProps) {
  return (
    <div className="glass-card rounded-3xl p-6 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-cyan-400" />
          <h3 className="font-display text-sm font-bold text-foreground">
            Critical Skill Gaps Intelligence
          </h3>
        </div>
        <StatusBadge variant="warning" dot>
          Cross-Module Signal
        </StatusBadge>
      </div>

      <p className="text-xs text-muted-foreground">
        Technologies detected across target role requirements and active hiring opportunities:
      </p>

      <div className="space-y-3">
        {gaps.map((gap, i) => (
          <div
            key={gap.skill}
            className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border border-border/60 bg-secondary/20 hover:border-primary/40 hover:bg-secondary/40 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold text-xs">
                #{i + 1}
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">{gap.skill}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Briefcase className="h-2.5 w-2.5" />
                    Found in {gap.frequency_in_jobs} jobs
                  </span>
                  <span>•</span>
                  <span>Role Requirement</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button asChild size="sm" variant="outline" className="rounded-xl text-xs gap-1.5 border-border/60 hover:bg-secondary">
                <Link to={`/roadmap?skill=${gap.skill}`}>
                  <Plus className="h-3 w-3 text-primary" />
                  Add to Roadmap
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
