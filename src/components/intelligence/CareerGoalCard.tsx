import React, { useState } from "react";
import { Target, Pencil, Calendar, DollarSign, Building, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CareerGoalEditor } from "./CareerGoalEditor";
import type { CareerGoal } from "@/services/intelligenceService";

interface CareerGoalCardProps {
  goal: CareerGoal | null;
  currentReadiness: number;
  onSaveGoal: (payload: Partial<CareerGoal>) => Promise<void>;
}

export function CareerGoalCard({
  goal,
  currentReadiness,
  onSaveGoal,
}: CareerGoalCardProps) {
  const [editorOpen, setEditorOpen] = useState(false);

  const targetRole = goal?.target_role || "Target Role";
  const targetReadiness = goal?.target_readiness_score || 90;
  const targetCompany = goal?.target_company || "Target Industry / Companies";
  const targetSalary = goal?.target_salary || "Target Compensation";
  const targetDate = goal?.target_date ? new Date(goal.target_date).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Target Milestone";

  const progressPct = Math.min(100, Math.round((currentReadiness / targetReadiness) * 100));

  return (
    <>
      <div className="glass-card rounded-3xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm font-bold text-foreground">Target Career Goal</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditorOpen(true)}
            className="h-8 rounded-xl text-xs gap-1.5 hover:bg-secondary text-primary"
          >
            <Pencil className="h-3 w-3" />
            Edit Goal
          </Button>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-display text-base font-bold text-foreground">{targetRole}</p>
              <p className="text-xs text-muted-foreground">{targetCompany}</p>
            </div>
            <StatusBadge variant="ai" dot>
              {progressPct}% of Goal
            </StatusBadge>
          </div>

          {/* Progress to Target Readiness */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Readiness: <strong className="text-foreground">{currentReadiness}%</strong></span>
              <span>Target: <strong className="text-primary">{targetReadiness}%</strong></span>
            </div>
            <Progress value={progressPct} className="h-2 bg-secondary/80" />
          </div>

          {/* Details Row */}
          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span>Target: <strong className="text-foreground">{targetDate}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
              <span>Target: <strong className="text-foreground">{targetSalary}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <CareerGoalEditor
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        currentGoal={goal}
        onSave={onSaveGoal}
      />
    </>
  );
}
