import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminAnalyticsPage } from "@/pages/admin/AdminAnalyticsPage";
import { AdminAIPage } from "@/pages/admin/AdminAIPage";
import { adminService } from "@/services/adminService";
import type { PlatformAnalyticsStats, AIUsageStats, SystemHealthResponse } from "@/types";

vi.mock("@/services/adminService", () => ({
  adminService: {
    getPlatformAnalytics: vi.fn(),
    getAIMetrics: vi.fn(),
    getSystemHealth: vi.fn(),
  },
}));

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
      {ui}
    </QueryClientProvider>
  );
}

describe("Admin Analytics & AI Telemetry Precision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AdminAnalyticsPage Accuracy & Zero-State Handling", () => {
    it("1. Renders true 0% width bar for zero count and mathematically scaled width for nonzero", async () => {
      const mockAnalytics: PlatformAnalyticsStats = {
        total_users: 2,
        daily_active_users: 0,
        weekly_active_users: 0,
        monthly_active_users: 0,
        new_users_30d: 2,
        retention_rate: 0.0,
        feature_usage: {
          resume_studio: 10, // Max feature (100% width)
          interview_studio: 5, // Half of max (50% width)
          career_roadmap: 0, // Zero runs (strictly 0% width)
          career_intelligence: 0, // Zero runs (strictly 0% width)
        },
        applications_by_stage: {
          wishlist: 0,
          applied: 0,
          screening: 0,
          interviewing: 0,
          offer: 0,
          rejected: 0,
        },
        interview_conversion_rate: 0.0,
        offer_conversion_rate: 0.0,
        top_skill_gaps: [],
        top_target_roles: [{ role: "Full Stack Developer", count: 1 }],
        top_companies: [],
      };

      vi.mocked(adminService.getPlatformAnalytics).mockResolvedValueOnce(mockAnalytics);

      renderWithClient(<AdminAnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText("Workspace Engagement Distribution")).toBeInTheDocument();
      });

      // Total invocations badge: 10 + 5 + 0 + 0 = 15
      expect(screen.getByText("15 Total Invocations")).toBeInTheDocument();

      // Check progressbars
      const progressBars = screen.getAllByRole("progressbar");

      // Find resume_studio progressbar (10 runs out of 10 max = 100% width, 10/15 = 66.7%)
      const resumeBar = progressBars.find((bar) =>
        bar.getAttribute("aria-label")?.includes("Resume Studio")
      );
      expect(resumeBar).toBeDefined();
      expect(resumeBar?.getAttribute("aria-valuenow")).toBe("10");
      expect(resumeBar?.firstElementChild).toHaveStyle({ width: "100%" });

      // Find interview_studio progressbar (5 runs out of 10 max = 50% width)
      const interviewBar = progressBars.find((bar) =>
        bar.getAttribute("aria-label")?.includes("Interview Studio")
      );
      expect(interviewBar).toBeDefined();
      expect(interviewBar?.getAttribute("aria-valuenow")).toBe("5");
      expect(interviewBar?.firstElementChild).toHaveStyle({ width: "50%" });

      // Find career_roadmap progressbar (0 runs -> strictly 0% width, no fake 8% minimum)
      const roadmapBar = progressBars.find((bar) =>
        bar.getAttribute("aria-label")?.includes("Career Roadmap")
      );
      expect(roadmapBar).toBeDefined();
      expect(roadmapBar?.getAttribute("aria-valuenow")).toBe("0");
      // Inner div must have w-0 and not have a nonzero style width
      expect(roadmapBar?.firstElementChild).toHaveClass("w-0");
      expect(roadmapBar?.firstElementChild).not.toHaveStyle({ width: "8%" });
    });

    it("2. Accurately renders empty states for skill gaps, target roles, and applications", async () => {
      const mockAnalyticsEmpty: PlatformAnalyticsStats = {
        total_users: 0,
        daily_active_users: 0,
        weekly_active_users: 0,
        monthly_active_users: 0,
        new_users_30d: 0,
        retention_rate: 0.0,
        feature_usage: {},
        applications_by_stage: {},
        interview_conversion_rate: 0.0,
        offer_conversion_rate: 0.0,
        top_skill_gaps: [],
        top_target_roles: [],
        top_companies: [],
      };

      vi.mocked(adminService.getPlatformAnalytics).mockResolvedValueOnce(mockAnalyticsEmpty);

      renderWithClient(<AdminAnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText("No skill gaps detected yet")).toBeInTheDocument();
      });

      expect(screen.getByText("No target roles configured")).toBeInTheDocument();
      expect(screen.getByText("No job applications tracked yet")).toBeInTheDocument();
      expect(screen.getByText("No workspace feature activity recorded yet.")).toBeInTheDocument();
    });

    it("3. Displays error state with actionable retry button", async () => {
      vi.mocked(adminService.getPlatformAnalytics).mockRejectedValueOnce(
        new Error("Database connection failure")
      );

      renderWithClient(<AdminAnalyticsPage />);

      await waitFor(() => {
        expect(
          screen.getByText("Failed to load platform analytics. Please try again.")
        ).toBeInTheDocument();
      });

      const retryBtn = screen.getByRole("button", { name: /Retry/i });
      expect(retryBtn).toBeInTheDocument();
    });
  });

  describe("AdminAIPage Live Telemetry & Truthful Metrics", () => {
    it("4. Reflects live health check status and truthful latency percentiles", async () => {
      const mockAIMetrics: AIUsageStats = {
        total_requests: 25,
        successful_requests: 25,
        failed_requests: 0,
        success_rate: 100.0,
        average_response_time_ms: null, // Truthful null (not instrumented)
        p50_latency_ms: null, // Requires >= 5 samples
        p95_latency_ms: null,
        p99_latency_ms: null,
        telemetry_source: "entity_counts_fallback",
        sample_size: 0,
        breakdown_by_feature: {
          copilot_mentorship: 14,
          career_intelligence_engine: 9,
          resume_optimization: 1,
          voice_mock_interview: 1,
        },
        breakdown_by_provider: { groq: 25 },
        recent_errors: [],
      };

      const mockHealth: SystemHealthResponse = {
        status: "healthy",
        services: {
          api: "healthy",
          database: "healthy",
          ai_service: "healthy",
        },
        timestamp: "2026-10-26T12:00:00Z",
      };

      vi.mocked(adminService.getAIMetrics).mockResolvedValueOnce(mockAIMetrics);
      vi.mocked(adminService.getSystemHealth).mockResolvedValueOnce(mockHealth);

      renderWithClient(<AdminAIPage />);

      await waitFor(() => {
        expect(screen.getByText("AI Inference & Telemetry Metrics")).toBeInTheDocument();
      });

      // Operational status from system health
      expect(screen.getByText("Operational")).toBeInTheDocument();
      expect(screen.getByText("Multi-modal pipelines healthy")).toBeInTheDocument();

      // Truthful 0 failures
      expect(screen.getByText("0 pipeline crashes")).toBeInTheDocument();

      // Uninstrumented latency labels
      expect(screen.getByText("Not yet instrumented")).toBeInTheDocument();
      expect(screen.getByText("Awaiting telemetry stream")).toBeInTheDocument();
      expect(screen.getAllByText("Requires >= 5 samples").length).toBe(3);

      // Truthful zero errors card
      expect(screen.getByText("No telemetry errors recorded")).toBeInTheDocument();
    });

    it("5. Honest error representation when pipeline failures occur", async () => {
      const mockAIFailures: AIUsageStats = {
        total_requests: 100,
        successful_requests: 98,
        failed_requests: 2,
        success_rate: 98.0,
        average_response_time_ms: 320.5,
        p50_latency_ms: 280.0,
        p95_latency_ms: 550.0,
        p99_latency_ms: 820.0,
        telemetry_source: "ai_request_telemetry",
        sample_size: 98,
        breakdown_by_feature: { copilot_mentorship: 100 },
        breakdown_by_provider: { groq: 100 },
        recent_errors: [
          {
            request_id: "req-12345678-abcd",
            feature_type: "copilot",
            provider: "groq",
            model_name: "llama-3.3-70b-versatile",
            error_category: "rate_limit_429",
            timestamp: "2026-10-26T12:10:00Z",
          },
        ],
      };

      const mockHealthDegraded: SystemHealthResponse = {
        status: "degraded",
        services: {
          api: "healthy",
          database: "healthy",
          ai_service: "degraded",
        },
        timestamp: "2026-10-26T12:00:00Z",
      };

      vi.mocked(adminService.getAIMetrics).mockResolvedValueOnce(mockAIFailures);
      vi.mocked(adminService.getSystemHealth).mockResolvedValueOnce(mockHealthDegraded);

      renderWithClient(<AdminAIPage />);

      await waitFor(() => {
        expect(screen.getByText("2 recorded failures")).toBeInTheDocument();
      });

      // Degraded status
      expect(screen.getByText("Degraded")).toBeInTheDocument();

      // Sanitized error table
      expect(screen.getByText("rate_limit_429")).toBeInTheDocument();
      expect(screen.getByText("321ms")).toBeInTheDocument();
    });
  });
});
