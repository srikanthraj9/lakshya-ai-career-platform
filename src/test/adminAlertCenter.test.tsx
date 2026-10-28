import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AdminAlertsPage } from "@/pages/admin/AdminAlertsPage";
import { adminService } from "@/services/adminService";
import type { OperationalAlertListResponse } from "@/types";

vi.mock("@/services/adminService", () => ({
  adminService: {
    getOperationalAlerts: vi.fn(),
    transitionOperationalAlert: vi.fn(),
  },
}));

const mockAlertListResponse: OperationalAlertListResponse = {
  items: [
    {
      id: "health:database:latency_spike",
      alert_type: "SERVICE_DEGRADATION",
      severity: "warning",
      title: "Database Latency Spike Detected",
      description: "PostgreSQL response latency elevated at 1850ms.",
      source_service: "database",
      status: "open",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: { latency_ms: 1850 },
    },
    {
      id: "ai:burst:groq:rate_limit_429",
      alert_type: "AI_PROVIDER_ERROR_BURST",
      severity: "critical",
      title: "Repeated AI Errors: rate_limit_429 (groq)",
      description: "5 AI inference requests failed with 429 quota exhaustion.",
      source_service: "ai_service",
      status: "acknowledged",
      acknowledged_by_admin_email: "superadmin@lakshya.ai",
      acknowledged_at: new Date().toISOString(),
      resolution_notes: "Checking quota with provider",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: { fail_count: 5 },
    },
    {
      id: "gov:audit:sample-id",
      alert_type: "GOVERNANCE_CRITICAL_EVENT",
      severity: "critical",
      title: "Critical Governance Action: BULK_SUSPEND_USER",
      description: "Admin suspended 2 users.",
      source_service: "governance",
      status: "resolved",
      resolved_by_admin_email: "superadmin@lakshya.ai",
      resolved_at: new Date().toISOString(),
      resolution_notes: "Routine security enforcement",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {},
    },
  ],
  total: 3,
  open_count: 1,
  acknowledged_count: 1,
  resolved_count: 1,
  critical_count: 2,
  warning_count: 1,
  info_count: 0,
  last_refreshed_at: new Date().toISOString(),
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe("Intelligent Alert Center (AdminAlertsPage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Renders Alert Center heading, KPI metric counts, and search bar", async () => {
    vi.mocked(adminService.getOperationalAlerts).mockResolvedValue(mockAlertListResponse);

    renderWithClient(<AdminAlertsPage />);

    expect(screen.getByText("Intelligent Alert Center")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search incident title/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Open Incidents")).toBeInTheDocument();
      expect(screen.getByText("Database Latency Spike Detected")).toBeInTheDocument();
      expect(screen.getByText("Repeated AI Errors: rate_limit_429 (groq)")).toBeInTheDocument();
    });
  });

  it("2. Displays correct severity badges and status indicators", async () => {
    vi.mocked(adminService.getOperationalAlerts).mockResolvedValue(mockAlertListResponse);

    renderWithClient(<AdminAlertsPage />);

    await waitFor(() => {
      // Badges
      expect(screen.getByText("Open")).toBeInTheDocument();
      expect(screen.getByText("Acknowledged")).toBeInTheDocument();
      expect(screen.getByText("Resolved")).toBeInTheDocument();
    });
  });

  it("3. Opens Technical Detail modal when clicking Details button", async () => {
    vi.mocked(adminService.getOperationalAlerts).mockResolvedValue(mockAlertListResponse);

    renderWithClient(<AdminAlertsPage />);

    await waitFor(() => {
      expect(screen.getByText("Database Latency Spike Detected")).toBeInTheDocument();
    });

    const detailsButtons = screen.getAllByRole("button", { name: /details/i });
    fireEvent.click(detailsButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Incident Fingerprint:/i)).toBeInTheDocument();
      expect(screen.getByText(/health:database:latency_spike/i)).toBeInTheDocument();
      expect(screen.getByText(/Technical Metadata/i)).toBeInTheDocument();
    });
  });

  it("4. Opens Acknowledge modal and triggers transition mutation", async () => {
    vi.mocked(adminService.getOperationalAlerts).mockResolvedValue(mockAlertListResponse);
    vi.mocked(adminService.transitionOperationalAlert).mockResolvedValue({
      ...mockAlertListResponse.items[0],
      status: "acknowledged",
      resolution_notes: "Investigating spike",
    });

    renderWithClient(<AdminAlertsPage />);

    await waitFor(() => {
      expect(screen.getByText("Database Latency Spike Detected")).toBeInTheDocument();
    });

    const ackButton = screen.getByRole("button", { name: /acknowledge/i });
    fireEvent.click(ackButton);

    await waitFor(() => {
      expect(screen.getByText("Acknowledge Operational Alert")).toBeInTheDocument();
    });

    const notesInput = screen.getByPlaceholderText(/reviewing telemetry spikes/i);
    fireEvent.change(notesInput, { target: { value: "Investigating spike" } });

    const confirmButton = screen.getByRole("button", { name: /acknowledge incident/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(adminService.transitionOperationalAlert).toHaveBeenCalledWith(
        "health:database:latency_spike",
        {
          status: "acknowledged",
          resolution_notes: "Investigating spike",
        }
      );
    });
  });

  it("5. Opens Resolve modal requiring notes and triggers transition mutation", async () => {
    vi.mocked(adminService.getOperationalAlerts).mockResolvedValue(mockAlertListResponse);
    vi.mocked(adminService.transitionOperationalAlert).mockResolvedValue({
      ...mockAlertListResponse.items[0],
      status: "resolved",
      resolution_notes: "Fixed DB pool connection leak",
    });

    renderWithClient(<AdminAlertsPage />);

    await waitFor(() => {
      expect(screen.getByText("Database Latency Spike Detected")).toBeInTheDocument();
    });

    const resolveButtons = screen.getAllByRole("button", { name: /resolve/i });
    fireEvent.click(resolveButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Mark Alert as Resolved")).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole("button", { name: /confirm resolution/i });
    // Button should be disabled until notes are entered
    expect(confirmButton).toBeDisabled();

    const notesInput = screen.getByPlaceholderText(/restarted replica pool/i);
    fireEvent.change(notesInput, { target: { value: "Fixed DB pool connection leak" } });

    expect(confirmButton).not.toBeDisabled();
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(adminService.transitionOperationalAlert).toHaveBeenCalledWith(
        "health:database:latency_spike",
        {
          status: "resolved",
          resolution_notes: "Fixed DB pool connection leak",
        }
      );
    });
  });

  it("6. Displays empty state when zero alerts match", async () => {
    vi.mocked(adminService.getOperationalAlerts).mockResolvedValue({
      items: [],
      total: 0,
      open_count: 0,
      acknowledged_count: 0,
      resolved_count: 0,
      critical_count: 0,
      warning_count: 0,
      info_count: 0,
      last_refreshed_at: new Date().toISOString(),
    });

    renderWithClient(<AdminAlertsPage />);

    await waitFor(() => {
      expect(screen.getByText("All Systems Operational")).toBeInTheDocument();
      expect(screen.getByText(/Zero active incidents detected matching the current filters/i)).toBeInTheDocument();
    });
  });
});
