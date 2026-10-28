import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Cpu,
  Zap,
  CheckCircle2,
  Clock,
  Activity,
  Shield,
  RefreshCw,
  AlertTriangle,
  Server,
  Layers,
  DollarSign,
  Coins,
  Info,
} from "lucide-react";
import { adminService } from "@/services/adminService";
import { queryKeys } from "@/lib/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AIModelBreakdownItem, AIPricingAssumptions } from "@/types";

/**
 * Normalizes breakdown_by_model into a clean array regardless of whether the API
 * returns an object/dictionary keyed by model name or an array.
 * Preserves model names, providers, token sums, costs, and pricing status.
 */
export function normalizeModelBreakdown(
  raw: Record<string, AIModelBreakdownItem> | AIModelBreakdownItem[] | null | undefined
): AIModelBreakdownItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((item) => ({
      ...item,
      requests: item.requests ?? item.request_count ?? 0,
      is_priced: item.is_priced ?? item.pricing_available ?? false,
    }));
  }
  return Object.entries(raw).map(([key, item]) => ({
    ...item,
    model_name: item.model_name || key,
    requests: item.requests ?? item.request_count ?? 0,
    is_priced: item.is_priced ?? item.pricing_available ?? false,
  }));
}

/**
 * Normalizes pricing_assumptions into a clean array of displayable note strings
 * regardless of whether the API returns a structured dictionary (basis, rates, disclaimer)
 * or a preformatted string array.
 */
export function normalizePricingAssumptions(
  raw: AIPricingAssumptions | string[] | null | undefined
): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter((s): s is string => typeof s === "string" && s.trim().length > 0);
  }
  const notes: string[] = [];
  if (raw.calculation_basis) {
    notes.push(`Basis: ${raw.calculation_basis}`);
  }
  if (raw.rates && typeof raw.rates === "object") {
    for (const [model, info] of Object.entries(raw.rates)) {
      const prov = info.provider ? info.provider.toUpperCase() : "LLM";
      notes.push(
        `Catalog rate for ${prov} (${model}): $${info.input_per_million}/1M input, $${info.output_per_million}/1M output`
      );
    }
  }
  if (raw.disclaimer) {
    notes.push(raw.disclaimer);
  }
  return notes;
}

export function AdminAIPage() {
  const [timeRange, setTimeRange] = useState<"all" | "today" | "7d" | "30d" | "90d">("all");

  const {
    data: ai,
    isLoading: isAILoading,
    isFetching: isAIFetching,
    dataUpdatedAt: aiUpdatedAt,
    refetch: refetchAI,
  } = useQuery({
    queryKey: [...queryKeys.admin.aiMetrics, timeRange],
    queryFn: () => adminService.getAIMetrics(timeRange),
  });

  const {
    data: health,
    isLoading: isHealthLoading,
    refetch: refetchHealth,
  } = useQuery({
    queryKey: queryKeys.admin.systemHealth,
    queryFn: () => adminService.getSystemHealth(),
  });

  const handleRefreshAll = () => {
    refetchAI();
    refetchHealth();
  };

  const isRefreshing = isAIFetching;
  const isLoading = isAILoading || isHealthLoading;

  // Format data updated timestamp
  const lastUpdated = aiUpdatedAt
    ? new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date(aiUpdatedAt))
    : null;

  // Real AI service health evaluation from live backend health check
  const aiServiceStatus = health?.services?.ai_service || (health?.status === "healthy" ? "healthy" : "unknown");

  // Normalize model breakdown and pricing assumptions to handle both backend
  // dictionary responses and test array mocks without throwing runtime errors
  const modelBreakdownList = normalizeModelBreakdown(ai?.breakdown_by_model);
  const pricingNotes = normalizePricingAssumptions(ai?.pricing_assumptions);

  return (
    <div className="flex flex-col gap-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            AI Inference & Telemetry Metrics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor LLM token usage, response latency, inference success rates, and module distribution.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Time Range Filter Bar */}
          <div className="inline-flex items-center rounded-xl border border-border/60 bg-muted/40 p-1 text-xs" role="group" aria-label="Time range selector">
            {(
              [
                { id: "all", label: "All Time" },
                { id: "today", label: "Today" },
                { id: "7d", label: "7 Days" },
                { id: "30d", label: "30 Days" },
                { id: "90d", label: "90 Days" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTimeRange(opt.id)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  timeRange === opt.id
                    ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
                title={`Filter telemetry by ${opt.label}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {lastUpdated && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
              <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
              <span>Updated: {lastUpdated}</span>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className="h-9 px-3 text-xs gap-1.5 border-border/60"
            title="Refresh AI telemetry metrics"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inferences */}
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Inferences</span>
            <Cpu className="h-4 w-4 text-primary" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-foreground mt-2 block font-mono">
            {isLoading ? "--" : (ai?.total_requests ?? 0).toLocaleString()}
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Across all AI pipelines
          </span>
        </div>

        {/* Success Rate */}
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Success Rate</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-emerald-500 mt-2 block font-mono">
            {isLoading ? "--" : `${ai?.success_rate ?? 0}%`}
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            {ai?.failed_requests && ai.failed_requests > 0 ? (
              <span className="text-rose-400 font-semibold">{ai.failed_requests} recorded failures</span>
            ) : (
              "0 pipeline crashes"
            )}
          </span>
        </div>

        {/* Average Latency */}
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Average Latency</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-foreground mt-2 block font-mono">
            {isLoading
              ? "--"
              : ai?.average_response_time_ms != null
              ? `${Math.round(ai.average_response_time_ms)}ms`
              : "Not yet instrumented"}
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            {ai?.sample_size && ai.sample_size > 0
              ? `${ai.sample_size} recorded duration samples`
              : "Awaiting telemetry stream"}
          </span>
        </div>

        {/* Model & Service Status */}
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Model Status</span>
            <Activity
              className={`h-4 w-4 ${
                aiServiceStatus === "healthy"
                  ? "text-emerald-500"
                  : aiServiceStatus === "degraded"
                  ? "text-amber-500"
                  : "text-rose-500"
              }`}
            />
          </div>
          <span
            className={`text-2xl sm:text-3xl font-black mt-2 block ${
              aiServiceStatus === "healthy"
                ? "text-emerald-500"
                : aiServiceStatus === "degraded"
                ? "text-amber-400"
                : "text-rose-500"
            }`}
          >
            {aiServiceStatus === "healthy"
              ? "Operational"
              : aiServiceStatus === "degraded"
              ? "Degraded"
              : "Disrupted"}
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            {aiServiceStatus === "healthy"
              ? "Multi-modal pipelines healthy"
              : "Provider latency elevated"}
          </span>
        </div>
      </div>

      {/* AI Token Observability & Cost Transparency (Phase 4 Milestone 4.2) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Tokens Consumed */}
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Tokens Consumed</span>
            <Coins className="h-4 w-4 text-purple-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-foreground mt-2 block font-mono">
            {isLoading ? "--" : (ai?.total_tokens ?? 0).toLocaleString()}
          </span>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
            <span>Prompt: <strong className="text-foreground font-mono">{(ai?.total_prompt_tokens ?? 0).toLocaleString()}</strong></span>
            <span>•</span>
            <span>Completion: <strong className="text-foreground font-mono">{(ai?.total_completion_tokens ?? 0).toLocaleString()}</strong></span>
          </div>
        </div>

        {/* Estimated LLM Cost */}
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Estimated LLM Expenditure</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-emerald-400 mt-2 block font-mono">
            {isLoading ? "--" : `$${(ai?.estimated_cost_usd ?? 0).toFixed(4)}`}
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            {ai?.token_metered_requests && ai.token_metered_requests > 0
              ? `Catalog rates for ${ai.token_metered_requests} metered inferences`
              : "Awaiting token-metered inferences"}
          </span>
        </div>

        {/* Metering Coverage */}
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Token Telemetry Coverage</span>
            <Layers className="h-4 w-4 text-blue-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-foreground mt-2 block font-mono">
            {isLoading
              ? "--"
              : ai?.total_requests && ai.total_requests > 0
              ? `${Math.round(((ai.token_metered_requests ?? 0) / ai.total_requests) * 100)}%`
              : "0%"}
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            {(ai?.token_metered_requests ?? 0)} metered / {(ai?.unmetered_requests ?? 0)} legacy unmetered
          </span>
        </div>
      </div>

      {/* Latency Percentiles & Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-xl">
          <span className="text-xs font-semibold text-muted-foreground block">P50 Latency (Median)</span>
          <span className="text-xl font-black text-foreground mt-1 block font-mono">
            {isLoading
              ? "--"
              : ai?.p50_latency_ms != null
              ? `${Math.round(ai.p50_latency_ms)}ms`
              : "Requires >= 5 samples"}
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">50th percentile duration</span>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-xl">
          <span className="text-xs font-semibold text-muted-foreground block">P95 Latency</span>
          <span className="text-xl font-black text-foreground mt-1 block font-mono">
            {isLoading
              ? "--"
              : ai?.p95_latency_ms != null
              ? `${Math.round(ai.p95_latency_ms)}ms`
              : "Requires >= 5 samples"}
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">95th percentile duration</span>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-xl">
          <span className="text-xs font-semibold text-muted-foreground block">P99 Latency</span>
          <span className="text-xl font-black text-foreground mt-1 block font-mono">
            {isLoading
              ? "--"
              : ai?.p99_latency_ms != null
              ? `${Math.round(ai.p99_latency_ms)}ms`
              : "Requires >= 5 samples"}
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">99th percentile peak</span>
        </div>
      </div>

      {/* Feature Breakdown */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-foreground flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            AI Invocations by Career Module
          </h3>
          <Badge variant="outline" className="text-[10px] font-mono">
            {ai?.telemetry_source === "ai_request_telemetry" ? "Live Telemetry Stream" : "Database Entity Aggregate"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          {isLoading ? (
            <div className="col-span-2 py-8 text-center text-xs text-muted-foreground">
              Loading module breakdown...
            </div>
          ) : !ai?.breakdown_by_feature || Object.keys(ai.breakdown_by_feature).length === 0 ? (
            <div className="col-span-2 py-8 text-center text-xs text-muted-foreground">
              No AI inferences recorded yet. Activity will appear when candidates use Copilot, Resume Optimization, or Voice Interviews.
            </div>
          ) : (
            Object.entries(ai.breakdown_by_feature).map(([key, count]) => {
              const label = key
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase());
              return (
                <div key={key} className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-muted/20">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground">{label}</span>
                    <span className="text-xs text-muted-foreground">Automated inference run</span>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs px-2.5 py-1">
                    {count} {count === 1 ? "run" : "runs"}
                  </Badge>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Provider Distribution */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-foreground flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            Inference Distribution by LLM Provider
          </h3>
          <span className="text-[11px] text-muted-foreground font-mono">Multi-Provider Router</span>
        </div>

        {isLoading ? (
          <div className="py-6 text-center text-xs text-muted-foreground">Loading provider metrics...</div>
        ) : !ai?.breakdown_by_provider || Object.keys(ai.breakdown_by_provider).length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No provider telemetry recorded yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
            {Object.entries(ai.breakdown_by_provider).map(([provider, count]) => (
              <div key={provider} className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-muted/20">
                <span className="text-sm font-bold uppercase tracking-wider text-foreground">{provider}</span>
                <Badge variant="secondary" className="font-mono text-xs">
                  {count} {count === 1 ? "request" : "requests"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Foundation Model Token & Cost Breakdown (Phase 4 Milestone 4.2) */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-foreground flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Foundation Model Token Consumption & Estimated Cost
          </h3>
          <span className="text-[11px] text-muted-foreground font-mono">
            {timeRange === "all" ? "All Time" : `Filter: ${timeRange}`}
          </span>
        </div>

        {isLoading ? (
          <div className="py-6 text-center text-xs text-muted-foreground">Loading model token breakdown...</div>
        ) : modelBreakdownList.length === 0 ? (
          <div className="py-6 flex flex-col items-center justify-center text-center gap-2">
            <Coins className="h-7 w-7 text-muted-foreground/40" />
            <p className="text-xs font-semibold text-foreground">No model-specific telemetry recorded</p>
            <p className="text-[11px] text-muted-foreground max-w-sm">
              Inference requests will be itemized here with prompt and completion token counts and estimated costs once metered calls occur.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground">
                  <th className="pb-2 font-semibold">Model</th>
                  <th className="pb-2 font-semibold">Provider</th>
                  <th className="pb-2 font-semibold text-right">Inferences</th>
                  <th className="pb-2 font-semibold text-right">Prompt Tokens</th>
                  <th className="pb-2 font-semibold text-right">Completion Tokens</th>
                  <th className="pb-2 font-semibold text-right">Total Tokens</th>
                  <th className="pb-2 font-semibold text-right">Estimated Cost (USD)</th>
                  <th className="pb-2 font-semibold text-center">Pricing Status</th>
                </tr>
              </thead>
              <tbody>
                {modelBreakdownList.map((m) => (
                  <tr key={`${m.provider}-${m.model_name}`} className="border-b border-border/20 last:border-b-0">
                    <td className="py-2.5 font-mono text-[11px] font-semibold text-foreground">{m.model_name}</td>
                    <td className="py-2.5">
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {m.provider}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-right font-mono text-muted-foreground">{(m.requests ?? m.request_count ?? 0).toLocaleString()}</td>
                    <td className="py-2.5 text-right font-mono text-muted-foreground">{(m.prompt_tokens ?? 0).toLocaleString()}</td>
                    <td className="py-2.5 text-right font-mono text-muted-foreground">{(m.completion_tokens ?? 0).toLocaleString()}</td>
                    <td className="py-2.5 text-right font-mono font-medium text-foreground">{(m.total_tokens ?? 0).toLocaleString()}</td>
                    <td className="py-2.5 text-right font-mono font-semibold text-emerald-400">
                      ${(m.estimated_cost_usd ?? 0).toFixed(4)}
                    </td>
                    <td className="py-2.5 text-center">
                      {(m.is_priced ?? m.pricing_available) ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold text-[10px]">
                          Catalog Rate
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold text-[10px]" title="Price definition unavailable in catalog">
                          Unpriced
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pricing Assumptions Note */}
        {pricingNotes.length > 0 && (
          <div className="mt-2 p-3 rounded-xl border border-border/40 bg-muted/15 flex items-start gap-2.5 text-[11px] text-muted-foreground">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-foreground">Defensible Pricing Assumptions:</span>
              <ul className="list-disc list-inside space-y-0.5 text-[10.5px]">
                {pricingNotes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Recent Telemetry Errors */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Recent Telemetry Error Diagnostics (Redacted)
          </h3>
          <span className="text-[11px] text-muted-foreground font-mono">Privacy-Preserving Error Log</span>
        </div>

        {isLoading ? (
          <div className="py-6 text-center text-xs text-muted-foreground">Loading error diagnostics...</div>
        ) : !ai?.recent_errors || ai.recent_errors.length === 0 ? (
          <div className="py-6 flex flex-col items-center justify-center text-center gap-2">
            <CheckCircle2 className="h-7 w-7 text-emerald-500/50" />
            <p className="text-xs font-semibold text-foreground">No telemetry errors recorded</p>
            <p className="text-[11px] text-muted-foreground max-w-sm">
              All AI inference pipelines are operating within standard parameters without failure events.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground">
                  <th className="pb-2 font-semibold">Request ID</th>
                  <th className="pb-2 font-semibold">Module</th>
                  <th className="pb-2 font-semibold">Provider / Model</th>
                  <th className="pb-2 font-semibold">Sanitized Error</th>
                  <th className="pb-2 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {ai.recent_errors.map((err) => (
                  <tr key={err.request_id} className="border-b border-border/20 last:border-b-0">
                    <td className="py-2.5 font-mono text-[11px] text-muted-foreground">{err.request_id.slice(0, 8)}...</td>
                    <td className="py-2.5 font-medium text-foreground">{err.feature_type}</td>
                    <td className="py-2.5 text-muted-foreground">{err.provider} ({err.model_name})</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 font-semibold text-[10px]">
                        {err.error_category}
                      </span>
                    </td>
                    <td className="py-2.5 text-muted-foreground">{err.timestamp ? new Date(err.timestamp).toLocaleTimeString() : "--"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
