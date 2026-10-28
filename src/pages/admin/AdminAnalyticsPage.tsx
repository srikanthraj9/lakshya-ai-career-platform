import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  TrendingUp,
  Users,
  Briefcase,
  Layers,
  Award,
  ArrowUpRight,
  RefreshCw,
  Building2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Download,
} from "lucide-react";
import { adminService } from "@/services/adminService";
import { queryKeys } from "@/lib/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function AdminAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">("30d");

  const {
    data: analytics,
    isLoading,
    isFetching,
    isError,
    dataUpdatedAt,
    refetch,
  } = useQuery({
    queryKey: queryKeys.admin.analytics,
    queryFn: () => adminService.getPlatformAnalytics(),
  });

  const handleExportReport = () => {
    if (!analytics) return;
    const payload = {
      exported_at: new Date().toISOString(),
      time_range: timeRange,
      platform_metrics: analytics,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lakshya_analytics_report_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Calculate maximum feature run count for proportional scaling
  const featureCounts = analytics?.feature_usage ? Object.values(analytics.feature_usage) : [];
  const maxFeatureCount = featureCounts.length > 0 ? Math.max(...featureCounts, 1) : 1;
  const totalInvocations = featureCounts.reduce((acc, curr) => acc + curr, 0);

  // Total applications across all pipeline stages
  const appStageCounts = analytics?.applications_by_stage ? Object.values(analytics.applications_by_stage) : [];
  const totalTrackedApplications = appStageCounts.reduce((acc, curr) => acc + curr, 0);

  // Format data updated timestamp
  const lastUpdated = dataUpdatedAt
    ? new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date(dataUpdatedAt))
    : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header with Refresh Control */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Platform Analytics & Outcome Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Candidate growth cohorts, feature engagement distribution, hiring conversion funnels, and aggregate skill demand.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Time Range Filter Buttons */}
          <div className="flex items-center rounded-xl border border-border/60 bg-card/60 p-1 text-xs">
            {(["7d", "30d", "90d", "all"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setTimeRange(r)}
                className={`rounded-lg px-2.5 py-1 font-medium transition-all ${
                  timeRange === r
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r === "7d" ? "7D" : r === "30d" ? "30D" : r === "90d" ? "90D" : "All Time"}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportReport}
            disabled={!analytics || isLoading}
            className="h-9 px-3 text-xs gap-1.5 border-border/60 rounded-xl"
            title="Export platform analytics report as JSON"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Export</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 px-3 text-xs gap-1.5 border-border/60 rounded-xl"
            title="Refresh analytics data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-primary" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* API Failure State */}
      {isError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 flex items-center justify-between gap-3 text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">Failed to load platform analytics. Please try again.</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Cohort Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-xl">
          <span className="text-xs text-muted-foreground uppercase font-semibold">Daily Active (DAU)</span>
          <p className="text-2xl sm:text-3xl font-black text-foreground mt-2">
            {isLoading ? "--" : analytics?.daily_active_users ?? 0}
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block">Active today</span>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-xl">
          <span className="text-xs text-muted-foreground uppercase font-semibold">Weekly Active (WAU)</span>
          <p className="text-2xl sm:text-3xl font-black text-foreground mt-2">
            {isLoading ? "--" : analytics?.weekly_active_users ?? 0}
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block">7-day active candidates</span>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-xl">
          <span className="text-xs text-muted-foreground uppercase font-semibold">Monthly Active (MAU)</span>
          <p className="text-2xl sm:text-3xl font-black text-foreground mt-2">
            {isLoading ? "--" : analytics?.monthly_active_users ?? 0}
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block">30-day active candidates</span>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-xl">
          <span className="text-xs text-muted-foreground uppercase font-semibold">Retention Rate</span>
          <p className="text-2xl sm:text-3xl font-black text-primary mt-2">
            {isLoading ? "--" : `${analytics?.retention_rate ?? 0}%`}
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block">Active cohort retention</span>
        </div>
      </div>

      {/* Feature Usage & Application Conversion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workspace Feature Usage Distribution */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Workspace Engagement Distribution
            </h3>
            <Badge variant="outline" className="text-[10px] font-mono">
              {totalInvocations.toLocaleString()} Total Invocations
            </Badge>
          </div>

          <div className="flex flex-col gap-3.5 mt-2">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Loading feature activity...</div>
            ) : !analytics?.feature_usage || Object.keys(analytics.feature_usage).length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No workspace feature activity recorded yet.
              </div>
            ) : (
              Object.entries(analytics.feature_usage).map(([key, count]) => {
                const label = key
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase());

                // Mathematical scale:
                // Zero is strictly 0% width.
                // Nonzero is scaled proportionately to the highest-activity feature (0 to 100%).
                const barWidth = count === 0 ? 0 : Math.min(100, Math.max(0, (count / maxFeatureCount) * 100));
                const sharePercent = totalInvocations > 0 ? ((count / totalInvocations) * 100).toFixed(1) : "0.0";

                return (
                  <div key={key} className="flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between items-center font-medium">
                      <span className="text-foreground">{label}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-xs ${count === 0 ? "text-muted-foreground" : "font-bold text-foreground"}`}>
                          {count} {count === 1 ? "run" : "runs"}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ({sharePercent}%)
                        </span>
                      </div>
                    </div>

                    <div
                      className="h-2 w-full rounded-full bg-secondary/80 overflow-hidden"
                      role="progressbar"
                      aria-valuenow={count}
                      aria-valuemin={0}
                      aria-valuemax={maxFeatureCount}
                      aria-label={`${label}: ${count} runs (${sharePercent}% of feature activity)`}
                    >
                      {count > 0 ? (
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      ) : (
                        <div className="h-full w-0" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Application Pipeline Conversion */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-amber-500" />
              Application Pipeline & Conversion Rates
            </h3>
            <div className="flex gap-2">
              <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px]">
                {analytics?.interview_conversion_rate ?? 0}% Interview Rate
              </Badge>
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 text-[10px]">
                {analytics?.offer_conversion_rate ?? 0}% Offer Rate
              </Badge>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-2">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Loading pipeline data...</div>
            ) : totalTrackedApplications === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-center gap-2">
                <Briefcase className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-xs font-semibold text-foreground">No job applications tracked yet</p>
                <p className="text-[11px] text-muted-foreground max-w-xs">
                  Pipeline stages and hiring conversion rates will automatically calculate as candidates add applications.
                </p>
              </div>
            ) : (
              analytics?.applications_by_stage &&
              Object.entries(analytics.applications_by_stage).map(([stage, count]) => {
                const stagePercent = totalTrackedApplications > 0 ? Math.round((count / totalTrackedApplications) * 100) : 0;
                return (
                  <div key={stage} className="flex flex-col gap-1 py-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="capitalize font-semibold text-foreground">{stage}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-muted-foreground">({stagePercent}%)</span>
                        <Badge variant="outline" className="font-bold font-mono">
                          {count}
                        </Badge>
                      </div>
                    </div>
                    <div
                      className="h-1.5 w-full rounded-full bg-secondary/80 overflow-hidden"
                      role="progressbar"
                      aria-valuenow={count}
                      aria-valuemin={0}
                      aria-valuemax={totalTrackedApplications}
                      aria-label={`${stage}: ${count} applications (${stagePercent}%)`}
                    >
                      {count > 0 && (
                        <div
                          className="h-full bg-amber-500/70 rounded-full transition-all duration-500"
                          style={{ width: `${stagePercent}%` }}
                        />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Top Skill Gaps & Popular Roles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Detected Skill Gaps */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              Top Detected Skill Gaps Across Platform
            </h3>
            <span className="text-[11px] text-muted-foreground font-mono">Resume Diagnostics</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {isLoading ? (
              <div className="py-6 text-center text-xs text-muted-foreground">Analyzing skill benchmarks...</div>
            ) : !analytics?.top_skill_gaps || analytics.top_skill_gaps.length === 0 ? (
              <div className="py-6 flex flex-col items-center justify-center text-center gap-2">
                <CheckCircle2 className="h-7 w-7 text-emerald-500/50" />
                <p className="text-xs font-semibold text-foreground">No skill gaps detected yet</p>
                <p className="text-[11px] text-muted-foreground max-w-xs">
                  Analyzed candidate resumes have met baseline competencies, or candidates have not yet uploaded resumes targeting competitive roles.
                </p>
                <span className="text-[10px] text-primary mt-1 font-medium">
                  Next Step: Candidates upload targeted job descriptions in Resume Studio
                </span>
              </div>
            ) : (
              analytics.top_skill_gaps.map((gap, i) => (
                <div key={gap.skill} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-b-0">
                  <span className="text-foreground">
                    <strong className="text-primary font-bold mr-2">#{i + 1}</strong>
                    {gap.skill}
                  </span>
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {gap.frequency} {gap.frequency === 1 ? "candidate" : "candidates"}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Most Popular Target Roles */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Most Popular Target Roles
            </h3>
            <span className="text-[11px] text-muted-foreground font-mono">Candidate Profiles</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {isLoading ? (
              <div className="py-6 text-center text-xs text-muted-foreground">Loading role data...</div>
            ) : !analytics?.top_target_roles || analytics.top_target_roles.length === 0 ? (
              <div className="py-6 flex flex-col items-center justify-center text-center gap-2">
                <Users className="h-7 w-7 text-muted-foreground/40" />
                <p className="text-xs font-semibold text-foreground">No target roles configured</p>
                <p className="text-[11px] text-muted-foreground max-w-xs">
                  Candidates have not yet specified their desired career titles in their profiles.
                </p>
                <span className="text-[10px] text-primary mt-1 font-medium">
                  Next Step: Candidates select target roles during Onboarding or in Profile Settings
                </span>
              </div>
            ) : (
              analytics.top_target_roles.map((r, i) => (
                <div key={r.role} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-b-0">
                  <span className="text-foreground">
                    <strong className="text-primary font-bold mr-2">#{i + 1}</strong>
                    {r.role}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {r.count} {r.count === 1 ? "candidate" : "candidates"}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Top Tracked Companies */}
      {analytics?.top_companies && analytics.top_companies.length > 0 && (
        <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Top Tracked Target Companies
            </h3>
            <span className="text-[11px] text-muted-foreground font-mono">Application Tracker</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {analytics.top_companies.map((comp, i) => (
              <div key={comp.company} className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-muted/20 text-xs">
                <span className="font-medium text-foreground">
                  <strong className="text-primary font-bold mr-2">#{i + 1}</strong>
                  {comp.company}
                </span>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {comp.applications} {comp.applications === 1 ? "app" : "apps"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
