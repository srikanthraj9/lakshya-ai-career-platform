import type { NextBestAction, SkillBenchmark } from "@/types/career";

/**
 * Generate intelligent next-best actions dynamically from user profile and metrics.
 */
export function generateNextBestActions(params: {
  atsScore?: number;
  missingSkills?: string[];
  interviewScore?: number;
  hasResume?: boolean;
  newJobsCount?: number;
  targetRoleTitle?: string;
}): NextBestAction[] {
  const actions: NextBestAction[] = [];
  const isUnconfigured =
    !params.targetRoleTitle || params.targetRoleTitle === "No Target Role Selected";
  const roleName = isUnconfigured ? "your target role" : params.targetRoleTitle!;

  // 0. Essential Setup Action if unconfigured
  if (isUnconfigured) {
    actions.push({
      id: "select_target_role",
      priority: "high",
      title: "Select your target career role",
      description:
        "Complete your career profile to unlock customized roadmaps, role alignments, and mock interviews.",
      impactTag: "Essential Setup",
      ctaText: "Complete Onboarding",
      ctaHref: "/onboarding",
      iconName: "Target",
    });
  }

  // 1. Resume / Skill Gap Action
  if (!params.hasResume) {
    actions.push({
      id: "upload_first_resume",
      priority: "high",
      title: "Upload your master resume",
      description: "Get instant ATS scoring, keyword diagnosis, and customized career roadmaps.",
      impactTag: "+40% Career Readiness",
      ctaText: "Upload Resume",
      ctaHref: "/resume/upload",
      iconName: "FileText",
    });
  } else if (params.missingSkills && params.missingSkills.length > 0) {
    const topMissing = params.missingSkills.slice(0, 2).join(" & ");
    actions.push({
      id: "fix_missing_skills",
      priority: "high",
      title: `Add ${topMissing} to your Resume`,
      description: `Closing these key skill gaps will boost your alignment for ${roleName}.`,
      impactTag: "+8% Match Boost",
      ctaText: "Polish with AI",
      ctaHref: "/resume/rewrite",
      iconName: "Wand2",
    });
  } else if ((params.atsScore ?? 0) < 80) {
    actions.push({
      id: "optimize_resume",
      priority: "high",
      title: "Improve Resume Keyword Density",
      description: "Your ATS score can be improved with industry-standard action verbs and quantified impact.",
      impactTag: "+15% ATS Score",
      ctaText: "Optimize Resume",
      ctaHref: "/resume/rewrite",
      iconName: "Wand2",
    });
  }

  // 2. Practice & Mock Interview Action
  if (!params.interviewScore || params.interviewScore === 0) {
    actions.push({
      id: "first_mock_interview",
      priority: "medium",
      title: isUnconfigured
        ? "Practice a 5-minute Mock Interview"
        : `Take a 5-minute Mock Interview for ${roleName}`,
      description: "Practice answering behavioral and technical questions with real-time AI speech feedback.",
      impactTag: "Measure Readiness",
      ctaText: "Start Voice Interview",
      ctaHref: "/interview/voice-ai",
      iconName: "MessageSquare",
    });
  } else if (params.interviewScore < 75) {
    actions.push({
      id: "practice_system_design",
      priority: "medium",
      title: "Practice Technical Deep-Dive Interview",
      description: `Your last score was ${params.interviewScore}%. Practice STAR methodology to break 85%.`,
      impactTag: "+18% Confidence",
      ctaText: "Practice Now",
      ctaHref: "/interview/setup",
      iconName: "MessageSquare",
    });
  }

  // 3. Job Match or Roadmap Action
  if ((params.newJobsCount ?? 0) > 0) {
    actions.push({
      id: "review_new_jobs",
      priority: "opportunity",
      title: `${params.newJobsCount} open positions available`,
      description: `Explore opportunities matched to your profile and experience level.`,
      impactTag: "Top Opportunities",
      ctaText: "View Matches",
      ctaHref: "/jobs",
      iconName: "Briefcase",
    });
  } else {
    actions.push({
      id: "explore_roadmaps",
      priority: "opportunity",
      title: isUnconfigured
        ? "Explore interactive career roadmaps"
        : `Explore ${roleName} skill roadmap`,
      description: isUnconfigured
        ? "Discover skills, milestones, and industry expectations across major tech disciplines."
        : `Follow your learning milestones and track your journey toward ${roleName}.`,
      impactTag: "Learning Path",
      ctaText: "View Roadmap",
      ctaHref: "/roadmap",
      iconName: "Map",
    });
  }

  return actions;
}
