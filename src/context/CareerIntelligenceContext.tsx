import React, { createContext, useContext, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import { useCareerContext } from "@/hooks/useCareerContext";
import { intelligenceService } from "@/services/intelligenceService";
import { generateClientFallbackRecommendations } from "@/lib/recommendationUtils";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";
import type {
  CareerIntelligenceData,
  CareerRecommendation,
  CareerGoal,
  AutomationRule,
} from "@/types";

interface CareerIntelligenceContextType {
  intelligence: CareerIntelligenceData;
  topPriority: CareerRecommendation | null;
  recommendations: CareerRecommendation[];
  criticalGaps: string[];
  activeGoal: CareerGoal | null;
  automationRules: AutomationRule[];
  refreshIntelligence: () => Promise<void>;
  completeRecommendation: (id: string) => Promise<void>;
  dismissRecommendation: (id: string) => Promise<void>;
  saveGoal: (payload: Partial<CareerGoal>) => Promise<void>;
  toggleAutomationRule: (id: string) => Promise<void>;
  isLoading: boolean;
  isError: boolean;
}

const CareerIntelligenceContext = createContext<CareerIntelligenceContextType | null>(null);

export function CareerIntelligenceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const { targetRole, activeResume, readiness } = useCareerContext();
  const queryClient = useQueryClient();

  // 1. Fetch live AI Intelligence Overview
  const {
    data: rawIntelligence,
    isLoading: isIntelLoading,
    isError: isIntelError,
    refetch: refetchIntel,
  } = useQuery({
    queryKey: queryKeys.intelligence.overview(userId || ""),
    queryFn: intelligenceService.getIntelligence,
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
  });

  // 2. Fetch Goals
  const {
    data: goals = [],
    isLoading: isGoalsLoading,
  } = useQuery({
    queryKey: queryKeys.intelligence.goals(userId || ""),
    queryFn: intelligenceService.getGoals,
    enabled: Boolean(userId),
  });

  // 3. Fetch Automation Rules
  const {
    data: automationRules = [],
    isLoading: isRulesLoading,
  } = useQuery({
    queryKey: queryKeys.intelligence.automationRules(userId || ""),
    queryFn: intelligenceService.getAutomationRules,
    enabled: Boolean(userId),
  });

  // Mutations
  const completeMutation = useMutation({
    mutationFn: (id: string) => intelligenceService.completeRecommendation(id),
    onSuccess: () => {
      toast.success("Action marked as completed!");
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.intelligence.overview(userId) });
      }
    },
    onError: () => {
      toast.error("Failed to update action status.");
    },
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => intelligenceService.dismissRecommendation(id),
    onSuccess: () => {
      toast.info("Recommendation dismissed.");
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.intelligence.overview(userId) });
      }
    },
  });

  const saveGoalMutation = useMutation({
    mutationFn: (payload: Partial<CareerGoal>) => intelligenceService.saveGoal(payload),
    onSuccess: () => {
      toast.success("Career target updated successfully!");
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.intelligence.goals(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.intelligence.overview(userId) });
      }
    },
    onError: () => {
      toast.error("Failed to save career target.");
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: (id: string) => intelligenceService.toggleAutomationRule(id),
    onSuccess: () => {
      toast.success("Automation rule updated.");
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.intelligence.automationRules(userId) });
      }
    },
  });

  // Fallback generation for candidate's explicit target role
  const fallback = useMemo(() => {
    return generateClientFallbackRecommendations({
      targetRole: targetRole || "Exploring Tech Roles",
      atsScore: activeResume?.ats_score ?? 0,
      missingSkills: activeResume?.feedback?.missing_skills || [],
      interviewScore: 0,
    });
  }, [targetRole, activeResume]);

  const intelligence: CareerIntelligenceData = useMemo(() => {
    if (rawIntelligence) return rawIntelligence;

    return {
      readiness_score: readiness.overallScore || 0,
      career_momentum: {
        score: readiness.overallScore || 0,
        trend: "improving",
        delta_text: "System initialized",
        signals: {
          resume: { score: activeResume?.ats_score ?? 0, status: activeResume ? "Analyzed" : "Pending" },
          role_match: { score: readiness.roleMatch ?? 0, status: "Evaluated" },
          interview: { score: readiness.interviewReadiness ?? 0, status: "Ready" },
          roadmap: { score: readiness.roadmapProgress ?? 0, status: "Active" },
        },
      },
      active_goal: goals.find((g) => g.is_active) || {
        id: "default-goal",
        target_role: targetRole || "Exploring Tech Roles",
        target_readiness_score: 85,
        priority: "high",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      top_priority: fallback.recommendations[0] || null,
      recommendations: fallback.recommendations,
      critical_gaps: fallback.criticalGaps,
      strengths: activeResume?.skills || [],
      automation_rules: automationRules,
    };
  }, [rawIntelligence, readiness, activeResume, goals, targetRole, fallback, automationRules]);

  const refreshIntelligence = useCallback(async () => {
    await refetchIntel();
    toast.success("Career intelligence signals refreshed.");
  }, [refetchIntel]);

  const completeRecommendation = useCallback(
    async (id: string) => {
      await completeMutation.mutateAsync(id);
    },
    [completeMutation]
  );

  const dismissRecommendation = useCallback(
    async (id: string) => {
      await dismissMutation.mutateAsync(id);
    },
    [dismissMutation]
  );

  const saveGoal = useCallback(
    async (payload: Partial<CareerGoal>) => {
      await saveGoalMutation.mutateAsync(payload);
    },
    [saveGoalMutation]
  );

  const toggleAutomationRule = useCallback(
    async (id: string) => {
      await toggleRuleMutation.mutateAsync(id);
    },
    [toggleRuleMutation]
  );

  const value = useMemo(
    () => ({
      intelligence,
      topPriority: intelligence.top_priority,
      recommendations: intelligence.recommendations,
      criticalGaps: intelligence.critical_gaps,
      activeGoal: intelligence.active_goal,
      automationRules,
      refreshIntelligence,
      completeRecommendation,
      dismissRecommendation,
      saveGoal,
      toggleAutomationRule,
      isLoading: isIntelLoading || isGoalsLoading || isRulesLoading,
      isError: isIntelError,
    }),
    [
      intelligence,
      automationRules,
      refreshIntelligence,
      completeRecommendation,
      dismissRecommendation,
      saveGoal,
      toggleAutomationRule,
      isIntelLoading,
      isGoalsLoading,
      isRulesLoading,
      isIntelError,
    ]
  );

  return (
    <CareerIntelligenceContext.Provider value={value}>
      {children}
    </CareerIntelligenceContext.Provider>
  );
}

export function useCareerIntelligenceContext() {
  const context = useContext(CareerIntelligenceContext);
  if (!context) {
    throw new Error("useCareerIntelligenceContext must be used within a CareerIntelligenceProvider");
  }
  return context;
}

export const useCareerIntelligence = useCareerIntelligenceContext;
