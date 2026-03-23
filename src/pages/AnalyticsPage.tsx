import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "@/services/analytics";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { PageTransition } from "@/components/PageTransition";
import { ErrorFallback } from "@/components/ErrorFallback";
import { motion } from "framer-motion";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function AnalyticsPage() {
  const { data: summary, isLoading, isError, refetch } = useQuery({ queryKey: ["analytics-summary"], queryFn: analyticsService.getSummary, retry: 2 });
  const { data: atsTrend } = useQuery({ queryKey: ["ats-trend"], queryFn: analyticsService.getATSTrend, retry: 2 });
  const { data: skillGrowth } = useQuery({ queryKey: ["skill-growth"], queryFn: analyticsService.getSkillGrowth, retry: 2 });

  const labels = ["ATS Score", "Total Resumes", "Skills", "Interview Score"];
  const suffixes = ["%", "", "", "%"];

  if (isError) {
    return (
      <PageTransition>
        <ErrorFallback title="Analytics Unavailable" message="Failed to load analytics data." onRetry={() => refetch()} />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Career Analytics</h1>
          <p className="text-muted-foreground">Track your progress over time.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" role="list" aria-label="Analytics summary">
          {labels.map((label, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card glass-card-hover rounded-xl p-6"
              role="listitem"
            >
              <p className="text-sm text-muted-foreground">{label}</p>
              {isLoading ? <Skeleton className="mt-1 h-8 w-16" /> : (
                <p className="mt-1 text-3xl font-bold text-foreground">
                  <AnimatedCounter value={summary ? Number(Object.values(summary)[i]) : 0} suffix={suffixes[i]} />
                </p>
              )}
            </motion.div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card glass-card-hover rounded-xl p-6">
            <h3 className="mb-4 font-display text-lg font-semibold">ATS Score Trend</h3>
            <div className="h-72" role="img" aria-label="ATS score trend chart">
              {atsTrend ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={atsTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} animationDuration={1500} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <Skeleton className="h-full w-full" />}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card glass-card-hover rounded-xl p-6">
            <h3 className="mb-4 font-display text-lg font-semibold">Skill Growth</h3>
            <div className="h-72" role="img" aria-label="Skill growth chart">
              {skillGrowth ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={skillGrowth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="skill" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} animationDuration={1500} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <Skeleton className="h-full w-full" />}
            </div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
