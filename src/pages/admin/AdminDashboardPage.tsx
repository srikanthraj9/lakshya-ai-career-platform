import React from "react";
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
} from "lucide-react";
import { adminService } from "@/services/adminService";
import { queryKeys } from "@/lib/queryKeys";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: queryKeys.admin.dashboard,
    queryFn: () => adminService.getDashboardStats(),
  });

  const cards = [
    {
      title: "Total Candidates",
      value: stats?.total_users ?? "--",
      icon: Users,
      trend: `+${stats?.new_users_today || 0} today`,
      color: "text-blue-500 bg-blue-500/10",
      href: "/admin/users",
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
    <div className="flex flex-col gap-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Admin Control Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Platform governance, multi-tenant candidate monitoring, and real-time system operations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/admin/features">
            <Button variant="outline" size="sm" className="gap-2 rounded-xl h-9 text-xs">
              <Flag className="h-4 w-4" />
              <span>Feature Flags</span>
            </Button>
          </Link>
          <Link to="/admin/announcements">
            <Button size="sm" className="gap-2 rounded-xl h-9 text-xs shadow-md shadow-primary/20">
              <Megaphone className="h-4 w-4" />
              <span>Broadcast Notice</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
