import React from "react";
import { Sparkles, RefreshCw, Layers, Target, TrendingUp, Zap } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { NextBestActionCard } from "@/components/intelligence/NextBestActionCard";
import { CriticalSkillGaps } from "@/components/intelligence/CriticalSkillGaps";
import { CareerGoalCard } from "@/components/intelligence/CareerGoalCard";
import { CareerMomentumCard } from "@/components/intelligence/CareerMomentumCard";
import { CareerRecommendations } from "@/components/intelligence/CareerRecommendations";
import { AutomationRules } from "@/components/intelligence/AutomationRules";
import { useCareerIntelligence } from "@/hooks/useCareerIntelligence";
import { useCareerContext } from "@/hooks/useCareerContext";

export default function CareerIntelligencePage() {
  const {
    intelligence,
    topPriority,
    recommendations,
    activeGoal,
    automationRules,
    refreshIntelligence,
    completeRecommendation,
    dismissRecommendation,
    saveGoal,
    toggleAutomationRule,
    isLoading,
  } = useCareerIntelligence();

  const { readiness, targetRole } = useCareerContext();

  return (
    <PageTransition>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Workspace Banner */}
        <div className="glass-card gradient-border relative overflow-hidden rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <StatusBadge variant="ai" dot>
                Autonomous Career Engine
              </StatusBadge>
              <span className="text-xs text-muted-foreground">
                • Target: {activeGoal?.target_role || targetRole || "Exploring Tech Roles"}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshIntelligence()}
              className="rounded-xl text-xs gap-1.5 border-border/60 hover:bg-secondary"
            >
              <RefreshCw className="h-3.5 w-3.5 text-primary" />
              <span>Refresh Strategy</span>
            </Button>
          </div>

          <div className="space-y-1">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Career Intelligence Strategy & Execution
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl">
              Cross-module orchestration analyzing your verified skills, ATS diagnostics, interview performance, and job market demand to prescribe your highest-leverage career moves.
            </p>
          </div>
        </div>

        {/* 1. Dominant Next Best Action Hero Card */}
        {topPriority && (
          <NextBestActionCard
            action={topPriority}
            onComplete={completeRecommendation}
          />
        )}

        {/* 2. Critical Skill Gaps & Goal Tracking */}
        <div className="grid gap-6 lg:grid-cols-2">
          <CriticalSkillGaps gaps={intelligence?.critical_gaps || []} />
          <div className="space-y-6">
            <CareerGoalCard
              goal={activeGoal}
              currentReadiness={readiness.overallScore || 82}
              onSaveGoal={saveGoal}
            />
            <CareerMomentumCard
              momentum={
                intelligence?.career_momentum || {
                  score: 82,
                  trend: "improving",
                  delta_text: "+12% this month",
                  signals: {},
                }
              }
            />
          </div>
        </div>

        {/* 3. Ranked Career Recommendations */}
        <CareerRecommendations
          recommendations={recommendations}
          onComplete={completeRecommendation}
          onDismiss={dismissRecommendation}
        />

        {/* 4. Event-Driven Automation Rules */}
        <AutomationRules
          rules={automationRules}
          onToggleRule={toggleAutomationRule}
        />
      </div>
    </PageTransition>
  );
}
