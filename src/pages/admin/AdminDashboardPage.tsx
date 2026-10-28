import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Users,
  UserPlus,
  FileText,
  Mic,
  Briefcase,
  Cpu,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  Flag,
  Megaphone,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Ban,
  Clock,
  Radio,
  Server,
  AlertTriangle,
} from "lucide-react";
import { adminService } from "@/services/adminService";
import { queryKeys } from "@/lib/queryKeys";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function AdminDashboardPage() {
  const [timeRange, setTimeRange] = useState<"today" | "7d" | "30d" | "all">("all");

  const {
    data: stats,
    isLoading,
    isFetching,
    error,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: queryKeys.admin.dashboard,
    queryFn: () => adminService.getDashboardStats(),
  });

  const {
    data: alertSummary,
    refetch: refetchAlerts,
    isFetching: isFetchingAlerts,
  } = useQuery({
    queryKey: queryKeys.admin.alertsSummary,
    queryFn: () => adminService.getOperationalAlertsSummary(),
    refetchInterval: 15000,
  });

  const handleRefreshAll = () => {
    refetch();
    refetchAlerts();
  };

  const cards = [
    {
      title: "Total Candidates",
      value: stats?.total_candidates ?? stats?.total_users ?? "--",
      icon: Users,
      trend: stats?.total_candidates !== undefined ? `${stats.total_users} total accounts (+${stats?.new_users_today || 0} today)` : `+${stats?.new_users_today || 0} today`,
      color: "text-blue-500 bg-blue-500/10",
      href: "/admin/users?role=user",
    },
    {
      title: "Verified Accounts",
      value: stats?.verified_users ?? "--",
      icon: CheckCircle2,
      trend: "Email Authenticated",
      color: "text-emerald-500 bg-emerald-500/10",
      href: "/admin/users",
    },
    {
      title: "Suspended Accounts",
      value: stats?.suspended_users ?? "--",
      icon: Ban,
      trend: stats?.suspended_users ? `${stats.suspended_users} restricted` : "0 restricted",
      color: "text-amber-500 bg-amber-500/10",
      href: "/admin/users?status=suspended",
    },
    {
      title: "Active Today",
      value: stats?.active_users_today ?? "--",
      icon: Activity,
      trend: "Online Telemetry",
      color: "text-emerald-500 bg-emerald-500/10",
      href: "/admin/users",
    },
    {
      title: "Resumes Analyzed",
      value: stats?.total_resumes ?? "--",
      icon: FileText,
      trend: "ATS Diagnostic Runs",
      color: "text-indigo-500 bg-indigo-500/10",
      href: "/admin/analytics",
    },
    {
      title: "Mock Interviews",
      value: stats?.total_interviews ?? "--",
      icon: Mic,
      trend: "Voice & Text Sessions",
      color: "text-purple-500 bg-purple-500/10",
      href: "/admin/analytics",
    },
    {
      title: "Applications Tracked",
      value: stats?.total_applications ?? "--",
      icon: Briefcase,
      trend: "Active Pipeline Jobs",
      color: "text-amber-500 bg-amber-500/10",
      href: "/admin/analytics",
    },
    {
      title: "AI Inferences",
      value: stats?.total_ai_requests ?? "--",
      icon: Cpu,
      trend: "STAR & Copilot Runs",
      color: "text-rose-500 bg-rose-500/10",
      href: "/admin/ai",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Admin Control Center
            </h1>
            <Badge variant="outline" className="gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold py-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Live Telemetry
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <p className="text-sm text-muted-foreground">
              Platform governance, multi-tenant candidate monitoring, and real-time operations.
            </p>
            {dataUpdatedAt ? (
              <span className="text-[11px] text-muted-foreground/80 border-l border-border/60 pl-3 hidden md:inline">
                Updated: {new Date(dataUpdatedAt).toLocaleTimeString()}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Time Range Filter Selector */}
          <div className="flex items-center rounded-xl border border-border/60 bg-card/60 p-1 text-xs">
            {(["today", "7d", "30d", "all"] as const).map((r) => (
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
                {r === "today" ? "Today" : r === "7d" ? "7D" : r === "30d" ? "30D" : "All Time"}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={isFetching || isFetchingAlerts}
            className="gap-2 rounded-xl h-9 text-xs"
            title="Refresh dashboard metrics and operational alerts"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching || isFetchingAlerts ? "animate-spin text-primary" : ""}`} />
            <span>{isFetching || isFetchingAlerts ? "Refreshing..." : "Refresh"}</span>
          </Button>

          <Link to="/admin/alerts">
            <Button variant="outline" size="sm" className="gap-2 rounded-xl h-9 text-xs border-primary/30">
              <AlertTriangle className="h-4 w-4 text-primary" />
              <span>Alerts</span>
              {(alertSummary?.open_count ?? 0) > 0 && (
                <Badge variant="destructive" className="h-4 px-1.5 text-[10px] font-bold">
                  {alertSummary?.open_count}
                </Badge>
              )}
            </Button>
          </Link>
          <Link to="/admin/features">
            <Button variant="outline" size="sm" className="gap-2 rounded-xl h-9 text-xs">
              <Flag className="h-4 w-4" />
              <span>Features</span>
            </Button>
          </Link>
          <Link to="/admin/announcements">
            <Button size="sm" className="gap-2 rounded-xl h-9 text-xs shadow-md shadow-primary/20">
              <Megaphone className="h-4 w-4" />
              <span>Broadcast</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Actionable Alerts & Health Summary Card (Live Telemetry & Alert Center Integrated) */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border backdrop-blur-xl shadow-sm transition-all ${
          (alertSummary?.critical_count ?? 0) > 0
            ? "border-red-500/30 bg-red-950/15"
            : (alertSummary?.warning_count ?? 0) > 0
            ? "border-amber-500/30 bg-amber-950/15"
            : "border-border/60 bg-card/50"
        }`}
      >
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
              (alertSummary?.critical_count ?? 0) > 0
                ? "bg-red-500/15 text-red-500"
                : (alertSummary?.warning_count ?? 0) > 0
                ? "bg-amber-500/15 text-amber-500"
                : "bg-emerald-500/10 text-emerald-500"
            }`}
          >
            {(alertSummary?.critical_count ?? 0) > 0 ? (
              <AlertCircle className="h-5 w-5" />
            ) : (alertSummary?.warning_count ?? 0) > 0 ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <ShieldCheck className="h-5 w-5" />
            )}
          </div>

          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-foreground text-sm">
                {(alertSummary?.critical_count ?? 0) > 0
                  ? "Critical Operational Incident Detected"
                  : (alertSummary?.warning_count ?? 0) > 0
                  ? "Platform Service Degradation"
                  : "Platform Operational Status"}
              </span>

              {(alertSummary?.critical_count ?? 0) > 0 ? (
                <Badge variant="destructive" className="font-bold text-[10px] gap-1 px-2 py-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  {alertSummary?.critical_count} Critical
                </Badge>
              ) : (alertSummary?.warning_count ?? 0) > 0 ? (
                <Badge
                  variant="outline"
                  className="border-amber-500/40 text-amber-500 bg-amber-500/10 font-bold text-[10px] px-2 py-0.5"
                >
                  {alertSummary?.warning_count} Warning(s)
                </Badge>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
                  <CheckCircle2 className="h-3 w-3" />
                  All Services Healthy
                </span>
              )}

              {alertSummary?.last_refreshed_at && (
                <span className="text-[10px] font-mono text-muted-foreground ml-1">
                  Checked {new Date(alertSummary.last_refreshed_at).toLocaleTimeString()}
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {(alertSummary?.unresolved_alerts && alertSummary.unresolved_alerts.length > 0) ? (
                <span>
                  Top Issue: <strong className="text-foreground">{alertSummary.unresolved_alerts[0].title}</strong> — {alertSummary.unresolved_alerts[0].description}
                </span>
              ) : (
                "0 active incidents · Core API online · Database connection nominal · Telemetry within normal limits."
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <Link to="/admin/alerts">
            <Button size="sm" className="h-8 px-3 rounded-xl text-xs gap-1.5 shadow-sm">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Alert Center</span>
              <ArrowUpRight className="h-3 w-3 opacity-70" />
            </Button>
          </Link>
          <Link to="/admin/system">
            <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground">
              <Server className="h-3.5 w-3.5 mr-1" />
              Diagnostics
            </Button>
          </Link>
          <Link to="/admin/audit">
            <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground">
              <Activity className="h-3.5 w-3.5 mr-1" />
              Audit Trail
            </Button>
          </Link>
        </div>
      </div>

      {/* Error state if query fails */}
      {error ? (
        <div className="flex items-center justify-between p-4 rounded-2xl border border-destructive/40 bg-destructive/10 text-destructive text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>Failed to load platform overview metrics. Check database and backend health.</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs h-8">
            Retry
          </Button>
        </div>
      ) : null}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.title} to={c.href}>
              <div className="group rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-xl shadow-sm hover:border-primary/40 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">{c.title}</span>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${c.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl sm:text-3xl font-black text-foreground">
                    {isLoading ? "--" : c.value}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-0.5">
                    {c.trend}
                    <ArrowUpRight className="h-3 w-3 inline" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Platform Quick Links & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Governance Shortcuts */}
        <div className="lg:col-span-2 flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-base text-foreground">Platform Governance & Controls</h3>
            </div>
            <Badge variant="outline" className="text-[10px]">
              Active Supervision
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <Link
              to="/admin/users"
              className="flex items-center gap-3.5 rounded-xl border border-border/50 bg-muted/20 p-3.5 hover:bg-accent/40 transition"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                <Users className="h-5 w-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-bold text-foreground">User Management</span>
                <span className="text-xs text-muted-foreground">Manage candidate profiles & status</span>
              </div>
            </Link>

            <Link
              to="/admin/analytics"
              className="flex items-center gap-3.5 rounded-xl border border-border/50 bg-muted/20 p-3.5 hover:bg-accent/40 transition"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-bold text-foreground">Platform Analytics</span>
                <span className="text-xs text-muted-foreground">Application funnel & skill trends</span>
              </div>
            </Link>

            <Link
              to="/admin/features"
              className="flex items-center gap-3.5 rounded-xl border border-border/50 bg-muted/20 p-3.5 hover:bg-accent/40 transition"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                <Flag className="h-5 w-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-bold text-foreground">Feature Flag Manager</span>
                <span className="text-xs text-muted-foreground">Toggle platform modules live</span>
              </div>
            </Link>

            <Link
              to="/admin/system"
              className="flex items-center gap-3.5 rounded-xl border border-border/50 bg-muted/20 p-3.5 hover:bg-accent/40 transition"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                <Activity className="h-5 w-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-bold text-foreground">System Health</span>
                <span className="text-xs text-muted-foreground">Database, AI, & API diagnostics</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Live Admin Audit Activity Feed */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-xl shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-foreground">Recent Audit Events</h3>
            <Link to="/admin/audit" className="text-xs text-primary font-medium hover:underline">
              View All
            </Link>
          </div>

          <div className="flex flex-col gap-3 mt-1 divide-y divide-border/40">
            {stats?.recent_activity?.length ? (
              stats.recent_activity.map((act) => (
                <div key={act.id} className="pt-2.5 first:pt-0 flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold text-foreground text-[11px]">
                      {act.action_type}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {act.created_at ? new Date(act.created_at).toLocaleTimeString() : "Just now"}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground truncate">
                    Target: {act.target_user_id || "Platform Core"}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No recent audit actions logged.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
