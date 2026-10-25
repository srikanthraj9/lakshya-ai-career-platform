import { describe, it, expect, vi } from "vitest";
import { calculateCareerReadiness } from "@/lib/careerMetrics";
import { analyticsService } from "@/services/analytics";
import api from "@/services/api";

describe("Dashboard Remediation & Integrity Tests", () => {
  it("calculates readiness score strictly from measured inputs without synthetic defaults", () => {
    // When only resume ATS is available, role match and interview must remain null
    const result = calculateCareerReadiness({
      atsScore: 94,
      roleMatchScore: null,
      interviewScore: null,
    });

    expect(result.isMeasured).toBe(true);
    expect(result.resumeHealth).toBe(94);
    expect(result.roleMatch).toBeNull();
    expect(result.interviewReadiness).toBeNull();
    expect(result.marketOpportunity).toBeNull();
    // Normalized solely on available weight (resumeHealth 0.30)
    expect(result.overallScore).toBe(94);
  });

  it("handles null/missing inputs cleanly and produces unmeasured state", () => {
    const result = calculateCareerReadiness({
      atsScore: null,
      roleMatchScore: null,
      interviewScore: null,
      roadmapProgress: null,
      jobMatchScore: null,
    });

    expect(result.isMeasured).toBe(false);
    expect(result.overallScore).toBe(0);
    expect(result.statusLabel).toBe("Not Measured Yet");
  });

  it("analyticsService.getCareerProgress queries /analytics/career-progress endpoint", async () => {
    const getSpy = vi.spyOn(api, "get").mockResolvedValueOnce({
      data: [
        { week: "W1", score: 85 },
        { week: "W2", score: 92 },
      ],
    });

    const progress = await analyticsService.getCareerProgress();

    expect(getSpy).toHaveBeenCalledWith("/analytics/career-progress");
    expect(progress).toHaveLength(2);
    expect(progress[1].score).toBe(92);
  });

  it("analyticsService.getSummary supports role_match_score", async () => {
    vi.spyOn(api, "get").mockResolvedValueOnce({
      data: {
        ats_score: 94,
        total_resumes: 1,
        skill_count: 29,
        interview_score: 0,
        role_match_score: 67,
      },
    });

    const summary = await analyticsService.getSummary();

    expect(summary.ats_score).toBe(94);
    expect(summary.role_match_score).toBe(67);
  });
});
