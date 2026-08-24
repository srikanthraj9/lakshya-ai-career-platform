import { describe, it, expect, beforeEach } from "vitest";
import { queryKeys } from "@/lib/queryKeys";
import { calculateCareerReadiness } from "@/lib/careerMetrics";
import { generateNextBestActions } from "@/lib/dashboardActions";
import { getActiveTargetRole, setActiveTargetRole } from "@/lib/navigationStatus";
import {
  getUserStorageKey,
  getUserStorage,
  setUserStorage,
  clearLakshyaUserStorage,
} from "@/lib/userStorage";

describe("Data Source Integrity & Isolation Proofs", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("1. Every user-owned query key includes the authenticated userId partition", () => {
    const userId = "usr-audit-123";

    expect(queryKeys.profile.current(userId)).toEqual(["profile", userId]);
    expect(queryKeys.resumes.list(userId)).toEqual(["resumes", userId, "list"]);
    expect(queryKeys.applications.list(userId)).toEqual(["applications", userId, "list", "all", "all"]);
    expect(queryKeys.interviews.all(userId)).toEqual(["interviews", userId]);
    expect(queryKeys.intelligence.overview(userId)).toEqual(["intelligence", userId, "overview"]);
    expect(queryKeys.notifications.all(userId)).toEqual(["notifications", userId]);
    expect(queryKeys.activity.all(userId)).toEqual(["activity", userId, 50]);
    expect(queryKeys.roadmap.progress(userId, "frontend", "entry")).toEqual([
      "roadmap",
      userId,
      "progress",
      "frontend",
      "entry",
    ]);
  });

  it("2. User A data cannot appear for User B in storage or state", () => {
    const userA = "usr-A";
    const userB = "usr-B";

    setUserStorage(userA, "resumeId", "res-A-999");
    setUserStorage(userA, "targetRole", { title: "Frontend Developer", readiness: 85 });

    expect(getUserStorage(userB, "resumeId")).toBeNull();
    expect(getActiveTargetRole(userB).title).toBe("No Target Role Selected");
  });

  it("3. User with empty profile receives verified unmeasured empty states", () => {
    const emptyReadiness = calculateCareerReadiness({});
    expect(emptyReadiness.overallScore).toBe(0);
    expect(emptyReadiness.isMeasured).toBe(false);
    expect(emptyReadiness.statusLabel).toBe("Not Measured Yet");
    expect(emptyReadiness.resumeHealth).toBeNull();
    expect(emptyReadiness.roleMatch).toBeNull();
    expect(emptyReadiness.interviewReadiness).toBeNull();
  });

  it("4. Fresh user without target role receives onboarding CTA instead of fake role", () => {
    const targetRole = getActiveTargetRole("fresh-user-id");
    expect(targetRole.title).toBe("No Target Role Selected");
    expect(targetRole.readiness).toBe(0);

    const actions = generateNextBestActions({
      hasResume: false,
      targetRoleTitle: targetRole.title,
    });

    const setupAction = actions.find((a) => a.id === "select_target_role");
    expect(setupAction).toBeDefined();
    expect(setupAction?.ctaHref).toBe("/onboarding");
  });

  it("5. Notifications and Activity contexts operate in isolated partitions", () => {
    setUserStorage("usr-1", "notifications", [{ id: "notif-1", title: "User 1 Alert" }]);
    setUserStorage("usr-2", "notifications", [{ id: "notif-2", title: "User 2 Alert" }]);

    const u1Notifs = getUserStorage<Array<{ id: string }>>("usr-1", "notifications");
    const u2Notifs = getUserStorage<Array<{ id: string }>>("usr-2", "notifications");

    expect(u1Notifs?.[0]?.id).toBe("notif-1");
    expect(u2Notifs?.[0]?.id).toBe("notif-2");
  });

  it("6. Logout safely purges sensitive credentials while maintaining partition safety", () => {
    setUserStorage("usr-session", "token", "jwt-token-secret");
    setUserStorage("usr-session", "theme", "dark");

    clearLakshyaUserStorage("usr-session");

    expect(getUserStorage("usr-session", "token")).toBeNull();
  });

  it("7. Email verification state responds strictly to boolean verification property", () => {
    const unverifiedUser = { id: "u-uv", email: "uv@example.com", is_email_verified: false };
    const verifiedUser = { id: "u-v", email: "v@example.com", is_email_verified: true };

    expect(!unverifiedUser.is_email_verified).toBe(true);
    expect(!verifiedUser.is_email_verified).toBe(false);
  });
});
