import { describe, it, expect } from "vitest";
import { calculateCareerReadiness, formatChartDate } from "@/lib/careerMetrics";

describe("calculateCareerReadiness", () => {
  it("returns unmeasured baseline when all inputs are empty or null", () => {
    const result = calculateCareerReadiness({});
    expect(result.overallScore).toBe(0);
    expect(result.statusLabel).toBe("Not Measured Yet");
    expect(result.isMeasured).toBe(false);
  });

  it("dynamically re-weights score when only resume ATS and role match are available", () => {
    const result = calculateCareerReadiness({
      atsScore: 90,
      roleMatchScore: 80,
    });
    // Weights: resumeHealth=0.30, roleMatch=0.30 => Total=0.60
    // Weighted Sum = (90*0.30 + 80*0.30) = 27 + 24 = 51
    // Normalized = 51 / 0.60 = 85
    expect(result.overallScore).toBe(85);
    expect(result.statusLabel).toBe("Strong Candidate");
    expect(result.isMeasured).toBe(true);
    expect(result.resumeHealth).toBe(90);
    expect(result.roleMatch).toBe(80);
    expect(result.interviewReadiness).toBeNull();
  });

  it("calculates comprehensive readiness score across all 5 dimensions", () => {
    const result = calculateCareerReadiness({
      atsScore: 95,
      roleMatchScore: 90,
      interviewScore: 85,
      roadmapProgress: 80,
      jobMatchScore: 90,
    });
    // 95*0.30 + 90*0.30 + 85*0.20 + 80*0.10 + 90*0.10
    // = 28.5 + 27.0 + 17.0 + 8.0 + 9.0 = 89.5 => 90
    expect(result.overallScore).toBe(90);
    expect(result.statusLabel).toBe("Interview Ready & Competitive");
  });

  it("handles edge cases with zero, NaN, or negative values safely", () => {
    const result = calculateCareerReadiness({
      atsScore: 0,
      roleMatchScore: -10,
      interviewScore: undefined,
    });
    expect(result.overallScore).toBe(0);
    expect(result.isMeasured).toBe(false);
  });
});

describe("formatChartDate", () => {
  it("formats standard ISO timestamp to Short Date", () => {
    const formatted = formatChartDate("2026-08-23T12:00:00Z");
    expect(formatted).toContain("Aug");
    expect(formatted).toContain("23");
  });

  it("handles empty or invalid string gracefully without throwing", () => {
    expect(formatChartDate("")).toBe("");
    expect(formatChartDate(undefined)).toBe("");
    expect(formatChartDate("invalid-date")).toBe("invalid-date");
  });
});
