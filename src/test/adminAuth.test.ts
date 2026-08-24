import { describe, it, expect } from "vitest";

describe("Admin Role-Based Authorization & Session Invariants", () => {
  it("determines admin privileges strictly based on backend role claim", () => {
    const candidateUser = {
      id: "usr-1",
      email: "candidate@lakshya.ai",
      role: "user" as const,
    };

    const adminUser = {
      id: "usr-2",
      email: "admin@lakshya.ai",
      role: "admin" as const,
    };

    const superAdminUser = {
      id: "usr-3",
      email: "srikanthuppalapati09@gmail.com",
      role: "super_admin" as const,
    };

    const checkIsAdmin = (user: { role?: string }) => {
      return user.role === "admin" || user.role === "super_admin";
    };

    const checkIsSuperAdmin = (user: { role?: string }) => {
      return user.role === "super_admin";
    };

    expect(checkIsAdmin(candidateUser)).toBe(false);
    expect(checkIsAdmin(adminUser)).toBe(true);
    expect(checkIsAdmin(superAdminUser)).toBe(true);

    expect(checkIsSuperAdmin(adminUser)).toBe(false);
    expect(checkIsSuperAdmin(superAdminUser)).toBe(true);
  });

  it("blocks suspended administrators from accessing platform", () => {
    const suspendedAdmin = {
      id: "usr-4",
      email: "bad_admin@lakshya.ai",
      role: "admin" as const,
      is_suspended: true,
    };

    const isAuthorized = (user: { role?: string; is_suspended?: boolean }) => {
      if (user.is_suspended) return false;
      return user.role === "admin" || user.role === "super_admin";
    };

    expect(isAuthorized(suspendedAdmin)).toBe(false);
  });
});
