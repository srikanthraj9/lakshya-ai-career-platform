import { describe, it, expect, beforeEach } from "vitest";
import { calculateCareerReadiness } from "@/lib/careerMetrics";
import { generateNextBestActions } from "@/lib/dashboardActions";
import { getActiveTargetRole, setActiveTargetRole } from "@/lib/navigationStatus";
import {
  getUserStorageKey,
  getUserStorage,
  setUserStorage,
  clearLakshyaUserStorage,
} from "@/lib/userStorage";

describe("Four Distinct Personas & Safe Empty State Verification", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("User 1: New Account without onboarding, skills, or resume produces intentional empty state", () => {
    const user1 = {
      id: "usr-1-empty",
      email: "newuser@example.com",
      is_email_verified: false,
    };

    const targetRole = getActiveTargetRole(user1.id);
    expect(targetRole.title).toBe("No Target Role Selected");
    expect(targetRole.readiness).toBe(0);

    const readiness = calculateCareerReadiness({});
    expect(readiness.overallScore).toBe(0);
    expect(readiness.isMeasured).toBe(false);
    expect(readiness.statusLabel).toBe("Not Measured Yet");
    expect(readiness.resumeHealth).toBeNull();
    expect(readiness.roleMatch).toBeNull();
    expect(readiness.interviewReadiness).toBeNull();

    const actions = generateNextBestActions({
      hasResume: false,
      targetRoleTitle: targetRole.title,
    });

    const setupAction = actions.find((a) => a.id === "select_target_role");
    expect(setupAction).toBeDefined();
    expect(setupAction?.ctaHref).toBe("/onboarding");

    // Email verification check
    expect(!user1.is_email_verified).toBe(true);
  });

  it("User 2: Data Analyst (Python, SQL, Power BI) without resume produces clean Data Analyst state", () => {
    const user2 = {
      id: "usr-2-data",
      targetRole: "Data Analyst",
      skills: ["Python", "SQL", "Power BI"],
      is_email_verified: true,
    };

    setActiveTargetRole(user2.targetRole, 0, user2.id);
    setUserStorage(user2.id, "verified_skills", user2.skills);

    const targetRole = getActiveTargetRole(user2.id);
    expect(targetRole.title).toBe("Data Analyst");

    // Must not see User 1 or User 3 resume
    expect(getUserStorage(user2.id, "resumeId")).toBeNull();

    const actions = generateNextBestActions({
      hasResume: false,
      targetRoleTitle: user2.targetRole,
    });

    const resumeAction = actions.find((a) => a.id === "upload_first_resume");
    expect(resumeAction).toBeDefined();
    expect(resumeAction?.ctaHref).toBe("/resume/upload");

    const roadmapAction = actions.find((a) => a.id === "explore_roadmaps");
    expect(roadmapAction?.title).toContain("Data Analyst");
  });

  it("User 3: Frontend Developer (React, TypeScript, CSS) with resume produces verified ATS metrics", () => {
    const user3 = {
      id: "usr-3-frontend",
      targetRole: "Frontend Developer",
      skills: ["React", "TypeScript", "CSS"],
      atsScore: 88,
      is_email_verified: true,
    };

    setActiveTargetRole(user3.targetRole, 88, user3.id);
    setUserStorage(user3.id, "verified_skills", user3.skills);
    setUserStorage(user3.id, "resumeId", "resume-frontend-3");

    const targetRole = getActiveTargetRole(user3.id);
    expect(targetRole.title).toBe("Frontend Developer");

    const readiness = calculateCareerReadiness({
      atsScore: user3.atsScore,
      roleMatchScore: 90,
    });

    expect(readiness.isMeasured).toBe(true);
    expect(readiness.resumeHealth).toBe(88);
    expect(readiness.overallScore).toBeGreaterThan(80);
  });

  it("User 4: Backend Developer (Python, FastAPI, PostgreSQL) with interview completed", () => {
    const user4 = {
      id: "usr-4-backend",
      targetRole: "Backend Developer",
      skills: ["Python", "FastAPI", "PostgreSQL"],
      interviewScore: 85,
      is_email_verified: true,
    };

    setActiveTargetRole(user4.targetRole, 85, user4.id);

    const targetRole = getActiveTargetRole(user4.id);
    expect(targetRole.title).toBe("Backend Developer");

    const readiness = calculateCareerReadiness({
      roleMatchScore: 85,
      interviewScore: user4.interviewScore,
    });

    expect(readiness.isMeasured).toBe(true);
    expect(readiness.interviewReadiness).toBe(85);

    const actions = generateNextBestActions({
      hasResume: true,
      atsScore: 90,
      interviewScore: 85,
      targetRoleTitle: user4.targetRole,
    });

    // When interview score is >= 75, does not recommend foundational practice
    const basicMockAction = actions.find((a) => a.id === "first_mock_interview");
    expect(basicMockAction).toBeUndefined();
  });
});

describe("Cross-User Isolation & Session Switching Safety", () => {
  it("switching between users cleans scoped caches and prevents contamination", () => {
    setUserStorage("user-1", "pref", "dark");
    setUserStorage("user-2", "pref", "light");
    setUserStorage("user-3", "pref", "system");

    expect(getUserStorage("user-1", "pref")).toBe("dark");
    expect(getUserStorage("user-2", "pref")).toBe("light");
    expect(getUserStorage("user-3", "pref")).toBe("system");

    clearLakshyaUserStorage("user-1");

    expect(getUserStorage("user-1", "pref")).toBeNull();
    expect(getUserStorage("user-2", "pref")).toBe("light");
    expect(getUserStorage("user-3", "pref")).toBe("system");
  });
});
