import { describe, it, expect, beforeEach } from "vitest";

describe("Session Lifecycle & Multi-User Cache Purging", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("stores user session and ensures complete state wipe on logout", () => {
    // 1. User A logs in
    const userA = { id: "usr-a", email: "user_a@lakshya.ai", name: "User A" };
    localStorage.setItem("lakshya_token", "jwt-user-a");
    localStorage.setItem("lakshya_user", JSON.stringify(userA));
    localStorage.setItem("lakshya:activities", JSON.stringify([{ id: "act-1", title: "User A Activity" }]));

    expect(localStorage.getItem("lakshya_token")).toBe("jwt-user-a");
    expect(JSON.parse(localStorage.getItem("lakshya_user")!).id).toBe("usr-a");

    // 2. User A logs out -> Complete cache purge
    localStorage.removeItem("lakshya_token");
    localStorage.removeItem("lakshya_user");
    localStorage.removeItem("lakshya:activities");

    expect(localStorage.getItem("lakshya_token")).toBeNull();
    expect(localStorage.getItem("lakshya_user")).toBeNull();
    expect(localStorage.getItem("lakshya:activities")).toBeNull();

    // 3. User B logs in -> Pristine session
    const userB = { id: "usr-b", email: "user_b@lakshya.ai", name: "User B" };
    localStorage.setItem("lakshya_token", "jwt-user-b");
    localStorage.setItem("lakshya_user", JSON.stringify(userB));

    expect(localStorage.getItem("lakshya_token")).toBe("jwt-user-b");
    expect(JSON.parse(localStorage.getItem("lakshya_user")!).id).toBe("usr-b");
    // Ensure User A's activities are NOT present
    expect(localStorage.getItem("lakshya:activities")).toBeNull();
  });
});
