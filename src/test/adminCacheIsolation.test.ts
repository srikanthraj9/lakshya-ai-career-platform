import { describe, it, expect } from "vitest";
import { queryKeys } from "@/lib/queryKeys";

describe("Admin Query Key & Multi-Tenant Cache Isolation", () => {
  it("generates distinct query keys for candidate workspace inspections", () => {
    const userAKey = queryKeys.admin.userWorkspace("user-uuid-aaa");
    const userBKey = queryKeys.admin.userWorkspace("user-uuid-bbb");

    expect(userAKey).not.toEqual(userBKey);
    expect(userAKey[2]).toBe("user-uuid-aaa");
    expect(userBKey[2]).toBe("user-uuid-bbb");
  });

  it("ensures admin query keys are isolated under the 'admin' root scope", () => {
    expect(queryKeys.admin.dashboard[0]).toBe("admin");
    expect(queryKeys.admin.analytics[0]).toBe("admin");
    expect(queryKeys.admin.systemHealth[0]).toBe("admin");
    expect(queryKeys.admin.featureFlags[0]).toBe("admin");
  });
});
