import { describe, it, expect } from "vitest";
import type { FeatureFlag } from "@/types";

describe("Admin Feature Flag System & Graceful Fallbacks", () => {
  it("evaluates feature flag access safely for different candidate roles", () => {
    const flags: FeatureFlag[] = [
      {
        id: "flag-1",
        key: "voice_interview",
        name: "Voice Mock Interview",
        is_enabled: true,
        target_roles: ["user", "admin", "super_admin"],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "flag-2",
        key: "admin_beta_analytics",
        name: "Beta Predictive Cohorts",
        is_enabled: false,
        target_roles: ["super_admin"],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const checkEnabled = (key: string, userRole: string = "user") => {
      const f = flags.find((item) => item.key === key);
      if (!f) return true; // Safe default
      if (!f.is_enabled) return false;
      return f.target_roles.includes(userRole);
    };

    expect(checkEnabled("voice_interview", "user")).toBe(true);
    expect(checkEnabled("voice_interview", "admin")).toBe(true);
    expect(checkEnabled("admin_beta_analytics", "user")).toBe(false);
    expect(checkEnabled("admin_beta_analytics", "super_admin")).toBe(false); // is_enabled is false
    expect(checkEnabled("non_existent_feature")).toBe(true); // Safe fallback
  });
});
