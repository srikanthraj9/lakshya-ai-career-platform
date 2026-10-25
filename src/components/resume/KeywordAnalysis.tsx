import React from "react";
import { Link } from "react-router-dom";
import { Check, Plus, AlertCircle, ArrowRight, Brain, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface KeywordAnalysisProps {
  skills: string[];
  missingSkills?: string[];
  onOptimize?: () => void;
}

export function KeywordAnalysis({
  skills: rawSkills,
  missingSkills: rawMissingSkills = ["Docker", "Redis", "Kubernetes", "CI/CD"],
  onOptimize,
}: KeywordAnalysisProps) {
  const skills = Array.isArray(rawSkills) ? rawSkills : [];
  const missingSkills = Array.isArray(rawMissingSkills) ? rawMissingSkills : [];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-display text-sm font-semibold text-foreground">Keyword Intelligence & Frequency</h4>
          <p className="text-xs text-muted-foreground">Extracted technology keywords verified against modern job descriptions</p>
        </div>
      </div>

      {/* Matched Keywords */}
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <Check className="h-4 w-4" />
            <span>Matched Keywords ({skills.length} Detected)</span>
          </div>
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Strong Presence</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300"
            >
              <Check className="h-3 w-3 text-emerald-400" />
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Missing Keyword Opportunities */}
      {missingSkills.length > 0 && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
              <AlertCircle className="h-4 w-4" />
              <span>Missing High-Demand Keywords</span>
            </div>
            <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider">Growth Opportunities</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {missingSkills.map((missing) => (
              <span
                key={missing}
                className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300"
              >
                <Plus className="h-3 w-3 text-amber-400" />
                {missing}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
            <span className="text-muted-foreground">Add to roadmap or incorporate into project descriptions:</span>
            <div className="flex items-center gap-2">
              <Link to="/roadmap">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-amber-500/30 text-amber-300 hover:bg-amber-500/10">
                  <Brain className="h-3 w-3" />
                  <span>Add to Roadmap</span>
                </Button>
              </Link>

              {onOptimize && (
                <Button size="sm" variant="gradient" onClick={onOptimize} className="h-7 text-xs gap-1 text-white">
                  <Sparkles className="h-3 w-3" />
                  <span>AI Optimize</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
