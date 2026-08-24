import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { analyticsService } from "@/services/analytics";
import { resumeService } from "@/services/resume";
import { onboardingService } from "@/services/onboarding";
import { calculateCareerReadiness } from "@/lib/careerMetrics";
import { getActiveTargetRole } from "@/lib/navigationStatus";
import { queryKeys } from "@/lib/queryKeys";
import type { CareerReadinessBreakdown } from "@/types/career";

export function useCareerReadiness(): {
  breakdown: CareerReadinessBreakdown;
  targetRole: { title: string; readiness: number };
  isLoading: boolean;
} {
  const { user } = useAuth();
  const userId = user?.id;

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: queryKeys.profile.current(userId || ""),
    queryFn: onboardingService.getProfile,
    enabled: Boolean(userId),
    retry: 1,
  });

  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: queryKeys.analytics.summary(userId || ""),
    queryFn: analyticsService.getSummary,
    enabled: Boolean(userId),
    retry: 2,
  });

  const { data: resumes, isLoading: isResumesLoading } = useQuery({
    queryKey: queryKeys.resumes.list(userId || ""),
    queryFn: resumeService.listResumes,
    enabled: Boolean(userId),
    retry: 2,
  });

  const targetRoleTitle =
    profile?.target_role ||
    (userId ? getActiveTargetRole(userId).title : "") ||
    "No Target Role Selected";

  const breakdown = useMemo(() => {
    const rawAts = summary?.ats_score ?? (resumes?.[0]?.ats_score ?? null);
    const rawInterview = summary?.interview_score ?? null;
    const skillsCount = profile?.skills?.length || resumes?.[0]?.skills?.length || 0;
    const rawRole = skillsCount > 0 ? Math.min(45 + skillsCount * 8, 95) : null;
    const rawRoadmap = null;
    const rawJob = null;

    return calculateCareerReadiness({
      atsScore: rawAts && rawAts > 0 ? rawAts : null,
      roleMatchScore: rawRole,
      interviewScore: rawInterview && rawInterview > 0 ? rawInterview : null,
      roadmapProgress: rawRoadmap,
      jobMatchScore: rawJob,
    });
  }, [summary, resumes, profile]);

  const targetRole = useMemo(() => {
    return {
      title: targetRoleTitle,
      readiness: breakdown.overallScore,
    };
  }, [targetRoleTitle, breakdown.overallScore]);

  return {
    breakdown,
    targetRole,
    isLoading: isProfileLoading || isSummaryLoading || isResumesLoading,
  };
}
