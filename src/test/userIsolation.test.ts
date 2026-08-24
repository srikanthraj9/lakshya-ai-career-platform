import { describe, it, expect, beforeEach, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  getUserStorageKey,
  getUserStorage,
  setUserStorage,
  removeUserStorage,
  clearLakshyaUserStorage,
  purgeLegacyUnscopedStorage,
} from "@/lib/userStorage";
import { queryKeys } from "@/lib/queryKeys";
import { persistenceMigrationService } from "@/services/persistenceMigrationService";
import { activityService } from "@/services/activityService";
import { notificationService } from "@/services/notificationService";

describe("User Storage Namespacing & Isolation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("constructs isolated user-scoped keys", () => {
    const userAKey = getUserStorageKey("user-A-uuid", "resumeId");
    const userBKey = getUserStorageKey("user-B-uuid", "resumeId");

    expect(userAKey).toBe("lakshya:user-A-uuid:resumeId");
    expect(userBKey).toBe("lakshya:user-B-uuid:resumeId");
    expect(userAKey).not.toBe(userBKey);
  });

  it("isolates data between User A and User B in browser storage", () => {
    setUserStorage("user-A", "target_role", { title: "Backend Engineer", readiness: 92 });
    setUserStorage("user-B", "target_role", { title: "Frontend Architect", readiness: 85 });

    const userAData = getUserStorage<{ title: string; readiness: number }>("user-A", "target_role");
    const userBData = getUserStorage<{ title: string; readiness: number }>("user-B", "target_role");

    expect(userAData?.title).toBe("Backend Engineer");
    expect(userAData?.readiness).toBe(92);

    expect(userBData?.title).toBe("Frontend Architect");
    expect(userBData?.readiness).toBe(85);
  });

  it("clearLakshyaUserStorage only removes specified user keys without touching other users", () => {
    setUserStorage("user-A", "resumeId", "resume-uuid-AAA");
    setUserStorage("user-A", "custom_skills", ["Docker", "Kubernetes"]);
    setUserStorage("user-B", "resumeId", "resume-uuid-BBB");

    clearLakshyaUserStorage("user-A");

    expect(getUserStorage("user-A", "resumeId")).toBeNull();
    expect(getUserStorage("user-A", "custom_skills")).toBeNull();
    expect(getUserStorage("user-B", "resumeId")).toBe("resume-uuid-BBB");
  });

  it("purgeLegacyUnscopedStorage permanently deletes all legacy unscoped keys", () => {
    localStorage.setItem("resumeId", "legacy-resume-id");
    localStorage.setItem("lakshya:target_role", JSON.stringify({ title: "Old Role" }));
    localStorage.setItem("lakshya:career-activities", JSON.stringify([{ id: "old-act" }]));
    localStorage.setItem("roadmap-progress:frontend:junior", JSON.stringify([0, 1]));

    // Set a valid user-scoped key
    setUserStorage("user-C", "resumeId", "valid-scoped-resume");

    purgeLegacyUnscopedStorage();

    expect(localStorage.getItem("resumeId")).toBeNull();
    expect(localStorage.getItem("lakshya:target_role")).toBeNull();
    expect(localStorage.getItem("lakshya:career-activities")).toBeNull();
    expect(localStorage.getItem("roadmap-progress:frontend:junior")).toBeNull();

    // Valid user-scoped key remains intact
    expect(getUserStorage("user-C", "resumeId")).toBe("valid-scoped-resume");
  });
});

describe("React Query User Cache Isolation", () => {
  it("creates separate cache partitions for different users", () => {
    const queryClient = new QueryClient();

    const userAResumeKey = queryKeys.resumes.list("user-A");
    const userBResumeKey = queryKeys.resumes.list("user-B");

    queryClient.setQueryData(userAResumeKey, [{ id: "res-A", file_name: "ResumeA.pdf" }]);
    queryClient.setQueryData(userBResumeKey, [{ id: "res-B", file_name: "ResumeB.pdf" }]);

    const cachedUserA = queryClient.getQueryData(userAResumeKey);
    const cachedUserB = queryClient.getQueryData(userBResumeKey);

    expect(cachedUserA).toEqual([{ id: "res-A", file_name: "ResumeA.pdf" }]);
    expect(cachedUserB).toEqual([{ id: "res-B", file_name: "ResumeB.pdf" }]);
    expect(cachedUserA).not.toEqual(cachedUserB);
  });

  it("queryClient.clear() completely purges all cached query entries on logout", () => {
    const queryClient = new QueryClient();

    queryClient.setQueryData(queryKeys.resumes.list("user-A"), [{ id: "res-A" }]);
    queryClient.setQueryData(queryKeys.applications.list("user-A"), [{ id: "app-A" }]);
    queryClient.setQueryData(queryKeys.intelligence.overview("user-A"), { score: 95 });

    expect(queryClient.getQueryData(queryKeys.resumes.list("user-A"))).toBeDefined();

    // Simulate logout purge
    queryClient.clear();

    expect(queryClient.getQueryData(queryKeys.resumes.list("user-A"))).toBeUndefined();
    expect(queryClient.getQueryData(queryKeys.applications.list("user-A"))).toBeUndefined();
    expect(queryClient.getQueryData(queryKeys.intelligence.overview("user-A"))).toBeUndefined();
  });
});

describe("Empty State & Persistence Safety", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("activityService returns empty array for new/unauthenticated users without fake defaults", () => {
    const activities = activityService.getLocalActivities("new-user-uuid");
    expect(activities).toEqual([]);
  });

  it("notificationService returns empty array for new/unauthenticated users without fake defaults", () => {
    const notifications = notificationService.getLocalNotifications("new-user-uuid");
    expect(notifications).toEqual([]);
  });

  it("persistenceMigrationService safely purges legacy data on auth trigger", async () => {
    localStorage.setItem("token", "mock-token-123");
    localStorage.setItem("resumeId", "legacy-id");
    localStorage.setItem("lakshya:target_role", "legacy-role");

    const result = await persistenceMigrationService.runMigrationIfAuthenticated();
    expect(result).toBe(true);

    expect(localStorage.getItem("resumeId")).toBeNull();
    expect(localStorage.getItem("lakshya:target_role")).toBeNull();
  });
});
