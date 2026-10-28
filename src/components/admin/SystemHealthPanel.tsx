import React from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Database,
  KeyRound,
  Cpu,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ArrowUpRight,
  Clock,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SystemHealthResponse } from "@/types";

interface SystemHealthPanelProps {
  health: SystemHealthResponse | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function SystemHealthPanel({ health, isLoading, onRefresh }: SystemHealthPanelProps) {
  const services = [
    {
      name: "Core API Server (FastAPI)",
      key: "api",
      icon: Activity,
      description: "HTTP REST gateway, routing and request telemetry",
    },
    {
      name: "PostgreSQL & PgVector Database",
      key: "database",
      icon: Database,
      description: "Relational persistence, JSONB stores, and Vector embeddings",
    },
    {
      name: "Authentication & JWT Authorization",
      key: "authentication",
      icon: KeyRound,
      description: "Bcrypt token verification and multi-tenant RBAC session isolation",
    },
    {
      name: "AI Inference & Recommendation Engine",
      key: "ai_service",
      icon: Cpu,
      description: "STAR bullet rewrites, interview evaluator, and priority scoring",
    },
    {
      name: "File Storage & Document Engine",
      key: "storage",
      icon: HardDrive,
      description: "Resume PDF parsing, LaTeX generator, and local persistence",
    },
  ];

  const overallStatus = health?.status || "healthy";
  const openAlertsCount = health?.open_alerts_count ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
              System Health & Diagnostics
            </h2>
            <Badge
              variant={
                overallStatus === "healthy"
                  ? "secondary"
                  : overallStatus === "degraded"
                  ? "outline"
                  : "destructive"
              }
              className={`font-bold text-xs uppercase px-2 py-0.5 ${
                overallStatus === "healthy"
                  ? "bg-emerald-500/10 text-emerald-500 border-none"
                  : overallStatus === "degraded"
                  ? "border-amber-500/40 text-amber-500 bg-amber-500/10"
                  : ""
              }`}
            >
              {overallStatus === "healthy" ? "Operational" : overallStatus}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Live telemetry status of platform infrastructure services, database connection latencies, and AI engines.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/admin/alerts">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-xl text-xs h-9 border-border/70 bg-card/60"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-primary" />
              <span>Alert Center</span>
              {openAlertsCount > 0 && (
                <Badge variant="destructive" className="h-4 px-1.5 text-[10px] font-bold">
                  {openAlertsCount}
                </Badge>
              )}
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="gap-2 rounded-xl text-xs h-9 border-border/70 bg-card/60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-primary" : ""}`} />
            <span>{isLoading ? "Checking..." : "Refresh Probes"}</span>
          </Button>
        </div>
      </div>

      {/* Overview Status Banner */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border backdrop-blur-xl shadow-sm ${
          overallStatus === "healthy"
            ? "border-emerald-500/20 bg-emerald-950/10"
            : overallStatus === "degraded"
            ? "border-amber-500/30 bg-amber-950/15"
            : "border-red-500/30 bg-red-950/15"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
              overallStatus === "healthy"
                ? "bg-emerald-500/15 text-emerald-500"
                : overallStatus === "degraded"
                ? "bg-amber-500/15 text-amber-500"
                : "bg-red-500/15 text-red-500"
            }`}
          >
            {overallStatus === "healthy" ? (
              <ShieldCheck className="h-5 w-5" />
            ) : overallStatus === "degraded" ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm text-foreground">
              {overallStatus === "healthy"
                ? "All Core Services Healthy & Monitored"
                : overallStatus === "degraded"
                ? "Service Degradation Active — Investigation Recommended"
                : "Critical Service Failure Detected"}
            </span>
            <span className="text-xs text-muted-foreground mt-0.5">
              {health?.timestamp ? (
                <>Last probe executed at {new Date(health.timestamp).toLocaleTimeString()}</>
              ) : (
                "Continuous automated health telemetry active"
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Link to="/admin/alerts">
            <Button size="sm" variant="outline" className="h-8 text-xs rounded-xl gap-1">
              <span>View Active Incidents</span>
              <ArrowUpRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((srv) => {
          const detail = health?.service_details?.[srv.key];
          const status = detail?.status || health?.services?.[srv.key] || "unknown";
          const Icon = srv.icon;

          return (
            <div
              key={srv.key}
              className={`flex flex-col justify-between rounded-2xl border p-5 backdrop-blur-xl shadow-sm transition-all ${
                status === "healthy"
                  ? "border-border/60 bg-card/60"
                  : status === "degraded"
                  ? "border-amber-500/30 bg-amber-950/10"
                  : status === "unhealthy"
                  ? "border-red-500/30 bg-red-950/10"
                  : "border-border/40 bg-card/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                      status === "healthy"
                        ? "bg-primary/10 text-primary"
                        : status === "degraded"
                        ? "bg-amber-500/15 text-amber-500"
                        : status === "unhealthy"
                        ? "bg-red-500/15 text-red-500"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-foreground">{srv.name}</span>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {srv.description}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div>
                  {status === "healthy" ? (
                    <Badge
                      variant="secondary"
                      className="bg-emerald-500/10 text-emerald-500 border-none font-bold text-[10px] gap-1 px-2 py-0.5"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Healthy
                    </Badge>
                  ) : status === "degraded" ? (
                    <Badge
                      variant="outline"
                      className="border-amber-500/40 text-amber-500 bg-amber-500/10 font-bold text-[10px] gap-1 px-2 py-0.5"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      Degraded
                    </Badge>
                  ) : status === "unhealthy" ? (
                    <Badge
                      variant="destructive"
                      className="font-bold text-[10px] gap-1 px-2 py-0.5"
                    >
                      <XCircle className="h-3 w-3" />
                      Unhealthy
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="bg-muted text-muted-foreground font-bold text-[10px] gap-1 px-2 py-0.5"
                    >
                      <HelpCircle className="h-3 w-3" />
                      Unknown
                    </Badge>
                  )}
                </div>
              </div>

              {/* Technical Telemetry Row */}
              <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-border/40 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {detail?.latency_ms !== undefined && (
                      <span className="font-mono text-[11px] bg-muted/40 px-2 py-0.5 rounded-md text-foreground">
                        {detail.latency_ms} ms latency
                      </span>
                    )}
                    {detail?.active_providers && detail.active_providers.length > 0 && (
                      <span className="font-mono text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                        {detail.active_providers.join(", ")}
                      </span>
                    )}
                    {detail?.last_checked && (
                      <span className="flex items-center gap-1 text-[11px]">
                        <Clock className="h-3 w-3" />
                        {new Date(detail.last_checked).toLocaleTimeString()}
                      </span>
                    )}
                  </div>

                  {/* Deep-link to related alerts */}
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                  >
                    <Link to={`/admin/alerts?source=${srv.key}`}>
                      <span>Related Alerts</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>

                {/* Error Summary if degraded/unhealthy */}
                {detail?.error && (
                  <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-[11px] leading-relaxed">
                    <strong>Diagnosis:</strong> {detail.error}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
