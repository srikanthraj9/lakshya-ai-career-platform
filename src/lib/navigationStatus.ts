import type { NavigationStatus } from "@/types/career";
import { getUserStorage, setUserStorage } from "./userStorage";

const TARGET_ROLE_KEY = "target_role";

/**
 * Read the active target career goal from user-scoped storage
 */
export function getActiveTargetRole(userId?: string): { title: string; readiness: number } {
  if (userId) {
    const saved = getUserStorage<{ title: string; readiness?: number }>(userId, TARGET_ROLE_KEY);
    if (saved && typeof saved.title === "string") {
      return {
        title: saved.title,
        readiness: typeof saved.readiness === "number" ? saved.readiness : 0,
      };
    }
  }

  return {
    title: "No Target Role Selected",
    readiness: 0,
  };
}

/**
 * Save updated target role preference in user-scoped storage
 */
export function setActiveTargetRole(title: string, readiness = 80, userId?: string): void {
  if (userId) {
    setUserStorage(userId, TARGET_ROLE_KEY, { title, readiness });
  }
}

/**
 * Get dynamic badges for sidebar navigation
 */
export function getNavigationStatus(
  resumeCount = 0,
  roadmapCount = 0,
  jobsCount = 0,
  userId?: string
): NavigationStatus {
  const target = getActiveTargetRole(userId);
  return {
    activeResumeCount: resumeCount,
    activeRoadmapCount: roadmapCount,
    newJobsCount: jobsCount,
    targetRoleTitle: target.title,
    targetRoleReadiness: target.readiness,
  };
}
