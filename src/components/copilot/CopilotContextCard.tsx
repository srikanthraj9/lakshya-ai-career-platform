import React from "react";
import { Link } from "react-router-dom";
import { Target, FileText, Brain, Sparkles, ArrowRight, ShieldCheck, Map } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useCareerContext } from "@/hooks/useCareerContext";

export function CopilotContextCard() {
  const { targetRole, activeResume, readiness, detectedSkills, missingSkills } = useCareerContext();

  return (
    <div className="glass-card rounded-3xl p-5 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-400" />
          <h4 className="font-display text-xs font-bold uppercase tracking-wider text-foreground">
            Live Career Context
          </h4>
        </div>
        <StatusBadge variant="ai" className="text-[9px] py-0 px-1.5">
          Auto Injected
        </StatusBadge>
      </div>

      <div className="space-y-2.5 text-xs">
        {/* Target Goal */}
        <div className="rounded-xl border border-border/60 bg-secondary/30 p-2.5 space-y-0.5">
          <span className="text-[10px] text-muted-foreground uppercase font-semibold">Target Career Goal</span>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground truncate">{targetRole}</span>
            <span className="text-primary font-bold">{readiness.overallScore}% Ready</span>
          </div>
        </div>

        {/* Active Resume ATS */}
        {activeResume && (
          <div className="rounded-xl border border-border/60 bg-secondary/30 p-2.5 space-y-0.5">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Active Resume</span>
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground truncate">{activeResume.file_name}</span>
              <StatusBadge variant="success" className="text-[9px] py-0 px-1">
                ATS {activeResume.ats_score}%
              </StatusBadge>
            </div>
          </div>
        )}

        {/* Top Priority Gaps */}
        {missingSkills.length > 0 && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 space-y-1.5">
            <span className="text-[10px] text-amber-400 uppercase font-bold">Identified Skill Gaps</span>
            <div className="flex flex-wrap gap-1">
              {missingSkills.slice(0, 3).map((gap) => (
                <span
                  key={gap}
                  className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300 font-medium"
                >
                  {gap}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Direct Shortcuts */}
      <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
        <Link to="/roadmap" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
          <Map className="h-3 w-3" />
          <span>Roadmap</span>
        </Link>
        <Link to="/resume" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
          <FileText className="h-3 w-3" />
          <span>Resume Studio</span>
        </Link>
      </div>
    </div>
  );
}
