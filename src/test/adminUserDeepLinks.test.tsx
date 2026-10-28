import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { adminService } from "@/services/adminService";
import type { AdminUserListItem } from "@/types";

// Mock adminService
vi.mock("@/services/adminService", () => ({
  adminService: {
    getUsers: vi.fn(),
    getUserDetail: vi.fn(),
    getDashboardStats: vi.fn(),
    getSystemHealth: vi.fn(),
    getServiceMetrics: vi.fn(),
    getAuditLogs: vi.fn(),
  },
}));

// Mock AuthContext
const mockCurrentAdmin = {
  id: "admin-uuid-1",
  email: "admin@lakshya.ai",
  full_name: "Lead Administrator",
  role: "super_admin",
  is_active: true,
  is_email_verified: true,
};

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: mockCurrentAdmin,
    isAuthenticated: true,
  }),
}));

const mockUsers: AdminUserListItem[] = [
  {
    id: "user-1",
    email: "candidate1@example.com",
    full_name: "Alice Candidate",
    role: "user",
    is_active: true,
    is_suspended: false,
    is_email_verified: true,
    onboarding_completed: true,
    target_role: "Frontend Engineer",
    ats_score: 88,
    readiness_score: 85,
    applications_count: 5,
    interviews_count: 2,
    created_at: "2026-10-01T00:00:00Z",
    last_activity_at: "2026-10-27T00:00:00Z",
  },
  {
    id: "user-2",
    email: "suspended@example.com",
    full_name: "Bob Suspended",
    role: "user",
    is_active: false,
    is_suspended: true,
    suspended_reason: "Violation of terms",
    is_email_verified: true,
    onboarding_completed: false,
    target_role: null,
    ats_score: null,
    readiness_score: 50,
    applications_count: 0,
    interviews_count: 0,
    created_at: "2026-09-01T00:00:00Z",
    last_activity_at: "2026-09-10T00:00:00Z",
  },
];

// Helper component to observe current URL in MemoryRouter
function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}{location.search}</div>;
}

function renderUsersPage(initialRoute: string = "/admin/users") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <LocationDisplay />
        <Routes>
          <Route path="/admin/users" element={<AdminUsersPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Milestone 4.1: Overview KPI Deep-Links & Admin User Management Filter Sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminService.getUsers).mockResolvedValue({
      users: mockUsers,
      total: 2,
      page: 1,
      page_size: 15,
      total_pages: 1,
    });
  });

  // 1. Navigation from Overview KPI cards
  it("Overview KPI cards render appropriate deep-link hrefs to User Management", async () => {
    vi.mocked(adminService.getDashboardStats).mockResolvedValue({
      total_users: 150,
      total_candidates: 120,
      new_users_today: 5,
      verified_users: 110,
      suspended_users: 4,
      active_users_today: 45,
      total_resumes: 95,
      total_applications: 320,
      total_interviews: 85,
    });
    vi.mocked(adminService.getSystemHealth).mockResolvedValue({ status: "healthy", services: [] } as any);
    vi.mocked(adminService.getServiceMetrics).mockResolvedValue([] as any);
    vi.mocked(adminService.getAuditLogs).mockResolvedValue({ logs: [], total: 0 } as any);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/admin"]}>
          <AdminDashboardPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      // Total Candidates card href
      const candidateLinks = screen.getAllByRole("link");
      const candidateCard = candidateLinks.find((l) => l.getAttribute("href") === "/admin/users?role=user");
      expect(candidateCard).toBeDefined();

      // Suspended Accounts card href
      const suspendedCard = candidateLinks.find((l) => l.getAttribute("href") === "/admin/users?status=suspended");
      expect(suspendedCard).toBeDefined();
    });
  });

  // 2. Initial filter state from direct URL: status=suspended
  it("initializes status filter from direct URL query param status=suspended and queries API correctly", async () => {
    renderUsersPage("/admin/users?status=suspended");

    await waitFor(() => {
      expect(adminService.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          page_size: 15,
          search: undefined,
          role: undefined,
          is_suspended: true,
        })
      );
    });

    // Check that status dropdown displays "Suspended"
    const selects = screen.getAllByRole("combobox");
    const statusSelect = selects[1] as HTMLSelectElement;
    expect(statusSelect.value).toBe("suspended");
  });

  // 2b. Initial filter state from direct URL: role=user
  it("initializes role filter from direct URL query param role=user and queries API correctly", async () => {
    renderUsersPage("/admin/users?role=user");

    await waitFor(() => {
      expect(adminService.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          page_size: 15,
          search: undefined,
          role: "user",
          is_suspended: undefined,
        })
      );
    });

    const selects = screen.getAllByRole("combobox");
    const roleSelect = selects[0] as HTMLSelectElement;
    expect(roleSelect.value).toBe("user");
  });

  // 3. Browser refresh simulation with query parameters
  it("preserves filter parameters and page on simulated browser refresh", async () => {
    renderUsersPage("/admin/users?role=admin&status=active&page=2");

    await waitFor(() => {
      expect(adminService.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          page_size: 15,
          search: undefined,
          role: "admin",
          is_suspended: false,
        })
      );
    });

    const selects = screen.getAllByRole("combobox");
    const roleSelect = selects[0] as HTMLSelectElement;
    const statusSelect = selects[1] as HTMLSelectElement;
    expect(roleSelect.value).toBe("admin");
    expect(statusSelect.value).toBe("active");
  });

  // 4. Invalid or unsupported query values safely handled
  it("sanitizes invalid or unsupported query values to defaults without crashing", async () => {
    renderUsersPage("/admin/users?role=super_hacker&status=unknown_status&page=-10");

    await waitFor(() => {
      expect(adminService.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          page_size: 15,
          search: undefined,
          role: undefined,
          is_suspended: undefined,
        })
      );
    });

    const selects = screen.getAllByRole("combobox");
    const roleSelect = selects[0] as HTMLSelectElement;
    const statusSelect = selects[1] as HTMLSelectElement;
    expect(roleSelect.value).toBe("all");
    expect(statusSelect.value).toBe("all");
  });

  // 5. Clearing filters and changing pages
  it("removes query parameters and resets state when Reset button is clicked", async () => {
    renderUsersPage("/admin/users?status=suspended&role=user");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /reset/i })).toBeDefined();
    });

    const resetButton = screen.getByRole("button", { name: /reset/i });
    fireEvent.click(resetButton);

    await waitFor(() => {
      const locationText = screen.getByTestId("location-display").textContent;
      expect(locationText).toBe("/admin/users");
      expect(adminService.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          page_size: 15,
          search: undefined,
          role: undefined,
          is_suspended: undefined,
        })
      );
    });
  });

  // 6. User interaction updates URL parameters with replace
  it("updates URL parameters when user changes role dropdown in UI", async () => {
    renderUsersPage("/admin/users");

    await waitFor(() => {
      expect(adminService.getUsers).toHaveBeenCalled();
    });

    const selects = screen.getAllByRole("combobox");
    const roleSelect = selects[0] as HTMLSelectElement;

    fireEvent.change(roleSelect, { target: { value: "super_admin" } });

    await waitFor(() => {
      const locationText = screen.getByTestId("location-display").textContent;
      expect(locationText).toContain("role=super_admin");
    });
  });
});
