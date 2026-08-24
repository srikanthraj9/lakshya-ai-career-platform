import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Circle,
  Clock,
  BookOpen,
  ExternalLink,
  Mic,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { RoadmapStep } from "@/types";

interface RoadmapMilestoneCardProps {
  step: RoadmapStep;
  index: number;
  isCompleted: boolean;
  onToggleComplete: (index: number) => void;
}

export function RoadmapMilestoneCard({
  step,
  index,
  isCompleted,
  onToggleComplete,
}: RoadmapMilestoneCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`glass-card rounded-3xl p-5 sm:p-6 transition-all duration-300 ${
        isCompleted
          ? "border-emerald-500/40 bg-emerald-500/5 opacity-90 shadow-sm"
          : "border-border/60 hover:border-primary/40 hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: Completion Checkbox & Milestone Content */}
        <div className="flex items-start gap-3.5 min-w-0">
          <button
            onClick={() => onToggleComplete(index)}
            className="mt-0.5 shrink-0 text-muted-foreground hover:text-emerald-400 transition-colors focus:outline-none"
            aria-label={isCompleted ? "Mark milestone incomplete" : "Mark milestone complete"}
          >
            {isCompleted ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-400 fill-emerald-400/20" />
            ) : (
              <Circle className="h-6 w-6 text-border hover:text-primary transition-colors" />
            )}
          </button>

          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                Milestone {index + 1 < 10 ? `0${index + 1}` : index + 1}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium bg-secondary/40 px-2 py-0.5 rounded-full border border-border/50">
                <Clock className="h-2.5 w-2.5" />
                {step.duration}
              </span>
              {isCompleted && (
                <StatusBadge variant="success" className="text-[10px] py-0 px-1.5">
                  Completed
                </StatusBadge>
              )}
            </div>

            <h3
              className={`font-display text-base font-bold transition-all ${
                isCompleted ? "line-through text-muted-foreground" : "text-foreground"
              }`}
            >
              {step.step}
            </h3>
          </div>
        </div>

        {/* Right: Interview Practice Shortcut */}
        <div className="shrink-0">
          <Link to={`/interview/setup`}>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-xl border-primary/30 text-primary hover:bg-primary/10 text-xs font-semibold"
            >
              <Mic className="h-3 w-3" />
              <span className="hidden sm:inline">Test in Interview</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Learning Resources */}
      {step.resources && step.resources.length > 0 && (
        <div className="pt-3 mt-3 border-t border-border/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-primary" /> Curated Learning Resources (
              {step.resources.length})
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {step.resources.map((res, i) => (
              <a
                key={i}
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-secondary/30 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-secondary/60 transition-all font-medium"
              >
                <span>{res.name}</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
