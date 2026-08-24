import { describe, it, expect, beforeEach } from "vitest";
import { queryKeys } from "@/lib/queryKeys";

describe("queryKeys central factory", () => {
  it("provides deterministic query key arrays across all modules with user scoping", () => {
    const userId = "usr-123";
    expect(queryKeys.auth.me).toEqual(["users", "me"]);
    expect(queryKeys.resumes.detail(userId, "res-123")).toEqual(["resumes", userId, "detail", "res-123"]);
    expect(queryKeys.intelligence.recommendations(userId, "active")).toEqual([
      "intelligence",
      userId,
      "recommendations",
      "active",
    ]);
    expect(queryKeys.applications.list(userId, "applied")).toEqual([
      "applications",
      userId,
      "list",
      "applied",
      "all",
    ]);
    expect(queryKeys.analytics.summary(userId)).toEqual(["analytics", userId, "summary"]);
  });
});

describe("Session & Local Storage Isolation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("safely serializes and parses session tokens without throwing", () => {
    const token = "mock-jwt-token-12345";
    localStorage.setItem("lakshya_token", token);
    const retrieved = localStorage.getItem("lakshya_token");
    expect(retrieved).toBe(token);

    localStorage.removeItem("lakshya_token");
    expect(localStorage.getItem("lakshya_token")).toBeNull();
  });

  it("handles malformed JSON in localStorage gracefully", () => {
    localStorage.setItem("lakshya_user_profile", "{ broken_json: ... ");
    let parsed = null;
    try {
      parsed = JSON.parse(localStorage.getItem("lakshya_user_profile") || "{}");
    } catch {
      parsed = { fallback: true };
    }
    expect(parsed).toEqual({ fallback: true });
  });
});
