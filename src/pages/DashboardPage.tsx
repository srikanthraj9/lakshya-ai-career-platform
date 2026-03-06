import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "@/services/analytics";
import { motion } from "framer-motion";
import { FileText, Brain, Award, TrendingUp, Sparkles, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
} from "recharts";

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

  const { data: careerProgress } = useQuery({
    queryKey: ["career-progress"],
    queryFn: analyticsService.getCareerProgress,
  });

  // Transform skill data for radar chart
  const radarData = skillGrowth?.slice(0, 6).map((s) => ({ skill: s.skill, value: s.count, fullMark: Math.max(...(skillGrowth?.map((x) => x.count) ?? [10])) }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Your career intelligence at a glance.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => (
          <motion.div key={card.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                {isLoading ? <Skeleton className="mt-1 h-8 w-16" /> : (
                  <p className="mt-1 text-3xl font-bold text-foreground">{summary?.[card.key] ?? 0}</p>
                )}
              </div>
              <card.icon className={`h-8 w-8 ${card.color}`} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* AI Insight Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card glow-primary rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-display font-semibold text-foreground">AI Resume Improvement</h3>
          </div>
          <p className="text-sm text-muted-foreground">Your resume can be improved by addressing formatting, keyword optimization and quantifying achievements.</p>
          {isLoading ? <Skeleton className="mt-3 h-2 w-full rounded-full" /> : (
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${summary?.ats_score ?? 0}%` }} />
            </div>
          )}
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card glow-accent rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <Target className="h-5 w-5 text-accent" />
            <h3 className="font-display font-semibold text-foreground">Interview Performance Trend</h3>
          </div>
          <p className="text-sm text-muted-foreground">Track your mock interview scores over time to measure readiness.</p>
          {isLoading ? <Skeleton className="mt-3 h-2 w-full rounded-full" /> : (
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-gradient-to-r from-accent to-chart-3" style={{ width: `${summary?.interview_score ?? 0}%` }} />
            </div>
          )}
        </motion.div>
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
            ) : <Skeleton className="h-full w-full" />}
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <h3 className="mb-4 font-display text-lg font-semibold">Skill Gap Radar</h3>
          <div className="h-64">
            {radarData ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="skill" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <PolarRadiusAxis stroke="hsl(var(--border))" fontSize={10} />
                  <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            ) : <Skeleton className="h-full w-full" />}
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
            ) : <Skeleton className="h-full w-full" />}
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <h3 className="mb-4 font-display text-lg font-semibold">Career Progress</h3>
          <div className="h-64">
            {careerProgress ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={careerProgress}>
                  <defs>
                    <linearGradient id="progressGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Area type="monotone" dataKey="score" stroke="hsl(var(--chart-3))" fill="url(#progressGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <Skeleton className="h-full w-full" />}
          </div>
        </div>
      </div>
    </div>
  );
}
