import { describe, it, expect } from "vitest";
import { calculateCareerReadiness } from "@/lib/careerMetrics";
import { generateClientFallbackRecommendations } from "@/lib/recommendationUtils";

describe("Career Intelligence Closed-Loop Integration Flow", () => {
  it("dynamically adapts Career Readiness and Recommendations as the candidate completes actions", () => {
    // Step 1: Initial state - only resume uploaded
    const initialReadiness = calculateCareerReadiness({
      atsScore: 78,
      roleMatchScore: 70,
    });
    expect(initialReadiness.overallScore).toBe(74);
    expect(initialReadiness.statusLabel).toBe("Making Good Progress");

    // Initial recommendations point to top skill gap
    const initialRecs = generateClientFallbackRecommendations({
      targetRole: "Full Stack Engineer",
      atsScore: 78,
      missingSkills: ["Kubernetes", "GraphQL", "Redis"],
    });
    expect(initialRecs.recommendations[0].title).toBe("Close Kubernetes Skill Gap");
    expect(initialRecs.recommendations[0].priority).toBe("critical");

    // Step 2: User completes Roadmap Milestone and Mock Interview
    const updatedReadiness = calculateCareerReadiness({
      atsScore: 92,
      roleMatchScore: 88,
      interviewScore: 85,
      roadmapProgress: 80,
      jobMatchScore: 90,
    });
    expect(updatedReadiness.overallScore).toBe(88);
    expect(updatedReadiness.statusLabel).toBe("Strong Candidate");

    // Recommendations adapt to remaining gap
    const updatedRecs = generateClientFallbackRecommendations({
      targetRole: "Full Stack Engineer",
      atsScore: 92,
      missingSkills: ["Redis"],
      interviewScore: 85,
    });
    expect(updatedRecs.recommendations[0].title).toBe("Close Redis Skill Gap");
  });
});
