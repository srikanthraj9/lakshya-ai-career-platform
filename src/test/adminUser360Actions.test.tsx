import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminUserWorkspacePage } from "@/pages/admin/AdminUserWorkspacePage";
import { adminService } from "@/services/adminService";
import type { AdminUserDetail } from "@/types";

vi.mock("@/services/adminService", () => ({
  adminService: {
    getUserDetail: vi.fn(),
    suspendUser: vi.fn(),
    activateUser: vi.fn(),
    updateUserRole: vi.fn(),
  },
}));

let mockCurrentAdminUser = {
  id: "admin-lead-id",
  email: "admin@lakshya.ai",
  full_name: "Lead Admin",
  role: "super_admin",
  is_active: true,
  is_email_verified: true,
};

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: mockCurrentAdminUser,
    isAuthenticated: true,
  }),
}));

const sampleCandidate: AdminUserDetail = {
  id: "cand-uuid-123",
  email: "candidate@example.com",
  full_name: "Jane Candidate",
  role: "user",
  is_active: true,
  is_suspended: false,
  is_email_verified: true,
  onboarding_completed: true,
  target_role: "Full Stack Engineer",
  experience_level: "Mid-Level",
  target_industry: "Technology",
  created_at: "2026-10-01T12:00:00Z",
  last_activity_at: "2026-10-27T12:00:00Z",
  profile: {
    bio: "Passionate developer",
    skills: ["React", "Python", "TypeScript"],
    phone: "+1234567890",
  },
  metrics: {
    applications_count: 8,
    interviews_count: 3,
    resumes_count: 2,
    ats_score: 92,
    readiness_score: 85,
  },
  applications: [],
  resumes: [],
  interviews: [],
};

function renderWorkspace(userId: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/admin/users/${userId}`]}>
        <Routes>
          <Route path="/admin/users/:userId" element={<AdminUserWorkspacePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Candidate 360° Administrative Lifecycle Actions (Milestone 4.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentAdminUser = {
      id: "admin-lead-id",
      email: "lead_admin@lakshya.ai",
      full_name: "Lead Admin",
      role: "super_admin",
      is_active: true,
      is_email_verified: true,
    };
  });

  it("1. Renders lifecycle action buttons (Suspend, Change Role, Mark Unverified) for active candidate", async () => {
    vi.mocked(adminService.getUserDetail).mockResolvedValue(sampleCandidate);

    renderWorkspace("cand-uuid-123");

    await waitFor(() => {
      expect(screen.getAllByText("Jane Candidate").length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByTestId("action-suspend-user")).toBeInTheDocument();
    expect(screen.getByTestId("action-change-role")).toBeInTheDocument();
    expect(screen.getByTestId("action-toggle-verification")).toBeInTheDocument();
  });

  it("2. Blocks self-suspension and role modification when viewing current administrator account", async () => {
    // Current admin viewing their own account
    const selfUser: AdminUserDetail = {
      ...sampleCandidate,
      id: "admin-lead-id",
      email: "lead_admin@lakshya.ai",
      full_name: "Lead Admin",
      role: "super_admin",
    };
    vi.mocked(adminService.getUserDetail).mockResolvedValue(selfUser);

    renderWorkspace("admin-lead-id");

    await waitFor(() => {
      expect(screen.getAllByText("Lead Admin").length).toBeGreaterThanOrEqual(1);
    });

    const suspendBtn = screen.getByTestId("action-suspend-user");
    const roleBtn = screen.getByTestId("action-change-role");

    expect(suspendBtn).toBeDisabled();
    expect(roleBtn).toBeDisabled();
    expect(screen.getByText(/Self-Action Protected/i)).toBeInTheDocument();
  });

  it("3. Blocks suspension and role modification for bootstrap administrator accounts", async () => {
    const bootstrapUser: AdminUserDetail = {
      ...sampleCandidate,
      id: "bootstrap-uuid-999",
      email: "admin@lakshya.ai", // matches bootstrap admin check
      full_name: "Bootstrap SuperAdmin",
      role: "super_admin",
    };
    vi.mocked(adminService.getUserDetail).mockResolvedValue(bootstrapUser);

    renderWorkspace("bootstrap-uuid-999");

    await waitFor(() => {
      expect(screen.getAllByText("Bootstrap SuperAdmin").length).toBeGreaterThanOrEqual(1);
    });

    const suspendBtn = screen.getByTestId("action-suspend-user");
    const roleBtn = screen.getByTestId("action-change-role");

    expect(suspendBtn).toBeDisabled();
    expect(roleBtn).toBeDisabled();
    expect(screen.getByText(/Protected Bootstrap Account/i)).toBeInTheDocument();
  });

  it("4. Opens Suspend modal, enforces reason input, and calls suspendUser on submit", async () => {
    vi.mocked(adminService.getUserDetail).mockResolvedValue(sampleCandidate);
    vi.mocked(adminService.suspendUser).mockResolvedValue({
      id: "cand-uuid-123",
      email: "candidate@example.com",
      full_name: "Jane Candidate",
      role: "user",
      is_active: false,
      is_suspended: true,
      suspension_reason: "Violation of terms",
    });

    renderWorkspace("cand-uuid-123");

    await waitFor(() => {
      expect(screen.getAllByText("Jane Candidate").length).toBeGreaterThanOrEqual(1);
    });

    // Click Suspend action
    fireEvent.click(screen.getByTestId("action-suspend-user"));

    // Modal should be open
    expect(screen.getByText("Suspend Candidate Account")).toBeInTheDocument();
    const confirmBtn = screen.getByTestId("confirm-suspend-submit");
    expect(confirmBtn).toBeDisabled(); // Disabled until reason provided

    // Enter suspension reason
    const reasonInput = screen.getByPlaceholderText(/Specify the operational, policy, or security reason/i);
    fireEvent.change(reasonInput, { target: { value: "Violation of terms" } });
    expect(confirmBtn).not.toBeDisabled();

    // Submit suspension
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(adminService.suspendUser).toHaveBeenCalledWith("cand-uuid-123", "Violation of terms");
    });
  });

  it("5. Shows Reactivate button for suspended users and triggers activateUser upon confirmation", async () => {
    const suspendedCandidate: AdminUserDetail = {
      ...sampleCandidate,
      is_active: false,
      is_suspended: true,
    };
    vi.mocked(adminService.getUserDetail).mockResolvedValue(suspendedCandidate);
    vi.mocked(adminService.activateUser).mockResolvedValue({
      id: "cand-uuid-123",
      email: "candidate@example.com",
      full_name: "Jane Candidate",
      role: "user",
      is_active: true,
      is_suspended: false,
    });

    renderWorkspace("cand-uuid-123");

    await waitFor(() => {
      expect(screen.getAllByText("Jane Candidate").length).toBeGreaterThanOrEqual(1);
    });

    const reactivateBtn = screen.getByTestId("action-activate-user");
    expect(reactivateBtn).toBeInTheDocument();

    fireEvent.click(reactivateBtn);

    expect(screen.getByText("Reactivate Candidate Account")).toBeInTheDocument();
    const confirmBtn = screen.getByTestId("confirm-activate-submit");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(adminService.activateUser).toHaveBeenCalledWith("cand-uuid-123");
    });
  });

  it("6. Opens Change Role modal and calls updateUserRole with selected target role", async () => {
    vi.mocked(adminService.getUserDetail).mockResolvedValue(sampleCandidate);
    vi.mocked(adminService.updateUserRole).mockResolvedValue({
      id: "cand-uuid-123",
      email: "candidate@example.com",
      full_name: "Jane Candidate",
      role: "admin",
      is_active: true,
      is_suspended: false,
    });

    renderWorkspace("cand-uuid-123");

    await waitFor(() => {
      expect(screen.getAllByText("Jane Candidate").length).toBeGreaterThanOrEqual(1);
    });

    // Change role from select
    fireEvent.change(screen.getByTestId("action-change-role"), { target: { value: "admin" } });

    expect(screen.getByText("Change Administrative Role")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("confirm-role-submit"));

    await waitFor(() => {
      expect(adminService.updateUserRole).toHaveBeenCalledWith("cand-uuid-123", { role: "admin" });
    });
  });

  it("7. Opens Email Verification modal and calls updateUserRole with toggled verification state", async () => {
    vi.mocked(adminService.getUserDetail).mockResolvedValue(sampleCandidate);
    vi.mocked(adminService.updateUserRole).mockResolvedValue({
      id: "cand-uuid-123",
      email: "candidate@example.com",
      full_name: "Jane Candidate",
      role: "user",
      is_active: true,
      is_suspended: false,
      is_email_verified: false,
    });

    renderWorkspace("cand-uuid-123");

    await waitFor(() => {
      expect(screen.getAllByText("Jane Candidate").length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getByTestId("action-toggle-verification"));

    expect(screen.getByText("Revoke Email Verification")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("confirm-verification-submit"));

    await waitFor(() => {
      expect(adminService.updateUserRole).toHaveBeenCalledWith("cand-uuid-123", { is_email_verified: false });
    });
  });
});
