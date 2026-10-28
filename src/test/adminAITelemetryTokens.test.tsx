import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminAIPage, normalizeModelBreakdown, normalizePricingAssumptions } from "@/pages/admin/AdminAIPage";
import { adminService } from "@/services/adminService";
import type { AIUsageStats, SystemHealthResponse } from "@/types";

vi.mock("@/services/adminService", () => ({
  adminService: {
    getAIMetrics: vi.fn(),
    getSystemHealth: vi.fn(),
  },
}));

const mockSystemHealth: SystemHealthResponse = {
  status: "healthy",
  timestamp: "2026-10-27T12:00:00Z",
  database: "connected",
  cache: "operational",
  services: {
    auth_service: "healthy",
    database: "healthy",
    ai_service: "healthy",
  },
};

// Array-based mock (legacy/backward compatibility)
const mockAIMetricsArray: AIUsageStats = {
  total_requests: 120,
  success_rate: 98.3,
  average_response_time_ms: 1240,
  failed_requests: 2,
  sample_size: 120,
  p50_latency_ms: 1100,
  p95_latency_ms: 2200,
  p99_latency_ms: 3100,
  telemetry_source: "ai_request_telemetry",
  breakdown_by_feature: {
    resume_optimization: 70,
    interview_coach: 50,
  },
  breakdown_by_provider: {
    groq: 80,
    openai: 40,
  },
  recent_errors: [],

  // Phase 4 Milestone 4.2
  total_prompt_tokens: 150000,
  total_completion_tokens: 50000,
  total_tokens: 200000,
  token_metered_requests: 100,
  unmetered_requests: 20,
  estimated_cost_usd: 0.1280,
  breakdown_by_model: [
    {
      model_name: "llama-3.3-70b-versatile",
      provider: "groq",
      request_count: 80,
      prompt_tokens: 100000,
      completion_tokens: 30000,
      total_tokens: 130000,
      estimated_cost_usd: 0.0827,
      pricing_available: true,
    },
    {
      model_name: "gpt-4o-mini",
      provider: "openai",
      request_count: 20,
      prompt_tokens: 50000,
      completion_tokens: 20000,
      total_tokens: 70000,
      estimated_cost_usd: 0.0195,
      pricing_available: true,
    },
    {
      model_name: "custom-unpriced-model",
      provider: "internal",
      request_count: 20,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      estimated_cost_usd: 0.0,
      pricing_available: false,
    },
  ],
  pricing_assumptions: [
    "Catalog pricing per 1M tokens: Groq llama-3.3-70b-versatile ($0.59 input / $0.79 output)",
    "Catalog pricing per 1M tokens: OpenAI gpt-4o-mini ($0.15 input / $0.60 output)",
    "Pre-instrumentation historical requests are tracked as unmetered.",
  ],
  time_range: "all",
};

// Live backend dictionary/object response shape
const mockAIMetricsDictionary: AIUsageStats = {
  total_requests: 120,
  success_rate: 98.3,
  average_response_time_ms: 1240,
  failed_requests: 2,
  sample_size: 120,
  p50_latency_ms: 1100,
  p95_latency_ms: 2200,
  p99_latency_ms: 3100,
  telemetry_source: "ai_request_telemetry",
  breakdown_by_feature: {
    resume_optimization: 70,
    interview_coach: 50,
  },
  breakdown_by_provider: {
    groq: 80,
    openai: 40,
  },
  recent_errors: [],

  total_prompt_tokens: 150000,
  total_completion_tokens: 50000,
  total_tokens: 200000,
  token_metered_requests: 100,
  unmetered_requests: 20,
  estimated_cost_usd: 0.1280,
  breakdown_by_model: {
    "llama-3.3-70b-versatile": {
      model_name: "llama-3.3-70b-versatile",
      provider: "groq",
      requests: 80,
      prompt_tokens: 100000,
      completion_tokens: 30000,
      total_tokens: 130000,
      estimated_cost_usd: 0.0827,
      is_priced: true,
    },
    "gpt-4o-mini": {
      model_name: "gpt-4o-mini",
      provider: "openai",
      requests: 20,
      prompt_tokens: 50000,
      completion_tokens: 20000,
      total_tokens: 70000,
      estimated_cost_usd: 0.0195,
      is_priced: true,
    },
    "custom-unpriced-model": {
      model_name: "custom-unpriced-model",
      provider: "internal",
      requests: 20,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      estimated_cost_usd: 0.0,
      is_priced: false,
    },
  },
  pricing_assumptions: {
    currency: "USD",
    calculation_basis: "Published provider list rates per 1,000,000 input/output tokens",
    rates: {
      "llama-3.3-70b-versatile": {
        input_per_million: 0.59,
        output_per_million: 0.79,
        provider: "groq",
      },
      "gpt-4o-mini": {
        input_per_million: 0.15,
        output_per_million: 0.60,
        provider: "openai",
      },
    },
    disclaimer: "Cost estimations are mathematical approximations based on measured token usage and standard public rates.",
  },
  time_range: "all",
};

function renderAIPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AdminAIPage />
    </QueryClientProvider>
  );
}

describe("AI Token Observability & Cost Transparency (Milestone 4.2 - Remediation ISSUE-M42-1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminService.getSystemHealth).mockResolvedValue(mockSystemHealth);
  });

  describe("Normalization Helpers Unit Tests", () => {
    it("normalizeModelBreakdown handles null, undefined, and empty objects safely", () => {
      expect(normalizeModelBreakdown(null)).toEqual([]);
      expect(normalizeModelBreakdown(undefined)).toEqual([]);
      expect(normalizeModelBreakdown({})).toEqual([]);
    });

    it("normalizeModelBreakdown converts a dictionary to an array and infers key if model_name missing", () => {
      const dictInput = {
        "claude-3-5-sonnet": {
          provider: "anthropic",
          requests: 15,
          prompt_tokens: 1000,
          completion_tokens: 500,
          total_tokens: 1500,
          estimated_cost_usd: 0.015,
          is_priced: true,
        },
      };
      const result = normalizeModelBreakdown(dictInput as any);
      expect(result).toHaveLength(1);
      expect(result[0].model_name).toBe("claude-3-5-sonnet");
      expect(result[0].requests).toBe(15);
      expect(result[0].is_priced).toBe(true);
    });

    it("normalizeModelBreakdown handles array input and preserves request_count / pricing_available fallbacks", () => {
      const arrayInput = [
        {
          model_name: "test-model",
          provider: "test-provider",
          request_count: 42,
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
          estimated_cost_usd: 0.001,
          pricing_available: true,
        },
      ];
      const result = normalizeModelBreakdown(arrayInput as any);
      expect(result).toHaveLength(1);
      expect(result[0].requests).toBe(42);
      expect(result[0].is_priced).toBe(true);
    });

    it("normalizePricingAssumptions handles null, undefined, and empty structures safely", () => {
      expect(normalizePricingAssumptions(null)).toEqual([]);
      expect(normalizePricingAssumptions(undefined)).toEqual([]);
      expect(normalizePricingAssumptions({})).toEqual([]);
      expect(normalizePricingAssumptions([])).toEqual([]);
    });

    it("normalizePricingAssumptions formats structured backend dictionary into notes", () => {
      const structuredAssumptions = {
        currency: "USD",
        calculation_basis: "Published provider rates",
        rates: {
          "gpt-4o": {
            input_per_million: 2.5,
            output_per_million: 10.0,
            provider: "openai",
          },
        },
        disclaimer: "Approximations based on public rates.",
      };
      const notes = normalizePricingAssumptions(structuredAssumptions);
      expect(notes).toHaveLength(3);
      expect(notes[0]).toBe("Basis: Published provider rates");
      expect(notes[1]).toContain("Catalog rate for OPENAI (gpt-4o): $2.5/1M input, $10/1M output");
      expect(notes[2]).toBe("Approximations based on public rates.");
    });

    it("normalizePricingAssumptions preserves preformatted string arrays", () => {
      const stringArray = ["Note 1", "Note 2"];
      expect(normalizePricingAssumptions(stringArray)).toEqual(["Note 1", "Note 2"]);
    });
  });

  describe("Integration Tests with Actual Live Backend Dictionary Response Shape", () => {
    it("safely renders live dictionary response without crashes or missing rows", async () => {
      vi.mocked(adminService.getAIMetrics).mockResolvedValue(mockAIMetricsDictionary);

      renderAIPage();

      await waitFor(() => {
        expect(screen.getByText("Foundation Model Token Consumption & Estimated Cost")).toBeInTheDocument();
      });

      // Token totals
      expect(screen.getByText("200,000")).toBeInTheDocument();
      expect(screen.getByText("150,000")).toBeInTheDocument();
      expect(screen.getAllByText("50,000").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("$0.1280")).toBeInTheDocument();

      // Models in table from dictionary keys
      expect(screen.getByText("llama-3.3-70b-versatile")).toBeInTheDocument();
      expect(screen.getByText("gpt-4o-mini")).toBeInTheDocument();
      expect(screen.getByText("custom-unpriced-model")).toBeInTheDocument();

      // Model tokens & costs
      expect(screen.getByText("130,000")).toBeInTheDocument();
      expect(screen.getByText("$0.0827")).toBeInTheDocument();
      expect(screen.getByText("70,000")).toBeInTheDocument();
      expect(screen.getByText("$0.0195")).toBeInTheDocument();

      // Badges
      expect(screen.getAllByText("Catalog Rate").length).toBe(2);
      expect(screen.getByText("Unpriced")).toBeInTheDocument();

      // Formatted pricing notes from dictionary
      expect(screen.getByText("Defensible Pricing Assumptions:")).toBeInTheDocument();
      expect(
        screen.getByText(/Basis: Published provider list rates per 1,000,000 input\/output tokens/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Catalog rate for GROQ \(llama-3.3-70b-versatile\): \$0.59\/1M input, \$0.79\/1M output/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Cost estimations are mathematical approximations/i)
      ).toBeInTheDocument();
    });
  });

  describe("Integration Tests with Array Response Shape (Backward Compatibility)", () => {
    it("1. Renders token metrics (Prompt, Completion, Total) and Estimated Cost in USD", async () => {
      vi.mocked(adminService.getAIMetrics).mockResolvedValue(mockAIMetricsArray);

      renderAIPage();

      await waitFor(() => {
        expect(screen.getByText("Total Tokens Consumed")).toBeInTheDocument();
      });

      expect(screen.getByText("200,000")).toBeInTheDocument();
      expect(screen.getByText("150,000")).toBeInTheDocument(); // prompt tokens
      expect(screen.getAllByText("50,000").length).toBeGreaterThanOrEqual(1); // completion tokens
      expect(screen.getByText("$0.1280")).toBeInTheDocument(); // estimated cost
    });

    it("2. Accurately reports telemetry token coverage distinguishing metered vs unmetered requests", async () => {
      vi.mocked(adminService.getAIMetrics).mockResolvedValue(mockAIMetricsArray);

      renderAIPage();

      await waitFor(() => {
        expect(screen.getByText("Token Telemetry Coverage")).toBeInTheDocument();
      });

      // 100 metered out of 120 total = 83%
      expect(screen.getByText("83%")).toBeInTheDocument();
      expect(screen.getByText(/100 metered \/ 20 legacy unmetered/i)).toBeInTheDocument();
    });

    it("3. Renders Foundation Model breakdown table with itemized tokens and pricing statuses", async () => {
      vi.mocked(adminService.getAIMetrics).mockResolvedValue(mockAIMetricsArray);

      renderAIPage();

      await waitFor(() => {
        expect(screen.getByText("Foundation Model Token Consumption & Estimated Cost")).toBeInTheDocument();
      });

      // Check models
      expect(screen.getByText("llama-3.3-70b-versatile")).toBeInTheDocument();
      expect(screen.getByText("gpt-4o-mini")).toBeInTheDocument();
      expect(screen.getByText("custom-unpriced-model")).toBeInTheDocument();

      // Check pricing badges
      expect(screen.getAllByText("Catalog Rate").length).toBe(2);
      expect(screen.getByText("Unpriced")).toBeInTheDocument();
    });

    it("4. Displays defensible pricing assumptions and data transparency notes", async () => {
      vi.mocked(adminService.getAIMetrics).mockResolvedValue(mockAIMetricsArray);

      renderAIPage();

      await waitFor(() => {
        expect(screen.getByText("Defensible Pricing Assumptions:")).toBeInTheDocument();
      });

      expect(
        screen.getByText(/Catalog pricing per 1M tokens: Groq llama-3.3-70b-versatile/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Pre-instrumentation historical requests are tracked as unmetered/i)
      ).toBeInTheDocument();
    });

    it("5. Triggers getAIMetrics query with selected time range filter", async () => {
      vi.mocked(adminService.getAIMetrics).mockResolvedValue(mockAIMetricsArray);

      renderAIPage();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "All Time" })).toBeInTheDocument();
      });

      // Default initial fetch should be "all"
      expect(adminService.getAIMetrics).toHaveBeenCalledWith("all");

      // Click "7 Days" filter
      const sevenDayBtn = screen.getByRole("button", { name: "7 Days" });
      fireEvent.click(sevenDayBtn);

      await waitFor(() => {
        expect(adminService.getAIMetrics).toHaveBeenCalledWith("7d");
      });

      // Click "Today" filter
      const todayBtn = screen.getByRole("button", { name: "Today" });
      fireEvent.click(todayBtn);

      await waitFor(() => {
        expect(adminService.getAIMetrics).toHaveBeenCalledWith("today");
      });
    });

    it("6. Handles empty telemetry data gracefully without NaN or UI crashes", async () => {
      const emptyAIMetrics: AIUsageStats = {
        total_requests: 0,
        success_rate: 100,
        average_response_time_ms: 0,
        failed_requests: 0,
        sample_size: 0,
        breakdown_by_feature: {},
        breakdown_by_provider: {},
        total_prompt_tokens: 0,
        total_completion_tokens: 0,
        total_tokens: 0,
        token_metered_requests: 0,
        unmetered_requests: 0,
        estimated_cost_usd: 0.0,
        breakdown_by_model: {},
        pricing_assumptions: {},
      };
      vi.mocked(adminService.getAIMetrics).mockResolvedValue(emptyAIMetrics);

      renderAIPage();

      await waitFor(() => {
        expect(screen.getByText("Total Tokens Consumed")).toBeInTheDocument();
      });

      expect(screen.getByText("$0.0000")).toBeInTheDocument();
      expect(screen.getByText("0%")).toBeInTheDocument();
      expect(screen.getByText("No model-specific telemetry recorded")).toBeInTheDocument();
    });

    it("7. Handles null / undefined breakdown_by_model and pricing_assumptions safely", async () => {
      const nullFieldsAIMetrics: AIUsageStats = {
        total_requests: 5,
        success_rate: 100,
        breakdown_by_model: null as any,
        pricing_assumptions: null as any,
      };
      vi.mocked(adminService.getAIMetrics).mockResolvedValue(nullFieldsAIMetrics);

      renderAIPage();

      await waitFor(() => {
        expect(screen.getByText("Total Tokens Consumed")).toBeInTheDocument();
      });

      expect(screen.getByText("No model-specific telemetry recorded")).toBeInTheDocument();
      expect(screen.queryByText("Defensible Pricing Assumptions:")).not.toBeInTheDocument();
    });
  });
});
