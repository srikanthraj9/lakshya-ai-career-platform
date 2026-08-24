import React from "react";
import { Sparkles, Plus, AlertTriangle, Briefcase, FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useCareerContext } from "@/hooks/useCareerContext";
import { toast } from "sonner";

interface RoadmapInsightsProps {
  onAddSkill: (skill: string) => void;
}

export function RoadmapInsights({ onAddSkill }: RoadmapInsightsProps) {
  const { missingSkills, activeResume, targetRole } = useCareerContext();

  if (!missingSkills || missingSkills.length === 0) return null;

  const handleAddAll = () => {
    missingSkills.forEach((skill) => onAddSkill(skill));
    toast.success(`Added ${missingSkills.length} recommended skills to your Career Roadmap!`);
  };

  return (
    <div className="glass-card gradient-border rounded-3xl p-5 space-y-3 bg-gradient-to-r from-primary/10 via-secondary/20 to-accent/10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-xs sm:text-sm font-bold text-foreground">
              Cross-Platform Skill Gaps Detected
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Synthesized from Resume ATS analysis and {targetRole} industry benchmarks
            </p>
          </div>
        </div>

        <Button
          onClick={handleAddAll}
          variant="gradient"
          size="sm"
          className="h-8 gap-1.5 rounded-xl text-xs font-semibold text-white shadow-sm shrink-0 self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add All to Roadmap</span>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {missingSkills.slice(0, 5).map((skill) => (
          <button
            key={skill}
            onClick={() => {
              onAddSkill(skill);
              toast.success(`"${skill}" added to Career Roadmap!`);
            }}
            className="group flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300 font-medium hover:bg-amber-500/20 transition-all"
          >
            <Plus className="h-3 w-3 text-amber-400 group-hover:scale-110 transition-transform" />
            <span>{skill}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
