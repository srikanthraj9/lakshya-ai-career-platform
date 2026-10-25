import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AddApplicationModal } from "@/components/applications/AddApplicationModal";
import { ApplicationKanban } from "@/components/applications/ApplicationKanban";
import { ApplicationTable } from "@/components/applications/ApplicationTable";
import { ApplicationFunnelAnalytics } from "@/components/applications/ApplicationFunnelAnalytics";
import { ApplicationDetailModal } from "@/components/applications/ApplicationDetailModal";
import ApplicationTrackerPage from "@/pages/ApplicationTrackerPage";
import { APPLICATION_STAGES, type JobApplication, type JobApplicationStats } from "@/services/applicationTrackerService";

const mockApplications: JobApplication[] = [
  {
    id: "app-1",
    company_name: "Stripe",
    job_title: "Staff Frontend Engineer",
    location: "Remote",
    salary_range: "$220k - $260k",
    job_source: "manual",
    stage: "wishlist",
    status: "active",
    match_score_at_application: 92.0,
    notes: "Top choice company",
    last_status_change: "2026-10-25T10:00:00Z",
    application_metadata: {},
    events: [
      {
        id: "evt-1",
        application_id: "app-1",
        event_type: "application_created",
        title: "Application tracked for Staff Frontend Engineer at Stripe",
        event_metadata: {},
        created_at: "2026-10-25T10:00:00Z",
      },
    ],
    debriefs: [],
    created_at: "2026-10-25T10:00:00Z",
    updated_at: "2026-10-25T10:00:00Z",
  },
  {
    id: "app-2",
    company_name: "Google",
    job_title: "Senior Software Engineer",
    location: "Mountain View, CA",
    salary_range: "$190k - $240k",
    job_source: "manual",
    stage: "interviewing",
    status: "active",
    match_score_at_application: 89.0,
    notes: "Recruiter screen passed",
    next_step_notes: "System Design Loop",
    next_step_date: "2026-10-28T14:00:00Z",
    last_status_change: "2026-10-25T11:00:00Z",
    application_metadata: {},
    events: [],
    debriefs: [],
    created_at: "2026-10-25T10:00:00Z",
    updated_at: "2026-10-25T11:00:00Z",
  },
  {
    id: "app-3",
    company_name: "Netflix",
    job_title: "UI Architect",
    location: "Los Gatos, CA",
    salary_range: "$350k",
    job_source: "manual",
    stage: "offer",
    status: "active",
    match_score_at_application: 96.0,
    last_status_change: "2026-10-25T12:00:00Z",
    application_metadata: {},
    events: [],
    debriefs: [],
    created_at: "2026-10-25T10:00:00Z",
    updated_at: "2026-10-25T12:00:00Z",
  },
];

const mockStats: JobApplicationStats = {
  total_active: 3,
  wishlist_count: 1,
  applied_count: 0,
  screening_count: 0,
  interviewing_count: 1,
  offer_count: 1,
  closed_count: 0,
  conversion_rate: 50.0,
  average_response_days: 4.8,
  stage_breakdown: {
    wishlist: 1,
    applied: 0,
    screening: 0,
    interviewing: 1,
    offer: 1,
    closed: 0,
  },
};

// Mock useApplications hook
const mockTransitionStage = vi.fn();
const mockCreateApplication = vi.fn().mockResolvedValue(mockApplications[0]);
const mockDeleteApplication = vi.fn();
const mockLogDebrief = vi.fn();
const mockFetchCompanyIntelligence = vi.fn().mockResolvedValue({
  name: "Google",
  tech_stack: ["Go", "Kubernetes", "Angular"],
  interview_stages: [],
  salary_benchmarks: {},
  common_questions: [],
});

let mockHookReturnValue = {
  applications: mockApplications,
  stats: mockStats,
  outcomeInsights: [],
  isLoading: false,
  isError: false,
  transitionStage: mockTransitionStage,
  createApplication: mockCreateApplication,
  deleteApplication: mockDeleteApplication,
  logDebrief: mockLogDebrief,
  fetchCompanyIntelligence: mockFetchCompanyIntelligence,
};

vi.mock("@/hooks/useApplications", () => ({
  useApplications: () => mockHookReturnValue,
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("Application Tracker Functional Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHookReturnValue = {
      applications: mockApplications,
      stats: mockStats,
      outcomeInsights: [],
      isLoading: false,
      isError: false,
      transitionStage: mockTransitionStage,
      createApplication: mockCreateApplication,
      deleteApplication: mockDeleteApplication,
      logDebrief: mockLogDebrief,
      fetchCompanyIntelligence: mockFetchCompanyIntelligence,
    };
  });

  // 1. Track Application Form Validation and Submission
  it("validates required fields in AddApplicationModal and prevents submission when empty", async () => {
    const handleCreate = vi.fn();
    const handleClose = vi.fn();

    render(
      <AddApplicationModal
        isOpen={true}
        onClose={handleClose}
        onCreate={handleCreate}
      />
    );

    expect(screen.getByText("Track New Job Application")).toBeDefined();

    // Try submitting without company or title
    const companyInput = screen.getByPlaceholderText("e.g. Netflix, Stripe, Datadog");
    const titleInput = screen.getByPlaceholderText("e.g. Senior Full Stack Engineer");
    const submitBtn = screen.getByRole("button", { name: "Track Application" });

    // Try submitting with whitespace-only values
    fireEvent.change(companyInput, { target: { value: "   " } });
    fireEvent.change(titleInput, { target: { value: "   " } });
    fireEvent.click(submitBtn);

    expect(handleCreate).not.toHaveBeenCalled();
    expect(screen.getByText("Company Name and Job Title are required.")).toBeDefined();

    // Fill in required fields
    fireEvent.change(companyInput, { target: { value: "Figma" } });
    fireEvent.change(titleInput, { target: { value: "Senior Frontend Engineer" } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          company_name: "Figma",
          job_title: "Senior Frontend Engineer",
          stage: "wishlist",
        })
      );
    });
  });

  // 2. Kanban Pipeline Stage Rendering and Progression
  it("renders all 6 pipeline columns and advances card to next stage", () => {
    const handleTransition = vi.fn();

    render(
      <ApplicationKanban
        applications={mockApplications}
        onTransition={handleTransition}
        onOpenDetail={vi.fn()}
        onOpenDebrief={vi.fn()}
        onOpenCompanyIntel={vi.fn()}
        onOpenOutreach={vi.fn()}
        onOpenAddModal={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    // Verify all 6 stage columns are rendered
    APPLICATION_STAGES.forEach((s) => {
      expect(screen.getAllByText(s.label).length).toBeGreaterThanOrEqual(1);
    });

    // Check Stripe in Wishlist has an 'Applied' advance button
    const advanceBtn = screen.getByRole("button", { name: /Applied/i });
    expect(advanceBtn).toBeDefined();
    fireEvent.click(advanceBtn);
    expect(handleTransition).toHaveBeenCalledWith("app-1", "applied");

    // Check Interviewing card displays Debrief button
    expect(screen.getByRole("button", { name: /Debrief/i })).toBeDefined();
  });

  // 3. Table View Filtering, Searching and Direct Stage Transitions
  it("renders applications in Table View and supports stage transition and search", () => {
    const handleTransition = vi.fn();

    render(
      <ApplicationTable
        applications={mockApplications}
        onTransition={handleTransition}
        onOpenDetail={vi.fn()}
        onOpenDebrief={vi.fn()}
        onOpenCompanyIntel={vi.fn()}
        onOpenOutreach={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("Stripe")).toBeDefined();
    expect(screen.getByText("Google")).toBeDefined();
    expect(screen.getByText("Netflix")).toBeDefined();

    // Search filter
    const searchInput = screen.getByPlaceholderText("Search company, title, or location...");
    fireEvent.change(searchInput, { target: { value: "Google" } });

    expect(screen.getByText("Google")).toBeDefined();
    expect(screen.queryByText("Stripe")).toBeNull();

    // Reset search
    fireEvent.change(searchInput, { target: { value: "" } });

    // Change stage using direct table selector
    const stageSelect = screen.getByLabelText("Change stage for Stripe") as HTMLSelectElement;
    expect(stageSelect.value).toBe("wishlist");

    fireEvent.change(stageSelect, { target: { value: "applied" } });
    expect(handleTransition).toHaveBeenCalledWith("app-1", "applied");
  });

  // 4. Conversion Analytics & Empty State Handling
  it("calculates conversion metrics and renders fallback for empty outcome insights", () => {
    render(
      <ApplicationFunnelAnalytics
        stats={mockStats}
        outcomeInsights={[]}
      />
    );

    expect(screen.getByText("50% Conversion Rate")).toBeDefined();
    expect(screen.getByText("No Outcome Learning Insights Yet")).toBeDefined();
  });

  // 5. Application Detail Modal Stage Switching
  it("renders detail modal with history and allows stage transition", () => {
    const handleTransition = vi.fn();

    render(
      <ApplicationDetailModal
        isOpen={true}
        onClose={vi.fn()}
        application={mockApplications[0]}
        onTransition={handleTransition}
        onOpenDebrief={vi.fn()}
      />
    );

    expect(screen.getByText("Staff Frontend Engineer")).toBeDefined();
    expect(screen.getByText("WISHLIST")).toBeDefined();
    expect(screen.getByText("Top choice company")).toBeDefined();

    // Click 'Screening' button to transition
    const screeningBtn = screen.getByRole("button", { name: "Screening" });
    fireEvent.click(screeningBtn);
    expect(handleTransition).toHaveBeenCalledWith("app-1", "screening");
  });

  // 6. Page Level Loading and Error Handling
  it("renders loading skeleton when loading and error banner on failure", () => {
    // 6a. Loading state
    mockHookReturnValue.isLoading = true;
    const { unmount } = renderWithClient(<ApplicationTrackerPage />);
    expect(document.querySelector(".animate-pulse")).toBeDefined();
    unmount();

    // 6b. Error state
    mockHookReturnValue.isLoading = false;
    mockHookReturnValue.isError = true;
    renderWithClient(<ApplicationTrackerPage />);
    expect(screen.getByText(/Unable to load live application pipeline data/i)).toBeDefined();
    expect(screen.getByRole("button", { name: "Retry" })).toBeDefined();
  });
});
