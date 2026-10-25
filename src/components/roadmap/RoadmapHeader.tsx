import React from "react";
import { Sparkles, Target, RotateCw, CheckCircle2, TrendingUp, Layers } from "lucide-react";
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
  isGenerating?: boolean;
  isLoading?: boolean;
  totalMilestones?: number;
  completedMilestones?: number;
}

const COMMON_CAREER_ROLES = [
  "Full Stack Developer",
  "Frontend Engineer",
  "Backend Architect",
  "DevOps & Cloud Engineer",
  "Data Scientist / AI Engineer",
  "Mobile App Developer",
];

export function RoadmapHeader({
  role,
  onRoleChange,
  experience,
  onExperienceChange,
  onGenerate,
  isGenerating = false,
  isLoading = false,
  totalMilestones = 0,
  completedMilestones = 0,
}: RoadmapHeaderProps) {
  const loading = isGenerating || isLoading;
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
            {percentage === 100 && totalMilestones > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" /> All Milestones Completed!
              </span>
            )}
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Personalized Learning Milestones
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            AI-sequenced curriculum bridging your verified profile to target market expectations.
            Complete milestones, build verified practical projects, and test your knowledge in the Mock Interview Studio.
          </p>
        </div>

        {/* Right: Milestone Progress Counter */}
        {totalMilestones > 0 && (
          <div className="flex items-center gap-4 self-start lg:self-auto shrink-0 bg-secondary/30 border border-border/60 rounded-2xl p-4 shadow-sm">
            <div className="space-y-0.5 text-left">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-primary" /> Roadmap Progress
              </span>
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
      <div className="space-y-3 pt-3 border-t border-border/50">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Target className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={role}
              onChange={(e) => onRoleChange(e.target.value)}
              placeholder="Target Career Role (e.g. Senior Full Stack Engineer)"
              className="pl-9 h-11 rounded-xl bg-secondary/30 border-border/80 text-xs sm:text-sm font-medium focus-visible:ring-primary/40"
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && role.trim() && !loading) {
                  onGenerate();
                }
              }}
            />
          </div>

          <Select value={experience} onValueChange={onExperienceChange} disabled={loading}>
            <SelectTrigger className="w-full sm:w-48 h-11 rounded-xl bg-secondary/30 border-border/80 text-xs sm:text-sm font-medium">
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
            disabled={loading || !role.trim()}
            variant="gradient"
            className="h-11 px-6 gap-2 rounded-xl text-xs sm:text-sm font-semibold text-white shadow-md shrink-0 hover:opacity-90 active:scale-95 transition-all"
          >
            {loading ? (
              <RotateCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span>{loading ? "Sequencing..." : "Generate Roadmap"}</span>
          </Button>
        </div>

        {/* Quick Role Suggestions */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-muted-foreground font-medium mr-1 flex items-center gap-1">
            <Layers className="w-3 h-3 text-primary/70" /> Popular Targets:
          </span>
          {COMMON_CAREER_ROLES.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                onRoleChange(preset);
              }}
              className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all font-medium ${
                role === preset
                  ? "bg-primary/20 border-primary text-primary"
                  : "bg-secondary/20 border-border/50 text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
