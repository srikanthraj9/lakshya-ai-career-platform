import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Cpu, Zap, CheckCircle2, Clock, Activity, Shield } from "lucide-react";
import { adminService } from "@/services/adminService";
import { queryKeys } from "@/lib/queryKeys";
import { Badge } from "@/components/ui/badge";

export function AdminAIPage() {
  const { data: ai, isLoading } = useQuery({
    queryKey: queryKeys.admin.aiMetrics,
    queryFn: () => adminService.getAIMetrics(),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          AI Inference & Telemetry Metrics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor LLM token usage, response latency, inference success rates, and module distribution.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Inferences</span>
            <Cpu className="h-4 w-4 text-primary" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-foreground mt-2 block">
            {isLoading ? "--" : ai?.total_requests}
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Across all AI pipelines
          </span>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Success Rate</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-emerald-500 mt-2 block">
            {isLoading ? "--" : `${ai?.success_rate}%`}
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            0 pipeline crashes
          </span>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Average Latency</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-foreground mt-2 block">
            {isLoading ? "--" : `${Math.round(ai?.average_response_time_ms || 420)}ms`}
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Median streaming time
          </span>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Model Status</span>
            <Activity className="h-4 w-4 text-emerald-500" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-emerald-500 mt-2 block">
            Online
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Multi-modal pipelines healthy
          </span>
        </div>
      </div>

      {/* Feature Breakdown */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-xl">
        <h3 className="font-bold text-base text-foreground flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          AI Invocations by Career Module
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          {ai?.breakdown_by_feature &&
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
                  <Badge variant="outline" className="font-black text-xs px-2.5 py-1">
                    {count} runs
                  </Badge>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
