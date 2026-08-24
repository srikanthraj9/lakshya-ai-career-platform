export interface CareerReadinessBreakdown {
  overallScore: number;
  resumeHealth: number | null;
  roleMatch: number | null;
  interviewReadiness: number | null;
  roadmapProgress: number | null;
  marketOpportunity: number | null;
  statusLabel: string;
  isMeasured: boolean;
}

export interface NextBestAction {
  id: string;
  priority: "high" | "medium" | "opportunity";
  title: string;
  description: string;
  impactTag: string;
  ctaText: string;
  ctaHref: string;
  iconName: "FileText" | "Target" | "MessageSquare" | "Briefcase" | "Map" | "Wand2";
}

export interface SkillBenchmark {
  skill: string;
  userScore: number; // 0 to 100
  targetBenchmark: number; // 0 to 100
  status: "strong" | "needs_work" | "missing";
}

export interface NavigationStatus {
  activeResumeCount: number;
  activeRoadmapCount: number;
  newJobsCount: number;
  targetRoleTitle: string;
  targetRoleReadiness: number;
}
