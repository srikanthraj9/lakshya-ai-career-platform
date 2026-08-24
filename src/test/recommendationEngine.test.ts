import { describe, it, expect } from "vitest";
import { generateClientFallbackRecommendations } from "@/lib/recommendationUtils";

describe("generateClientFallbackRecommendations", () => {
  it("generates structured recommendations with explainability factors and priority", () => {
    const result = generateClientFallbackRecommendations({
      targetRole: "Full Stack Engineer",
      missingSkills: ["Kubernetes", "GraphQL", "Redis"],
    });

    expect(result.recommendations).toHaveLength(3);
    const topRec = result.recommendations[0];
    expect(topRec.title).toBe("Close Kubernetes Skill Gap");
    expect(topRec.priority).toBe("critical");
    expect(topRec.impact_score).toBeGreaterThan(0);
    expect(topRec.reason?.explanation).toBeDefined();
    expect(topRec.reason?.factors).toBeInstanceOf(Array);
    expect(topRec.reason?.factors.length).toBeGreaterThan(0);
  });

  it("handles empty missing skills by using default high-impact fallbacks", () => {
    const result = generateClientFallbackRecommendations({
      targetRole: "Backend Specialist",
      missingSkills: [],
    });

    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.criticalGaps.length).toBeGreaterThan(0);
    expect(result.criticalGaps[0].skill).toBe("Docker");
  });

  it("assigns valid deep-links to action URLs", () => {
    const result = generateClientFallbackRecommendations({
      targetRole: "Senior Engineer",
    });

    for (const rec of result.recommendations) {
      expect(rec.action_url).toMatch(/^\//); // Must start with leading slash
      expect(rec.action_label.length).toBeGreaterThan(0);
      expect(rec.status).toBe("active");
    }
  });
});
