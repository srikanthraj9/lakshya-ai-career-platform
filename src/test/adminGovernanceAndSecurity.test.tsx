import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminAuditPage } from "@/pages/admin/AdminAuditPage";
import { AnnouncementManager } from "@/components/admin/AnnouncementManager";
import { UserManagementTable } from "@/components/admin/UserManagementTable";
import { adminService } from "@/services/adminService";
import type { PlatformAnnouncement, AdminUserListItem } from "@/types";

// Mock adminService
vi.mock("@/services/adminService", () => ({
  adminService: {
    getAuditLogs: vi.fn(),
  },
}));

// Mock AuthContext
const mockCurrentAdmin = {
  id: "current-admin-uuid",
  email: "currentadmin@lakshya.ai",
  full_name: "Current Admin",
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

function renderWithProviders(ui: React.ReactElement, initialRoute: string = "/") {
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
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Phase 3 Governance and Security UI Enhancements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AdminAuditPage URL synchronization and filters", () => {
    it("reads resource_type and resource_id from URL query params and displays active filter badge", async () => {
      vi.mocked(adminService.getAuditLogs).mockResolvedValue({
        items: [
          {
            id: "log-1",
            admin_user_id: "admin-1",
            admin_email: "admin@example.com",
            action_type: "ALERT_RESOLVED",
            target_user_id: null,
            target_email: null,
            resource_type: "operational_alert",
            resource_id: "alert-db-123",
            action_metadata: {},
            before_data: null,
            after_data: null,
            diff: null,
            reason: "Resolved pool",
            severity: "critical",
            ip_address: null,
            user_agent: null,
            created_at: "2026-10-27T08:00:00Z",
          },
        ],
        total: 1,
        page: 1,
        page_size: 25,
        total_pages: 1,
      });

      renderWithProviders(
        <AdminAuditPage />,
        "/admin/audit?resource_type=operational_alert&resource_id=alert-db-123"
      );

      // Verify active resource filter badge appears
      await waitFor(() => {
        expect(screen.getByText(/Filtered by Resource:/i)).toBeInTheDocument();
        expect(screen.getByText(/operational_alert • alert-db-123/i)).toBeInTheDocument();
      });

      // Verify clear filter button is functional
      const clearBtn = screen.getByRole("button", { name: /Clear Filter/i });
      fireEvent.click(clearBtn);

      await waitFor(() => {
        expect(screen.queryByText(/Filtered by Resource:/i)).not.toBeInTheDocument();
      });
    });

    it("includes operational alert and database explorer action types in dropdown", () => {
      vi.mocked(adminService.getAuditLogs).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        page_size: 25,
        total_pages: 1,
      });

      renderWithProviders(<AdminAuditPage />);

      const select = screen.getByLabelText(/Filter by action type/i);
      expect(select).toBeInTheDocument();

      // Check options
      expect(screen.getByRole("option", { name: "ALERT_ACKNOWLEDGED" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "ALERT_RESOLVED" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "DATABASE_MUTATION_USERS" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "DATABASE_DELETE_USERS" })).toBeInTheDocument();
    });
  });

  describe("AnnouncementManager deletion confirmation safeguard", () => {
    const mockAnnouncements: PlatformAnnouncement[] = [
      {
        id: "ann-1",
        title: "Scheduled Maintenance Notice",
        message: "Platform maintenance on Saturday at 2 AM UTC.",
        type: "maintenance",
        target_audience: "all",
        is_active: true,
        starts_at: "2026-10-27T00:00:00Z",
        created_at: "2026-10-27T00:00:00Z",
      },
    ];

    it("prompts with confirmation modal before deleting an announcement", async () => {
      const onDeleteMock = vi.fn().mockResolvedValue(undefined);
      const onCreateMock = vi.fn().mockResolvedValue(undefined);

      render(
        <AnnouncementManager
          announcements={mockAnnouncements}
          isLoading={false}
          onCreateAnnouncement={onCreateMock}
          onDeleteAnnouncement={onDeleteMock}
        />
      );

      // Verify the announcement title is rendered
      expect(screen.getByText("Scheduled Maintenance Notice")).toBeInTheDocument();

      // Click delete trash icon
      const deleteBtn = screen.getByRole("button", { name: /Delete announcement: Scheduled Maintenance Notice/i });
      fireEvent.click(deleteBtn);

      // Confirmation dialog must appear
      expect(screen.getByRole("heading", { name: /Delete Announcement/i })).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to permanently delete this broadcast announcement/i)).toBeInTheDocument();

      // onDeleteMock should NOT have been called yet
      expect(onDeleteMock).not.toHaveBeenCalled();

      // Confirm deletion in modal
      const confirmBtn = screen.getByRole("button", { name: /Confirm Deletion/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(onDeleteMock).toHaveBeenCalledWith("ann-1");
      });
    });
  });

  describe("UserManagementTable self-action protection", () => {
    const mockUsers: AdminUserListItem[] = [
      {
        id: "current-admin-uuid",
        email: "currentadmin@lakshya.ai",
        full_name: "Current Admin",
        role: "super_admin",
        is_suspended: false,
        is_active: true,
        target_role: "Engineering Lead",
        readiness_score: 95,
        resumes_count: 2,
        interviews_count: 5,
        applications_count: 8,
        created_at: "2026-10-01T00:00:00Z",
      },
      {
        id: "candidate-uuid-1",
        email: "candidate1@example.com",
        full_name: "Test Candidate",
        role: "user",
        is_suspended: false,
        is_active: true,
        target_role: "Frontend Engineer",
        readiness_score: 80,
        resumes_count: 1,
        interviews_count: 2,
        applications_count: 4,
        created_at: "2026-10-15T00:00:00Z",
      },
    ];

    it("disables bulk selection checkbox for current administrator's account", () => {
      renderWithProviders(
        <UserManagementTable
          users={mockUsers}
          isLoading={false}
          page={1}
          totalPages={1}
          onPageChange={vi.fn()}
          searchQuery=""
          onSearchChange={vi.fn()}
          roleFilter="all"
          onRoleFilterChange={vi.fn()}
          statusFilter="all"
          onStatusFilterChange={vi.fn()}
          onSelectUser={vi.fn()}
          onSuspendUser={vi.fn()}
          onActivateUser={vi.fn()}
          onBulkStatusUpdate={vi.fn()}
        />
      );

      // Candidate checkbox should be enabled
      const candidateCheckbox = screen.getByLabelText(/Select Test Candidate/i);
      expect(candidateCheckbox).not.toBeDisabled();

      // Super admin / current admin checkbox is disabled
      const currentAdminRow = screen.getByText("currentadmin@lakshya.ai").closest("tr");
      expect(currentAdminRow).not.toBeNull();
      const disabledCheckbox = currentAdminRow?.querySelector("button[disabled]");
      expect(disabledCheckbox).not.toBeNull();
    });
  });
});
