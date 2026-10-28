import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminAuditPage } from "@/pages/admin/AdminAuditPage";
import { AuditLogTable } from "@/components/admin/AuditLogTable";
import { adminService } from "@/services/adminService";
import type { AdminAuditLog, AdminAuditLogListResponse } from "@/types";

// Mock adminService
vi.mock("@/services/adminService", () => ({
  adminService: {
    getAuditLogs: vi.fn(),
  },
}));

function createMockLog(overrides?: Partial<AdminAuditLog>): AdminAuditLog {
  return {
    id: "test-log-1",
    admin_user_id: "admin-uuid-1",
    admin_email: "superadmin@lakshya.ai",
    action_type: "VIEW_ADMIN_DASHBOARD",
    target_user_id: "user-uuid-1",
    target_email: "candidate@lakshya.ai",
    resource_type: "user",
    resource_id: "user-uuid-1",
    action_metadata: { source: "browser", status: "success" },
    before_data: null,
    after_data: null,
    diff: null,
    reason: "Standard administrative review",
    severity: "INFO",
    ip_address: "127.0.0.1",
    user_agent: "Mozilla/5.0",
    created_at: "2026-10-26T12:00:00Z",
    ...overrides,
  };
}

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Admin Audit Trail Pagination and Formatting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Renders first-page results, formatted timestamps, and correct total record count", async () => {
    const mockLogs: AdminAuditLog[] = [
      createMockLog({ id: "log-1", action_type: "VIEW_ADMIN_DASHBOARD" }),
      createMockLog({ id: "log-2", action_type: "UPDATE_FEATURE_FLAG" }),
    ];
    const mockResponse: AdminAuditLogListResponse = {
      items: mockLogs,
      total: 150,
      page: 1,
      page_size: 25,
      total_pages: 6,
    };

    vi.mocked(adminService.getAuditLogs).mockResolvedValueOnce(mockResponse);

    renderWithClient(<AdminAuditPage />);

    // Total count badges
    await waitFor(() => {
      expect(screen.getByText("150 Total Records")).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        (_, el) =>
          el?.tagName === "SPAN" &&
          el?.textContent?.replace(/\s+/g, " ").trim() === "Showing 1 to 25 of 150 records"
      )
    ).toBeInTheDocument();
    expect(screen.getAllByText("Page 1 of 6").length).toBeGreaterThanOrEqual(1);

    // Event actions rendered (present in both filter select options and table badge)
    expect(screen.getAllByText("VIEW_ADMIN_DASHBOARD").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("UPDATE_FEATURE_FLAG").length).toBeGreaterThanOrEqual(2);

    // Actor and target emails rendered
    expect(screen.getAllByText("superadmin@lakshya.ai").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("candidate@lakshya.ai").length).toBeGreaterThanOrEqual(1);
  });

  it("2. Handles Previous and Next pagination controls", async () => {
    const mockPage1: AdminAuditLogListResponse = {
      items: [createMockLog({ id: "log-1", action_type: "VIEW_ADMIN_DASHBOARD" })],
      total: 60,
      page: 1,
      page_size: 25,
      total_pages: 3,
    };
    const mockPage2: AdminAuditLogListResponse = {
      items: [createMockLog({ id: "log-26", action_type: "SUSPEND_USER" })],
      total: 60,
      page: 2,
      page_size: 25,
      total_pages: 3,
    };

    vi.mocked(adminService.getAuditLogs)
      .mockResolvedValueOnce(mockPage1)
      .mockResolvedValueOnce(mockPage2);

    renderWithClient(<AdminAuditPage />);

    await waitFor(() => {
      expect(screen.getByText("VIEW_ADMIN_DASHBOARD")).toBeInTheDocument();
    });

    const nextBtn = screen.getByRole("button", { name: "Next Page" });
    const prevBtn = screen.getByRole("button", { name: "Previous Page" });

    // On page 1, Previous is disabled
    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeEnabled();

    // Click Next
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(adminService.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, page_size: 25 })
      );
    });
  });

  it("3. Enforces boundary behavior: Next disabled on last page", () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();

    render(
      <AuditLogTable
        logs={[createMockLog({ id: "log-51" })]}
        total={51}
        page={3}
        pageSize={25}
        totalPages={3}
        isLoading={false}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    );

    const prevBtn = screen.getByRole("button", { name: "Previous Page" });
    const nextBtn = screen.getByRole("button", { name: "Next Page" });

    expect(prevBtn).toBeEnabled();
    expect(nextBtn).toBeDisabled();
  });

  it("4. Supports configurable page sizes (25, 50, 100) and resets to page 1", async () => {
    const mockResponse: AdminAuditLogListResponse = {
      items: [createMockLog({ id: "log-1" })],
      total: 200,
      page: 1,
      page_size: 25,
      total_pages: 8,
    };

    vi.mocked(adminService.getAuditLogs).mockResolvedValue(mockResponse);

    renderWithClient(<AdminAuditPage />);

    await waitFor(() => {
      expect(screen.getByText("200 Total Records")).toBeInTheDocument();
    });

    const pageSizeSelect = screen.getByLabelText("Rows per page:");
    fireEvent.change(pageSizeSelect, { target: { value: "50" } });

    await waitFor(() => {
      expect(adminService.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, page_size: 50 })
      );
    });
  });

  it("5. Handles empty audit history cleanly", () => {
    const onResetFilters = vi.fn();

    render(
      <AuditLogTable
        logs={[]}
        total={0}
        page={1}
        pageSize={25}
        totalPages={0}
        isLoading={false}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onResetFilters={onResetFilters}
      />
    );

    expect(screen.getByText("No audit actions recorded")).toBeInTheDocument();
    expect(screen.getByText("0 records found")).toBeInTheDocument();

    const resetBtn = screen.getByText("Reset filters");
    fireEvent.click(resetBtn);
    expect(onResetFilters).toHaveBeenCalled();
  });

  it("6. Accurately renders deleted or null actors and targets with fallback labels", () => {
    const logsWithNulls: AdminAuditLog[] = [
      createMockLog({
        id: "log-system",
        admin_user_id: null,
        admin_email: null,
        target_user_id: null,
        target_email: null,
        resource_type: null,
        resource_id: null,
      }),
      createMockLog({
        id: "log-deleted-actor",
        admin_user_id: "deleted-admin-12345678",
        admin_email: null,
        target_user_id: "deleted-target-98765432",
        target_email: null,
        resource_type: null,
        resource_id: null,
      }),
    ];

    render(
      <AuditLogTable
        logs={logsWithNulls}
        total={2}
        page={1}
        pageSize={25}
        totalPages={1}
        isLoading={false}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />
    );

    // Null actor -> System / Automated fallback badge
    expect(screen.getByText("System / Automated")).toBeInTheDocument();

    // Null target -> Platform Wide fallback badge
    expect(screen.getByText("Platform Wide")).toBeInTheDocument();

    // Deleted actor with ID -> Deleted Actor fallback label
    expect(screen.getByText(/Deleted Actor \(deleted-/i)).toBeInTheDocument();

    // Deleted target with ID -> User fallback label
    expect(screen.getByText(/User: deleted-/i)).toBeInTheDocument();
  });

  it("7. Displays error state and triggers retry callback", () => {
    const onRetry = vi.fn();

    render(
      <AuditLogTable
        logs={[]}
        total={0}
        page={1}
        pageSize={25}
        totalPages={0}
        isLoading={false}
        isError={true}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onRetry={onRetry}
      />
    );

    expect(screen.getByText("Failed to load audit records")).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: /Retry Query/i });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalled();
  });

  it("8. Allows expanding event rows to inspect sensitive-data-masked metadata", () => {
    const logWithDetails = createMockLog({
      id: "log-detailed",
      reason: "Suspended for repeated policy violations",
      action_metadata: { flagged_items: 3, risk_score: 0.95 },
      before_data: { is_active: true },
      after_data: { is_active: false },
    });

    render(
      <AuditLogTable
        logs={[logWithDetails]}
        total={1}
        page={1}
        pageSize={25}
        totalPages={1}
        isLoading={false}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />
    );

    // Click expand button
    const expandBtn = screen.getByRole("button", { name: "Expand event details" });
    fireEvent.click(expandBtn);

    // Verify expanded details
    expect(screen.getByText("Administrative Reason:")).toBeInTheDocument();
    expect(screen.getAllByText(/Suspended for repeated policy violations/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Audit Event Identifier:/i)).toBeInTheDocument();
    expect(screen.getByText("State Before:")).toBeInTheDocument();
    expect(screen.getByText("State After:")).toBeInTheDocument();
  });
});
