import React from "react";
import { Sparkles, ArrowRight, Wand2, Brain, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { ResumeDetailFeedback } from "@/types";

interface ResumeRecommendationsProps {
  feedback?: ResumeDetailFeedback | null;
  missingSkills?: string[];
  onFixWithAI: () => void;
  onViewSkills: () => void;
}

export function ResumeRecommendations({
  feedback,
  missingSkills = ["Docker", "Redis"],
  onFixWithAI,
  onViewSkills,
}: ResumeRecommendationsProps) {
  const weakPoints = Array.isArray(feedback?.weak_points) ? feedback.weak_points : [];
  const safeMissing = Array.isArray(missingSkills) ? missingSkills : [];
  const feedbackMissing = Array.isArray(feedback?.missing_skills) ? feedback.missing_skills : [];
  const missing = safeMissing.length > 0 ? safeMissing : feedbackMissing;

  return (
    <div className="glass-card rounded-3xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">AI Resume Recommendations</h3>
            <p className="text-xs text-muted-foreground">Tailored high-impact adjustments to increase interview callbacks</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* 1. High Impact Action */}
        <div className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-4 space-y-2.5 transition-all hover:border-rose-500/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <StatusBadge variant="destructive" className="text-[10px]">
                High Impact
              </StatusBadge>
            </div>
            <span className="text-xs font-semibold text-rose-400">+6 to +8 ATS Points</span>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-foreground">
              {weakPoints[0] || "Add quantified achievements & metrics"}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Strengthen experience bullets by transforming responsibilities into quantified business outcomes (e.g. latency reduction, scale, users).
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              size="sm"
              onClick={onFixWithAI}
              className="h-8 gap-1.5 rounded-xl bg-gradient-to-r from-primary to-accent text-xs font-semibold text-white shadow hover:scale-[1.02] transition-all"
            >
              <Wand2 className="h-3.5 w-3.5" />
              <span>Fix with AI Rewriter</span>
            </Button>
          </div>
        </div>

        {/* 2. Keyword Coverage */}
        {missing.length > 0 && (
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 space-y-2.5 transition-all hover:border-amber-500/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <StatusBadge variant="warning" className="text-[10px]">
                  Keyword Opportunity
                </StatusBadge>
              </div>
              <span className="text-xs font-semibold text-amber-400">Target Role Match</span>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-foreground">
                Missing industry keywords: {missing.slice(0, 3).join(", ")}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Adding these keywords to your projects or skills list will elevate your profile for automated recruiter screenings.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={onViewSkills}
                className="h-8 gap-1.5 rounded-xl border-amber-500/30 text-xs font-semibold text-amber-300 hover:bg-amber-500/10"
              >
                <Brain className="h-3.5 w-3.5" />
                <span>Analyze Skill Gaps</span>
              </Button>
            </div>
          </div>
        )}

        {/* 3. Strengths Highlight */}
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-3.5 flex items-start gap-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-foreground">Strong Technical Foundation</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Your core technical stack shows high density and well-formed section hierarchies that pass modern ATS parsers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
