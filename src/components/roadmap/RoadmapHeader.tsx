import React from "react";
import { Map, Sparkles, Target, Layers, Play, CheckCircle2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AnimatedCounter } from "@/components/AnimatedCounter";

interface RoadmapHeaderProps {
  role: string;
  onRoleChange: (r: string) => void;
  experience: string;
  onExperienceChange: (exp: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  totalMilestones: number;
  completedMilestones: number;
}

export function RoadmapHeader({
  role,
  onRoleChange,
  experience,
  onExperienceChange,
  onGenerate,
  isGenerating,
  totalMilestones,
  completedMilestones,
}: RoadmapHeaderProps) {
  const percentage =
    totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  return (
    <div className="glass-card gradient-border relative overflow-hidden rounded-3xl p-6 sm:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Title & Overview */}
        <div className="space-y-2 max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge variant="ai" dot>
              Adaptive Career Roadmap
            </StatusBadge>
            <span className="text-xs text-muted-foreground">• Milestone Guided</span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Personalized Learning Milestones
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            AI-sequenced curriculum bridging your verified profile to target market expectations. Complete milestones and validate skills in the Mock Interview Studio.
          </p>
        </div>

        {/* Right: Milestone Progress Counter */}
        {totalMilestones > 0 && (
          <div className="flex items-center gap-4 self-start lg:self-auto shrink-0 bg-secondary/30 border border-border/60 rounded-2xl p-4">
            <div className="space-y-0.5 text-left">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Milestones Progress</span>
              <p className="text-xs font-semibold text-foreground">
                {completedMilestones} of {totalMilestones} Completed
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/30">
              <span className="font-display text-base font-bold gradient-text">
                <AnimatedCounter value={percentage} suffix="%" />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Target Role & Level Generation Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3 border-t border-border/50">
        <div className="relative flex-1 min-w-[200px]">
          <Target className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={role}
            onChange={(e) => onRoleChange(e.target.value)}
            placeholder="Target Career Role (e.g. Senior Full Stack Engineer)"
            className="pl-9 h-10 rounded-xl bg-secondary/30 border-border/80 text-xs font-medium"
          />
        </div>

        <Select value={experience} onValueChange={onExperienceChange}>
          <SelectTrigger className="w-full sm:w-44 h-10 rounded-xl bg-secondary/30 border-border/80 text-xs">
            <SelectValue placeholder="Experience Level" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border bg-popover">
            <SelectItem value="Beginner">Beginner (0-2 Yrs)</SelectItem>
            <SelectItem value="Intermediate">Intermediate (2-5 Yrs)</SelectItem>
            <SelectItem value="Advanced">Advanced (5+ Yrs)</SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={onGenerate}
          disabled={isGenerating || !role.trim()}
          variant="gradient"
          className="h-10 px-5 gap-2 rounded-xl text-xs font-semibold text-white shadow-md shrink-0"
        >
          {isGenerating ? (
            <RotateCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          <span>{isGenerating ? "Sequencing..." : "Generate Roadmap"}</span>
        </Button>
      </div>
    </div>
  );
}
