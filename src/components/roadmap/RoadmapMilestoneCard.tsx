import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Clock,
  BookOpen,
  ExternalLink,
  Mic,
  ChevronDown,
  ChevronUp,
  Target,
  Code2,
  ListChecks,
  Sparkles,
  Info,
  CheckSquare,
  Square,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { RoadmapStep, RoadmapResource } from "@/types";

interface RoadmapMilestoneCardProps {
  step: RoadmapStep;
  index: number;
  isCompleted: boolean;
  onToggleComplete: (index: number) => void;
  isExpanded?: boolean;
  onToggleExpand?: (index: number) => void;
  completedTasks?: string[];
  onToggleTask?: (taskId: string) => void;
  onAddSkill?: (skill: string) => void;
}

export function RoadmapMilestoneCard({
  step,
  index,
  isCompleted,
  onToggleComplete,
  isExpanded: controlledExpanded,
  onToggleExpand,
  completedTasks = [],
  onToggleTask,
}: RoadmapMilestoneCardProps) {
  const [localExpanded, setLocalExpanded] = useState(index === 0);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : localExpanded;

  const handleToggleExpand = () => {
    if (onToggleExpand) {
      onToggleExpand(index);
    } else {
      setLocalExpanded(!localExpanded);
    }
  };

  // Normalize resources
  const resources: RoadmapResource[] = (step.resources || []).map((res) => {
    if (typeof res === "string") {
      let displayName = "Documentation & Tutorial";
      try {
        const parsed = new URL(res);
        displayName = `${parsed.hostname.replace("www.", "")} Guide`;
      } catch {
        displayName = "Learning Resource";
      }
      return { name: displayName, url: res };
    }
    return res;
  });

  const skills = step.skills || [];
  const checklist = step.checklist || [];
  const completedChecklistCount = checklist.filter((_, taskIdx) =>
    completedTasks.includes(`m-${index}-t-${taskIdx}`)
  ).length;

  return (
    <div
      className={`glass-card rounded-3xl transition-all duration-300 border ${
        isCompleted
          ? "border-emerald-500/40 bg-emerald-500/5 shadow-sm"
          : "border-border/60 hover:border-primary/40 hover:shadow-md"
      }`}
    >
      {/* Top Milestone Banner */}
      <div className="p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          {/* Completion Checkbox & Milestone Content */}
          <div className="flex items-start gap-3.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onToggleComplete(index)}
              className="mt-1 shrink-0 text-muted-foreground hover:text-emerald-400 transition-colors focus:outline-none rounded-full"
              aria-label={isCompleted ? "Mark milestone incomplete" : "Mark milestone complete"}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-400 fill-emerald-400/20" />
              ) : (
                <Circle className="h-6 w-6 text-border hover:text-primary transition-colors" />
              )}
            </button>

            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                  Milestone {index + 1 < 10 ? `0${index + 1}` : index + 1}
                </span>

                {step.stage && (
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    • {step.stage}
                  </span>
                )}

                <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium bg-secondary/40 px-2.5 py-0.5 rounded-full border border-border/50">
                  <Clock className="h-3 w-3 text-primary/70" />
                  {step.duration || "2 weeks"}
                </span>

                {isCompleted && (
                  <StatusBadge variant="success" className="text-[10px] py-0 px-2">
                    Completed
                  </StatusBadge>
                )}
              </div>

              <h3
                className={`font-display text-base sm:text-lg font-bold transition-all cursor-pointer ${
                  isCompleted ? "line-through text-muted-foreground" : "text-foreground"
                }`}
                onClick={handleToggleExpand}
              >
                {step.title || step.step}
              </h3>

              {step.title && step.title !== step.step && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {step.step}
                </p>
              )}
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 self-start">
            <Link to={`/interview/setup`}>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-xl border-primary/30 text-primary hover:bg-primary/10 text-xs font-semibold hidden sm:flex"
              >
                <Mic className="h-3 w-3" />
                <span>Test in Interview</span>
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleExpand}
              className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              aria-label={isExpanded ? "Collapse milestone details" : "Expand milestone details"}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Quick Highlights Row (always visible) */}
        {skills.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mr-1">
              Skills:
            </span>
            {skills.map((skill, i) => (
              <span
                key={i}
                className="text-[11px] font-medium bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Collapsible Milestone Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-border/50 bg-secondary/10 p-5 sm:p-6 space-y-5"
          >
            {/* Why It Matters */}
            {step.why_it_matters && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                  <Target className="h-3.5 w-3.5" />
                  <span>Why This Milestone Matters for Your Target Role</span>
                </div>
                <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                  {step.why_it_matters}
                </p>
              </div>
            )}

            {/* Beginner-Friendly Explanation */}
            {step.beginner_friendly_explanation && (
              <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <Info className="h-3.5 w-3.5 text-accent" />
                  <span>Core Concept Explained Simply</span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {step.beginner_friendly_explanation}
                </p>
              </div>
            )}

            {/* Prerequisites */}
            {step.prerequisites && step.prerequisites.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-amber-400" /> Foundations & Prerequisites
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {step.prerequisites.map((req, i) => (
                    <span
                      key={i}
                      className="text-xs bg-secondary/40 text-muted-foreground border border-border/50 px-2.5 py-1 rounded-lg font-medium"
                    >
                      {req}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Practical Project Exercise */}
            {step.practical_project && (
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                    <Code2 className="h-4 w-4" /> Hands-On Portfolio Mini-Project
                  </span>
                  <span className="text-[10px] font-semibold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/30">
                    Production Practice
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                  {step.practical_project}
                </p>
              </div>
            )}

            {/* Interactive Completion Checklist */}
            {checklist.length > 0 && (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <ListChecks className="h-3.5 w-3.5 text-primary" /> Actionable Completion Checklist
                  </span>
                  <span className="text-[11px] font-semibold text-primary">
                    {completedChecklistCount} of {checklist.length} Tasks Done
                  </span>
                </div>

                <div className="space-y-1.5">
                  {checklist.map((task, taskIdx) => {
                    const taskId = `m-${index}-t-${taskIdx}`;
                    const isTaskDone = completedTasks.includes(taskId);

                    return (
                      <button
                        key={taskIdx}
                        type="button"
                        onClick={() => onToggleTask && onToggleTask(taskId)}
                        className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl border text-left text-xs transition-all ${
                          isTaskDone
                            ? "bg-emerald-500/10 border-emerald-500/30 text-muted-foreground line-through"
                            : "bg-secondary/20 border-border/50 text-foreground hover:bg-secondary/40 hover:border-primary/30"
                        }`}
                      >
                        {isTaskDone ? (
                          <CheckSquare className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        )}
                        <span className="flex-1 leading-relaxed">{task}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Curated Learning Resources */}
            {resources.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/40">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-primary" /> Curated High-Impact Learning Resources ({resources.length})
                </span>

                <div className="flex flex-wrap gap-2">
                  {resources.map((res, i) => (
                    <a
                      key={i}
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/30 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-secondary/60 transition-all font-medium group"
                    >
                      <span>{res.name}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Mobile Test Interview Link */}
            <div className="sm:hidden pt-2">
              <Link to={`/interview/setup`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-9 gap-1.5 rounded-xl border-primary/30 text-primary hover:bg-primary/10 text-xs font-semibold"
                >
                  <Mic className="h-3.5 w-3.5" />
                  <span>Practice Milestone in Mock Interview Studio</span>
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
