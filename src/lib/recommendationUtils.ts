import type { CareerRecommendation, CriticalSkillGapItem } from "@/services/intelligenceService";

export function generateClientFallbackRecommendations(params: {
  targetRole: string;
  atsScore?: number | null;
  missingSkills?: string[];
  interviewScore?: number | null;
}): {
  recommendations: CareerRecommendation[];
  criticalGaps: CriticalSkillGapItem[];
} {
  const recommendations: CareerRecommendation[] = [];
  const missing = params.missingSkills && params.missingSkills.length > 0
    ? params.missingSkills
    : ["Docker", "Redis", "System Design"];

  // 1. Skill Gap
  const topSkill = missing[0];
  recommendations.push({
    id: `rec-skill-${topSkill.toLowerCase()}`,
    recommendation_type: "skill_gap",
    title: `Close ${topSkill} Skill Gap`,
    description: `${topSkill} is required by 4 high-match ${params.targetRole} positions.`,
    source_module: "role_alignment",
    target_module: "roadmap",
    priority: "critical",
    impact_score: 95.0,
    confidence_score: 90.0,
    urgency_score: 0.85,
    status: "active",
    action_url: `/roadmap?skill=${topSkill}`,
    action_label: "Add to Roadmap",
    reason: {
      signal: "role_alignment_gap",
      impact: 0.95,
      confidence: 0.9,
      urgency: 0.85,
      explanation: `${topSkill} is identified as an essential technology for ${params.targetRole}.`,
      factors: [
        `Required by target role '${params.targetRole}'`,
        "Found across multiple live job postings",
      ],
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // 2. Resume
  recommendations.push({
    id: "rec-ats-optimize",
    recommendation_type: "resume",
    title: "Optimize Bullet Points with STAR Metrics",
    description: "Quantify achievements to increase your ATS score past 90%.",
    source_module: "resume_studio",
    target_module: "resume_rewrite",
    priority: "high",
    impact_score: 88.0,
    confidence_score: 92.0,
    urgency_score: 0.75,
    status: "active",
    action_url: "/resume/rewrite",
    action_label: "Optimize Resume",
    reason: {
      signal: "ats_density",
      impact: 0.88,
      confidence: 0.92,
      urgency: 0.75,
      explanation: "STAR methodology elevates resume screening pass rates.",
      factors: ["Improves parsed metric density", "Pre-fills AI rewrite prompt"],
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // 3. Interview
  recommendations.push({
    id: "rec-interview-practice",
    recommendation_type: "interview",
    title: "Test System Architecture in Voice AI Mock",
    description: "5-minute technical simulation with real-time speech pace evaluation.",
    source_module: "interview_studio",
    target_module: "interview",
    priority: "medium",
    impact_score: 80.0,
    confidence_score: 85.0,
    urgency_score: 0.70,
    status: "active",
    action_url: "/interview/voice-ai",
    action_label: "Start Simulation",
    reason: {
      signal: "voice_readiness",
      impact: 0.8,
      confidence: 0.85,
      urgency: 0.7,
      explanation: "Voice simulation measures technical communication under pressure.",
      factors: ["Instant speech pace feedback", "Generates STAR evaluation scorecard"],
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const criticalGaps: CriticalSkillGapItem[] = missing.map((s, i) => ({
    skill: s,
    frequency_in_jobs: 6 - i,
    is_role_requirement: true,
    priority: i === 0 ? "critical" : i === 1 ? "high" : "medium",
    roadmap_status: i === 0 ? "planned" : "missing",
  }));

  return { recommendations, criticalGaps };
}
