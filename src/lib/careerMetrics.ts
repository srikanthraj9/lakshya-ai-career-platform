import type { CareerReadinessBreakdown } from "@/types/career";

interface RawCareerInputs {
  atsScore?: number | null;
  roleMatchScore?: number | null;
  interviewScore?: number | null;
  roadmapProgress?: number | null;
  jobMatchScore?: number | null;
}

/**
 * Calculates a dynamic, weighted Career Readiness score based on available data.
 * Gracefully re-weights available metrics if certain areas (like mock interviews) are not yet completed.
 */
export function calculateCareerReadiness(inputs: RawCareerInputs): CareerReadinessBreakdown {
  const weights = {
    resumeHealth: 0.30,
    roleMatch: 0.30,
    interviewReadiness: 0.20,
    roadmapProgress: 0.10,
    marketOpportunity: 0.10,
  };

  const resume = typeof inputs.atsScore === "number" && inputs.atsScore > 0 ? inputs.atsScore : null;
  const role = typeof inputs.roleMatchScore === "number" && inputs.roleMatchScore > 0 ? inputs.roleMatchScore : null;
  const interview = typeof inputs.interviewScore === "number" && inputs.interviewScore > 0 ? inputs.interviewScore : null;
  const roadmap = typeof inputs.roadmapProgress === "number" && inputs.roadmapProgress > 0 ? inputs.roadmapProgress : null;
  const jobs = typeof inputs.jobMatchScore === "number" && inputs.jobMatchScore > 0 ? inputs.jobMatchScore : null;

  let totalWeight = 0;
  let weightedSum = 0;

  if (resume !== null) {
    weightedSum += resume * weights.resumeHealth;
    totalWeight += weights.resumeHealth;
  }
  if (role !== null) {
    weightedSum += role * weights.roleMatch;
    totalWeight += weights.roleMatch;
  }
  if (interview !== null) {
    weightedSum += interview * weights.interviewReadiness;
    totalWeight += weights.interviewReadiness;
  }
  if (roadmap !== null) {
    weightedSum += roadmap * weights.roadmapProgress;
    totalWeight += weights.roadmapProgress;
  }
  if (jobs !== null) {
    weightedSum += jobs * weights.marketOpportunity;
    totalWeight += weights.marketOpportunity;
  }

  // If no data points exist yet, default to baseline
  if (totalWeight === 0) {
    return {
      overallScore: 0,
      resumeHealth: null,
      roleMatch: null,
      interviewReadiness: null,
      roadmapProgress: null,
      marketOpportunity: null,
      statusLabel: "Not Measured Yet",
      isMeasured: false,
    };
  }

  // Normalize by active weights
  const normalizedScore = Math.round(weightedSum / totalWeight);

  let statusLabel = "Getting Started";
  if (normalizedScore >= 90) statusLabel = "Interview Ready & Competitive";
  else if (normalizedScore >= 75) statusLabel = "Strong Candidate";
  else if (normalizedScore >= 50) statusLabel = "Making Good Progress";
  else if (normalizedScore >= 30) statusLabel = "Foundation Building";

  return {
    overallScore: normalizedScore,
    resumeHealth: resume,
    roleMatch: role,
    interviewReadiness: interview,
    roadmapProgress: roadmap,
    marketOpportunity: jobs,
    statusLabel,
    isMeasured: true,
  };
}

/**
 * Format raw date strings into clean human-readable date labels (e.g. "Aug 21")
 */
export function formatChartDate(rawDate?: string): string {
  if (!rawDate) return "";
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return rawDate;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return rawDate;
  }
}
