import React from "react";
import { Activity, Database, KeyRound, Cpu, HardDrive, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">System Health & Diagnostics</h2>
          <p className="text-xs text-muted-foreground">
            Live telemetry status of platform infrastructure services and database connections.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={isLoading}
          className="gap-2 rounded-xl text-xs h-9"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh Status</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((srv) => {
          const status = health?.services[srv.key] || "healthy";
          const Icon = srv.icon;

          return (
            <div
              key={srv.key}
              className="flex items-start justify-between rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-xl shadow-sm"
            >
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-foreground">{srv.name}</span>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {srv.description}
                  </p>
                </div>
              </div>

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
                    className="border-amber-500/30 text-amber-500 font-bold text-[10px] gap-1 px-2 py-0.5"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    Degraded
                  </Badge>
                ) : (
                  <Badge
                    variant="destructive"
                    className="font-bold text-[10px] gap-1 px-2 py-0.5"
                  >
                    <XCircle className="h-3 w-3" />
                    Unhealthy
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
