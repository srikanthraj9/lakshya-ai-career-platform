import React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Award,
  Brain,
  TrendingUp,
  Target,
  BarChart3,
  Calendar,
  Sparkles,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PageTransition } from "@/components/PageTransition";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorFallback } from "@/components/ErrorFallback";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MetricCard } from "@/components/shared/MetricCard";
import { CareerActivityTimeline } from "@/components/activity/CareerActivityTimeline";
import { useAuth } from "@/context/AuthContext";
import { useCareerContext } from "@/hooks/useCareerContext";
import { analyticsService } from "@/services/analytics";
import { queryKeys } from "@/lib/queryKeys";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const { readiness, targetRole, activeResume } = useCareerContext();

  const {
    data: summary,
    isLoading: isSummaryLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.analytics.summary(userId || ""),
    queryFn: analyticsService.getSummary,
    enabled: Boolean(userId),
    retry: 2,
  });

  const { data: atsTrend = [], isLoading: isAtsLoading } = useQuery({
    queryKey: queryKeys.analytics.atsTrend(userId || ""),
    queryFn: analyticsService.getATSTrend,
    enabled: Boolean(userId),
    retry: 2,
  });

  const { data: skillGrowth = [], isLoading: isSkillLoading } = useQuery({
    queryKey: queryKeys.analytics.skillGrowth(userId || ""),
    queryFn: analyticsService.getSkillGrowth,
    enabled: Boolean(userId),
    retry: 2,
  });

  if (isError) {
    return (
      <PageTransition>
        <ErrorFallback
          title="Analytics Unavailable"
          message="Failed to load career analytics data."
          onRetry={() => refetch()}
        />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="glass-card gradient-border relative overflow-hidden rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge variant="ai" dot>
              Career Intelligence Analytics
            </StatusBadge>
            <span className="text-xs text-muted-foreground">• Target: {targetRole}</span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Performance Progression & Skill Trajectory
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Longitudinal telemetry measuring ATS score enhancements, skill inventory growth, and mock interview readiness over time.
          </p>
        </div>

        {/* Top Metric Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Master Career Readiness"
            value={readiness.overallScore}
            suffix="%"
            icon={Award}
            delta={readiness.statusLabel}
            trend="up"
          />
          <MetricCard
            title="Resume ATS Score"
            value={activeResume?.ats_score ?? summary?.ats_score ?? 95}
            suffix="%"
            icon={TrendingUp}
            delta="Verified"
            trend="up"
            delay={0.1}
          />
          <MetricCard
            title="Verified Tech Stack"
            value={activeResume?.skills?.length ?? summary?.skills_count ?? 16}
            suffix=" Skills"
            icon={Brain}
            delta="In Inventory"
            delay={0.2}
          />
          <MetricCard
            title="Target Role Fit"
            value={readiness.roleMatch ?? 86}
            suffix="%"
            icon={Target}
            delta={targetRole}
            delay={0.3}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* ATS Score Progress Trend */}
          <div className="glass-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="font-display text-sm font-bold text-foreground">ATS Score Trend</h3>
              </div>
              <span className="text-[11px] text-muted-foreground">Historical Progression</span>
            </div>

            <div className="h-72 w-full pt-2">
              {isAtsLoading ? (
                <Skeleton className="h-full w-full rounded-2xl" />
              ) : atsTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={atsTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="analyticsPrimaryGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "16px",
                        fontSize: "12px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      fill="url(#analyticsPrimaryGlow)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-2xl border border-dashed border-border/60 text-xs text-muted-foreground">
                  No ATS history recorded yet. Upload a resume to generate trend telemetry.
                </div>
              )}
            </div>
          </div>

          {/* Skill Growth by Category */}
          <div className="glass-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-accent" />
                <h3 className="font-display text-sm font-bold text-foreground">Skill Category Distribution</h3>
              </div>
              <span className="text-[11px] text-muted-foreground">Verified Competencies</span>
            </div>

            <div className="h-72 w-full pt-2">
              {isSkillLoading ? (
                <Skeleton className="h-full w-full rounded-2xl" />
              ) : skillGrowth.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={skillGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis dataKey="skill" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "16px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="hsl(var(--accent))"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-2xl border border-dashed border-border/60 text-xs text-muted-foreground">
                  No skill distribution data available.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Unified Career Activity Timeline */}
        <CareerActivityTimeline maxItems={8} />
      </div>
    </PageTransition>
  );
}
