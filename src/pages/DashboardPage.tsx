import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "@/services/analytics";
import { motion } from "framer-motion";
import { FileText, Brain, Award, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const statCards = [
  { key: "ats_score", label: "ATS Score", icon: Award, color: "text-primary" },
  { key: "total_resumes", label: "Total Resumes", icon: FileText, color: "text-accent" },
  { key: "skill_count", label: "Skills Detected", icon: Brain, color: "text-chart-3" },
  { key: "interview_score", label: "Interview Score", icon: TrendingUp, color: "text-chart-4" },
] as const;

export default function DashboardPage() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: analyticsService.getSummary,
  });

  const { data: atsTrend } = useQuery({
    queryKey: ["ats-trend"],
    queryFn: analyticsService.getATSTrend,
  });

  const { data: skillGrowth } = useQuery({
    queryKey: ["skill-growth"],
    queryFn: analyticsService.getSkillGrowth,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Your career intelligence at a glance.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                {isLoading ? (
                  <Skeleton className="mt-1 h-8 w-16" />
                ) : (
                  <p className="mt-1 text-3xl font-bold text-foreground">
                    {summary?.[card.key] ?? 0}
                  </p>
                )}
              </div>
              <card.icon className={`h-8 w-8 ${card.color}`} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card rounded-xl p-6">
          <h3 className="mb-4 font-display text-lg font-semibold">ATS Score Trend</h3>
          <div className="h-64">
            {atsTrend ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={atsTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <h3 className="mb-4 font-display text-lg font-semibold">Skill Growth</h3>
          <div className="h-64">
            {skillGrowth ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={skillGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="skill" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
