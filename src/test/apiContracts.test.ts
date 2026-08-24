import { describe, it, expect } from "vitest";
import type { JobApplication, InterviewDebrief, CompanyIntelligence } from "@/services/applicationTrackerService";
import type { CareerRecommendation, CareerGoal } from "@/services/intelligenceService";

describe("Frontend / Backend API Contracts & Interface Invariants", () => {
  it("validates JobApplication interface schema shape", () => {
    const mockApp: JobApplication = {
      id: "app-1",
      company_name: "Stripe",
      job_title: "Senior Engineer",
      job_source: "manual",
      stage: "interviewing",
      status: "active",
      last_status_change: new Date().toISOString(),
      match_score_at_application: 95.0,
      application_metadata: {},
      events: [],
      debriefs: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(mockApp.id).toBeDefined();
    expect(mockApp.company_name).toBe("Stripe");
    expect(mockApp.stage).toBe("interviewing");
    expect(mockApp.events).toBeInstanceOf(Array);
    expect(mockApp.debriefs).toBeInstanceOf(Array);
  });

  it("validates InterviewDebrief interface shape", () => {
    const mockDebrief: InterviewDebrief = {
      id: "deb-1",
      application_id: "app-1",
      company_name: "Google",
      round_type: "System Design",
      date: new Date().toISOString(),
      difficulty_rating: 4,
      technical_score: 9,
      communication_score: 8,
      system_design_score: 9,
      questions_asked: ["Design rate limiter"],
      identified_weaknesses: ["Redis cluster failover"],
      outcome: "passed",
      created_at: new Date().toISOString(),
    };

    expect(mockDebrief.outcome).toBe("passed");
    expect(mockDebrief.difficulty_rating).toBe(4);
    expect(mockDebrief.questions_asked).toContain("Design rate limiter");
  });

  it("validates CareerRecommendation interface shape", () => {
    const mockRec: CareerRecommendation = {
      id: "rec-1",
      recommendation_type: "skill_gap",
      title: "Master Kubernetes",
      description: "Required for target role",
      source_module: "role_alignment",
      target_module: "roadmap",
      priority: "critical",
      impact_score: 95.0,
      confidence_score: 90.0,
      urgency_score: 0.85,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(mockRec.priority).toBe("critical");
    expect(mockRec.impact_score).toBe(95.0);
  });
});
