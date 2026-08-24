import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  TrendingUp,
  Users,
  Briefcase,
  Layers,
  Award,
  ArrowUpRight,
} from "lucide-react";
import { adminService } from "@/services/adminService";
import { queryKeys } from "@/lib/queryKeys";
import { Badge } from "@/components/ui/badge";

export function AdminAnalyticsPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: queryKeys.admin.analytics,
    queryFn: () => adminService.getPlatformAnalytics(),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          Platform Analytics & Outcome Intelligence
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Candidate growth cohorts, feature engagement distribution, hiring conversion funnels, and aggregate skill demand.
        </p>
      </div>

      {/* Cohort Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-xl">
          <span className="text-xs text-muted-foreground uppercase font-semibold">Daily Active (DAU)</span>
          <p className="text-2xl sm:text-3xl font-black text-foreground mt-2">
            {isLoading ? "--" : analytics?.daily_active_users}
          </p>
          <span className="text-[11px] text-emerald-500 font-semibold mt-1 block">Active today</span>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-xl">
          <span className="text-xs text-muted-foreground uppercase font-semibold">Weekly Active (WAU)</span>
          <p className="text-2xl sm:text-3xl font-black text-foreground mt-2">
            {isLoading ? "--" : analytics?.weekly_active_users}
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block">7-day active candidates</span>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-xl">
          <span className="text-xs text-muted-foreground uppercase font-semibold">Monthly Active (MAU)</span>
          <p className="text-2xl sm:text-3xl font-black text-foreground mt-2">
            {isLoading ? "--" : analytics?.monthly_active_users}
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block">30-day active candidates</span>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-xl">
          <span className="text-xs text-muted-foreground uppercase font-semibold">Retention Rate</span>
          <p className="text-2xl sm:text-3xl font-black text-primary mt-2">
            {isLoading ? "--" : `${analytics?.retention_rate}%`}
          </p>
          <span className="text-[11px] text-emerald-500 font-semibold mt-1 block">Active cohort retention</span>
        </div>
      </div>

      {/* Feature Usage & Application Conversion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Usage Counts */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Workspace Engagement Distribution
            </h3>
            <Badge variant="outline" className="text-[10px]">
              Lifetime Invocations
            </Badge>
          </div>

          <div className="flex flex-col gap-3 mt-2">
            {analytics?.feature_usage &&
              Object.entries(analytics.feature_usage).map(([key, count]) => {
                const label = key
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase());
                return (
                  <div key={key} className="flex flex-col gap-1 text-xs">
                    <div className="flex justify-between font-medium">
                      <span className="text-foreground">{label}</span>
                      <span className="font-bold text-muted-foreground">{count} runs</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(8, (count / (analytics.total_users || 1)) * 50))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
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
                {analytics?.interview_conversion_rate}% Interview Rate
              </Badge>
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 text-[10px]">
                {analytics?.offer_conversion_rate}% Offer Rate
              </Badge>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-2">
            {analytics?.applications_by_stage &&
              Object.entries(analytics.applications_by_stage).map(([stage, count]) => (
                <div key={stage} className="flex items-center justify-between py-1.5 border-b border-border/30 text-xs">
                  <span className="capitalize font-semibold text-foreground">{stage}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-bold">
                      {count}
                    </Badge>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Top Skill Gaps & Popular Roles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/60 p-6">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            Top Detected Skill Gaps Across Platform
          </h3>
          <div className="flex flex-col gap-2.5">
            {analytics?.top_skill_gaps?.map((gap, i) => (
              <div key={gap.skill} className="flex items-center justify-between text-xs">
                <span className="text-foreground">
                  <strong className="text-primary font-bold mr-2">#{i + 1}</strong>
                  {gap.skill}
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {gap.frequency} candidates
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/60 p-6">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Most Popular Target Roles
          </h3>
          <div className="flex flex-col gap-2.5">
            {analytics?.top_target_roles?.map((r, i) => (
              <div key={r.role} className="flex items-center justify-between text-xs">
                <span className="text-foreground">
                  <strong className="text-primary font-bold mr-2">#{i + 1}</strong>
                  {r.role}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {r.count} candidates
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
