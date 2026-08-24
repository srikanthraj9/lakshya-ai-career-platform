import React from "react";
import { Link } from "react-router-dom";
import { Clock, Plus, Check, Map, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useCareerContext } from "@/hooks/useCareerContext";
import { toast } from "sonner";
import type { CareerAction } from "@/types";

interface RoleActionPlanProps {
  actions: CareerAction[];
}

export function RoleActionPlan({ actions }: RoleActionPlanProps) {
  const { addSkillToRoadmap } = useCareerContext();

  const handleAddAction = (action: CareerAction) => {
    if (action.skill) {
      addSkillToRoadmap(action.skill);
      toast.success(`"${action.skill}" added to your Career Roadmap!`);
    } else {
      addSkillToRoadmap(action.action);
      toast.success(`Action item added to your Roadmap!`);
    }
  };

  if (!actions || actions.length === 0) return null;

  return (
    <div className="space-y-4 pt-4 border-t border-border/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h4 className="font-display text-xs font-bold uppercase tracking-wider text-foreground">
            Recommended Action Plan to Reach 100% Fit
          </h4>
        </div>
        <Link to="/roadmap">
          <span className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
            Open Roadmap <ArrowRight className="h-3 w-3" />
          </span>
        </Link>
      </div>

      <div className="space-y-2.5">
        {actions.map((act, idx) => (
          <div
            key={idx}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-border/60 bg-secondary/20 hover:border-primary/30 transition-all"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">{act.action}</span>
                {act.priority && (
                  <StatusBadge variant={act.priority === "high" ? "destructive" : "warning"} className="text-[9px] py-0 px-1.5">
                    {act.priority.toUpperCase()}
                  </StatusBadge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{act.rationale}</p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                <Clock className="h-3 w-3" /> {act.estimated_weeks} {act.estimated_weeks === 1 ? "Week" : "Weeks"}
              </span>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddAction(act)}
                className="h-7 text-xs gap-1 rounded-xl border-primary/30 text-primary hover:bg-primary/10"
              >
                <Plus className="h-3 w-3" />
                <span>Add to Roadmap</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
