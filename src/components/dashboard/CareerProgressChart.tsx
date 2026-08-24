import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, LineChart } from "lucide-react";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface CareerProgressChartProps {
  data: Array<{ week: string; score: number; label?: string }>;
  isLoading?: boolean;
}

export function CareerProgressChart({ data, isLoading }: CareerProgressChartProps) {
  const hasHistory = data.length >= 2;
  const firstScore = data.length > 0 ? data[0].score : 0;
  const latestScore = data.length > 0 ? data[data.length - 1].score : 0;
  const delta = latestScore - firstScore;

  return (
    <div className="glass-card glass-card-hover rounded-3xl p-6 flex flex-col justify-between">
      <div>
        <SectionHeader
          title="Career Progress History"
          subtitle="Score evolution over recent assessment milestones"
          icon={TrendingUp}
        />
      </div>

      <div className="h-64 w-full mt-2" role="img" aria-label="Career score progression chart">
        {isLoading ? (
          <Skeleton className="h-full w-full rounded-2xl" />
        ) : data.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-secondary/20 p-6 text-center space-y-2">
            <LineChart className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-xs font-medium text-foreground">No assessment history recorded yet</p>
            <p className="text-[11px] text-muted-foreground">
              Complete mock interviews or optimize your resume to start tracking progress.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreProgressGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="scoreProgressGradAccent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsla(230, 20%, 20%, 0.6)"
                vertical={false}
              />
              <XAxis
                dataKey="week"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                  fontSize: "12px",
                }}
                formatter={(value: any) => [`${value}%`, "Readiness Score"]}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                fill="url(#scoreProgressGrad)"
                animationDuration={1200}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 text-xs text-muted-foreground">
        <span>Baseline score: {firstScore}%</span>
        {hasHistory ? (
          <span
            className={cn(
              "font-semibold",
              delta >= 0 ? "text-emerald-400" : "text-amber-400"
            )}
          >
            {delta >= 0 ? `▲ +${delta}% progress` : `▼ ${delta}% change`}
          </span>
        ) : (
          <span className="text-primary font-medium">Initial Profile Assessment</span>
        )}
      </div>
    </div>
  );
}
