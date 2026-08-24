import { describe, it, expect, beforeEach } from "vitest";
import { calculateCareerReadiness } from "@/lib/careerMetrics";
import { generateNextBestActions } from "@/lib/dashboardActions";
import { getActiveTargetRole, setActiveTargetRole } from "@/lib/navigationStatus";
import { getUserStorageKey, setUserStorage } from "@/lib/userStorage";

describe("Dynamic Dashboard Career Readiness Calculation", () => {
  it("returns unmeasured state (score 0, isMeasured false) when user has no data", () => {
    const readiness = calculateCareerReadiness({});
    expect(readiness.overallScore).toBe(0);
    expect(readiness.isMeasured).toBe(false);
    expect(readiness.statusLabel).toBe("Not Measured Yet");
    expect(readiness.resumeHealth).toBeNull();
    expect(readiness.roleMatch).toBeNull();
    expect(readiness.interviewReadiness).toBeNull();
  });

  it("calculates accurate weighted readiness dynamically from user's actual ATS and role match", () => {
    const readiness = calculateCareerReadiness({
      atsScore: 85,
      roleMatchScore: 90,
      interviewScore: 80,
    });
    expect(readiness.isMeasured).toBe(true);
    expect(readiness.overallScore).toBeGreaterThan(80);
    expect(readiness.resumeHealth).toBe(85);
    expect(readiness.roleMatch).toBe(90);
    expect(readiness.interviewReadiness).toBe(80);
  });
});

describe("Dynamic Next Best Actions Generation", () => {
  it("generates role-specific actions for Frontend Developer without resume", () => {
    const actions = generateNextBestActions({
      hasResume: false,
      targetRoleTitle: "Frontend Developer",
    });

    expect(actions.length).toBeGreaterThan(0);
    const resumeAction = actions.find((a) => a.id === "upload_first_resume");
    expect(resumeAction).toBeDefined();
    expect(resumeAction?.ctaHref).toBe("/resume/upload");
  });

  it("generates role-specific actions for Data Analyst with resume and no interview", () => {
    const actions = generateNextBestActions({
      hasResume: true,
      atsScore: 88,
      interviewScore: 0,
      targetRoleTitle: "Data Analyst",
    });

    const interviewAction = actions.find((a) => a.id === "first_mock_interview");
    expect(interviewAction).toBeDefined();
    expect(interviewAction?.title).toContain("Data Analyst");

    const roadmapAction = actions.find((a) => a.id === "explore_roadmaps");
    expect(roadmapAction).toBeDefined();
    expect(roadmapAction?.title).toContain("Data Analyst");
  });

  it("generates role-specific actions for Backend Developer", () => {
    const actions = generateNextBestActions({
      hasResume: true,
      atsScore: 92,
      interviewScore: 85,
      newJobsCount: 5,
      targetRoleTitle: "Backend Developer",
    });

    const jobsAction = actions.find((a) => a.id === "review_new_jobs");
    expect(jobsAction).toBeDefined();
    expect(jobsAction?.title).toContain("5 open positions available");
  });
});

describe("User-Scoped Dynamic Navigation & Target Role", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns No Target Role Selected default when no user target role is stored", () => {
    const target = getActiveTargetRole("user-empty-uuid");
    expect(target.title).toBe("No Target Role Selected");
    expect(target.readiness).toBe(0);
  });

  it("differentiates User A (Frontend Developer) from User B (Data Analyst)", () => {
    setActiveTargetRole("Frontend Developer", 88, "user-A");
    setActiveTargetRole("Data Analyst", 75, "user-B");

    const targetUserA = getActiveTargetRole("user-A");
    const targetUserB = getActiveTargetRole("user-B");

    expect(targetUserA.title).toBe("Frontend Developer");
    expect(targetUserA.readiness).toBe(88);

    expect(targetUserB.title).toBe("Data Analyst");
    expect(targetUserB.readiness).toBe(75);
  });
});
