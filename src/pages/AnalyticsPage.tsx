import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "@/services/analytics";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function AnalyticsPage() {
  const { data: summary, isLoading } = useQuery({ queryKey: ["analytics-summary"], queryFn: analyticsService.getSummary });
  const { data: atsTrend } = useQuery({ queryKey: ["ats-trend"], queryFn: analyticsService.getATSTrend });
  const { data: skillGrowth } = useQuery({ queryKey: ["skill-growth"], queryFn: analyticsService.getSkillGrowth });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Career Analytics</h1>
        <p className="text-muted-foreground">Track your progress over time.</p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["ATS Score", "Total Resumes", "Skills", "Interview Score"].map((label, i) => (
          <div key={label} className="glass-card rounded-xl p-6">
            <p className="text-sm text-muted-foreground">{label}</p>
            {isLoading ? <Skeleton className="mt-1 h-8 w-16" /> : (
              <p className="mt-1 text-3xl font-bold text-foreground">
                {summary ? Object.values(summary)[i] : 0}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card rounded-xl p-6">
          <h3 className="mb-4 font-display text-lg font-semibold">ATS Score Trend</h3>
          <div className="h-72">
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
          <h3 className="mb-4 font-display text-lg font-semibold">Skill Growth</h3>
          <div className="h-72">
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
      </div>
    </div>
  );
}
