import React from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Plus,
  Check,
  TrendingUp,
  Target,
  ArrowRight,
  Mic,
  FileText,
  Award,
  CheckCircle2,
  Clock,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { RoadmapStep } from "@/types";

interface RoadmapInsightsProps {
  roadmap: RoadmapStep[];
  completedCount: number;
  targetRole: string;
  missingSkills?: string[];
  onAddSkill: (skill: string) => void;
  onAddAllSkills?: () => void;
}

export function RoadmapInsights({
  roadmap,
  completedCount,
  targetRole,
  missingSkills = [],
  onAddSkill,
  onAddAllSkills,
}: RoadmapInsightsProps) {
  const totalMilestones = roadmap.length;
  const remainingCount = Math.max(0, totalMilestones - completedCount);
  const percentage =
    totalMilestones > 0 ? Math.round((completedCount / totalMilestones) * 100) : 0;

  // Find the current active milestone (first incomplete milestone)
  const currentMilestoneIndex = roadmap.findIndex((_, idx) => !roadmap[idx] || false);
  const activeMilestone =
    totalMilestones > 0 && completedCount < totalMilestones
      ? roadmap[completedCount] || roadmap[0]
      : null;

  // Set of skills already covered in the roadmap
  const existingSkillsSet = new Set<string>();
  roadmap.forEach((step) => {
    (step.skills || []).forEach((s) => existingSkillsSet.add(s.toLowerCase()));
    if (step.title) existingSkillsSet.add(step.title.toLowerCase());
    if (step.step) existingSkillsSet.add(step.step.toLowerCase());
  });

  const safeMissing = Array.isArray(missingSkills) ? missingSkills : [];
  const unaddedGaps = safeMissing.filter((skill) => !existingSkillsSet.has(skill.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* 1. Skill Gaps Panel */}
      <div className="glass-card gradient-border rounded-3xl p-5 sm:p-6 space-y-4 bg-gradient-to-br from-primary/10 via-secondary/20 to-accent/5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30 shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-foreground">
                Cross-Platform Skill Gaps
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Benchmarks for {targetRole || "your target role"}
              </p>
            </div>
          </div>

          {unaddedGaps.length > 0 && onAddAllSkills && (
            <Button
              onClick={onAddAllSkills}
              variant="gradient"
              size="sm"
              className="h-8 gap-1.5 rounded-xl text-[11px] font-semibold text-white shadow-sm shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add All ({unaddedGaps.length})</span>
            </Button>
          )}
        </div>

        {safeMissing.length === 0 ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>100% Core Skill Alignment</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Your verified profile covers all essential core requirements for {targetRole || "this role"}. Focus on mastering the current milestones!
            </p>
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Synthesized from your resume ATS analysis and industry standards. Click to add them as custom learning milestones:
            </p>

            <div className="flex flex-wrap gap-2">
              {safeMissing.map((skill) => {
                const isAlreadyAdded = existingSkillsSet.has(skill.toLowerCase());

                return (
                  <button
                    key={skill}
                    type="button"
                    disabled={isAlreadyAdded}
                    onClick={() => {
                      if (!isAlreadyAdded) onAddSkill(skill);
                    }}
                    className={`group flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                      isAlreadyAdded
                        ? "bg-secondary/40 border-border/50 text-muted-foreground cursor-default"
                        : "bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 active:scale-95"
                    }`}
                  >
                    {isAlreadyAdded ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Plus className="h-3 w-3 text-amber-400 group-hover:scale-110 transition-transform" />
                    )}
                    <span>{skill}</span>
                    {isAlreadyAdded && (
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                        • In Roadmap
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. Progress & Momentum Tracker */}
      {totalMilestones > 0 && (
        <div className="glass-card rounded-3xl p-5 sm:p-6 space-y-5 border border-border/60">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Roadmap Momentum
            </h3>
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
              {percentage}% Complete
            </span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="h-2 w-full rounded-full bg-secondary/50 overflow-hidden border border-border/40">
              <div
                className="h-full bg-gradient-to-r from-primary via-accent to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground font-medium pt-0.5">
              <span>{completedCount} Completed</span>
              <span>{remainingCount} Remaining</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div className="rounded-2xl border border-border/50 bg-secondary/20 p-3 text-center space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Total
              </span>
              <p className="font-display text-base font-bold text-foreground">
                {totalMilestones}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Done
              </span>
              <p className="font-display text-base font-bold text-emerald-400">
                {completedCount}
              </p>
            </div>
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 text-center space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                To Go
              </span>
              <p className="font-display text-base font-bold text-primary">
                {remainingCount}
              </p>
            </div>
          </div>

          {/* Current Milestone Focus Spotlight */}
          {activeMilestone && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Compass className="h-3 w-3" /> Current Milestone Focus
              </span>
              <h4 className="text-xs sm:text-sm font-bold text-foreground line-clamp-2">
                {activeMilestone.title || activeMilestone.step}
              </h4>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-primary/70" /> Estimated Duration: {activeMilestone.duration || "2 weeks"}
              </p>
            </div>
          )}

          {percentage === 100 && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-center space-y-1">
              <Award className="h-6 w-6 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold text-emerald-300">Curriculum Completed!</h4>
              <p className="text-xs text-muted-foreground">
                You've mastered all designated milestones. Test your skills in Mock Interview Studio to earn your Skill Passport!
              </p>
            </div>
          )}
        </div>
      )}

      {/* 3. Cross-Studio Acceleration Hub */}
      <div className="glass-card rounded-3xl p-5 space-y-3 border border-border/60">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Accelerate Your Career
        </h4>

        <div className="space-y-2">
          <Link
            to="/interview/setup"
            className="flex items-center justify-between p-3 rounded-2xl border border-border/50 bg-secondary/20 hover:bg-secondary/40 hover:border-primary/40 transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <Mic className="h-3.5 w-3.5" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-foreground">Mock Interview Studio</p>
                <p className="text-[10px] text-muted-foreground">Practice milestone interview questions</p>
              </div>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </Link>

          <Link
            to="/resume"
            className="flex items-center justify-between p-3 rounded-2xl border border-border/50 bg-secondary/20 hover:bg-secondary/40 hover:border-primary/40 transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-accent/20 text-accent">
                <FileText className="h-3.5 w-3.5" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-foreground">Resume Studio</p>
                <p className="text-[10px] text-muted-foreground">Highlight completed projects on your CV</p>
              </div>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
          </Link>

          <Link
            to="/passport"
            className="flex items-center justify-between p-3 rounded-2xl border border-border/50 bg-secondary/20 hover:bg-secondary/40 hover:border-primary/40 transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                <Award className="h-3.5 w-3.5" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-foreground">Skill Passport</p>
                <p className="text-[10px] text-muted-foreground">Share verified skills with recruiters</p>
              </div>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>
      </div>
    </div>
  );
}
