import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import { resumeService } from "@/services/resume";
import { calculateCareerReadiness } from "@/lib/careerMetrics";
import { getActiveTargetRole, setActiveTargetRole } from "@/lib/navigationStatus";
import { getUserStorage, setUserStorage, removeUserStorage } from "@/lib/userStorage";
import { queryKeys } from "@/lib/queryKeys";
import type { ResumeDetail, ResumeListItem } from "@/types";
import type { CareerReadinessBreakdown } from "@/types/career";

interface CareerContextType {
  targetRole: string;
  setTargetRole: (role: string) => void;
  activeResumeId: string | null;
  setActiveResumeId: (id: string) => void;
  activeResume: ResumeDetail | null;
  resumes: ResumeListItem[];
  readiness: CareerReadinessBreakdown;
  detectedSkills: string[];
  missingSkills: string[];
  addSkillToRoadmap: (skill: string) => void;
  refreshCareerData: () => void;
}

const CareerContext = createContext<CareerContextType | null>(null);

const RESUME_ID_KEY = "resumeId";

export function CareerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;

  const [targetRole, setTargetRoleState] = useState<string>(() => getActiveTargetRole(userId).title);
  const [activeResumeId, setActiveResumeIdState] = useState<string | null>(() => {
    return getUserStorage<string>(userId, RESUME_ID_KEY, null);
  });

  const setTargetRole = useCallback((newRole: string) => {
    setTargetRoleState(newRole);
    setActiveTargetRole(newRole, 82, userId);
  }, [userId]);

  const setActiveResumeId = useCallback((newId: string) => {
    setActiveResumeIdState(newId);
    setUserStorage(userId, RESUME_ID_KEY, newId);
  }, [userId]);

  // Fetch all user resumes — strictly scoped by userId and enabled only when authenticated
  const { data: resumes = [], refetch: refetchResumes } = useQuery<ResumeListItem[]>({
    queryKey: queryKeys.resumes.list(userId || ""),
    queryFn: resumeService.listResumes,
    enabled: Boolean(userId),
    retry: 2,
  });

  // Automatically select first resume if none selected or validate stored resume belongs to user
  useEffect(() => {
    if (!userId) {
      setActiveResumeIdState(null);
      return;
    }

    if (resumes.length === 0) {
      setActiveResumeIdState(null);
      removeUserStorage(userId, RESUME_ID_KEY);
      return;
    }

    if (activeResumeId && !resumes.some((r) => r.id === activeResumeId)) {
      // Stale active resume ID from previous state or another user — reset to first valid resume
      const firstValidId = resumes[0]?.id || null;
      setActiveResumeIdState(firstValidId);
      if (firstValidId) {
        setUserStorage(userId, RESUME_ID_KEY, firstValidId);
      } else {
        removeUserStorage(userId, RESUME_ID_KEY);
      }
    } else if (!activeResumeId && resumes.length > 0) {
      const firstId = resumes[0].id;
      setActiveResumeIdState(firstId);
      setUserStorage(userId, RESUME_ID_KEY, firstId);
    }
  }, [userId, activeResumeId, resumes]);

  // Fetch active resume details
  const { data: activeResume = null, refetch: refetchResumeDetail } = useQuery<ResumeDetail | null>({
    queryKey: queryKeys.resumes.detail(userId || "", activeResumeId || ""),
    queryFn: () => (activeResumeId ? resumeService.getResume(activeResumeId) : Promise.resolve(null)),
    enabled: Boolean(userId && activeResumeId),
    retry: 2,
  });

  // Calculate dynamic career readiness
  const readiness = useMemo(() => {
    const resumeAts = activeResume?.ats_score ?? 0;
    const skillsCount = activeResume?.skills?.length ?? 0;
    const roleScore = Math.min(100, Math.round((skillsCount / 12) * 100));

    let roadmapScore = 40;
    let interviewScore = 0;

    const interviewMeta = getUserStorage<{ overall_score?: number }>(userId, "interview-meta", null);
    if (typeof interviewMeta?.overall_score === "number") {
      interviewScore = interviewMeta.overall_score;
    }

    return calculateCareerReadiness({
      atsScore: resumeAts > 0 ? resumeAts : null,
      roleMatchScore: roleScore > 0 ? roleScore : null,
      interviewScore: interviewScore > 0 ? interviewScore : null,
      roadmapProgress: roadmapScore > 0 ? roadmapScore : null,
      jobMatchScore: 85,
    });
  }, [userId, activeResume]);

  const detectedSkills = useMemo(() => activeResume?.skills || [], [activeResume]);
  const missingSkills = useMemo(() => {
    if (activeResume?.feedback?.missing_skills && activeResume.feedback.missing_skills.length > 0) {
      return activeResume.feedback.missing_skills;
    }
    return ["Docker", "Redis", "Kubernetes", "CI/CD"];
  }, [activeResume]);

  const addSkillToRoadmap = useCallback((skill: string) => {
    if (!userId) return;
    const current = getUserStorage<string[]>(userId, "roadmap-custom-skills", []) || [];
    if (!current.includes(skill)) {
      current.push(skill);
      setUserStorage(userId, "roadmap-custom-skills", current);
    }
  }, [userId]);

  const refreshCareerData = useCallback(() => {
    refetchResumes();
    if (activeResumeId) {
      refetchResumeDetail();
    }
  }, [refetchResumes, refetchResumeDetail, activeResumeId]);

  const value = useMemo(
    () => ({
      targetRole,
      setTargetRole,
      activeResumeId,
      setActiveResumeId,
      activeResume,
      resumes,
      readiness,
      detectedSkills,
      missingSkills,
      addSkillToRoadmap,
      refreshCareerData,
    }),
    [
      targetRole,
      setTargetRole,
      activeResumeId,
      setActiveResumeId,
      activeResume,
      resumes,
      readiness,
      detectedSkills,
      missingSkills,
      addSkillToRoadmap,
      refreshCareerData,
    ]
  );

  return <CareerContext.Provider value={value}>{children}</CareerContext.Provider>;
}

export function useCareerContext(): CareerContextType {
  const context = useContext(CareerContext);
  if (!context) {
    throw new Error("useCareerContext must be used within a CareerProvider");
  }
  return context;
}
