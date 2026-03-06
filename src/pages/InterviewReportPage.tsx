import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { interviewService } from "@/services/interview";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Award, MessageSquare, Shield, CheckCircle, XCircle } from "lucide-react";

export default function InterviewReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { data: report, isLoading } = useQuery({
    queryKey: ["interview-report", sessionId],
    queryFn: () => interviewService.getReport(sessionId!),
    enabled: !!sessionId,
  });

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>;
  if (!report) return <p className="text-destructive">Report not found.</p>;

  const scores = [
    { label: "Technical", value: report.technical_score, icon: Award, color: "text-primary" },
    { label: "Communication", value: report.communication_score, icon: MessageSquare, color: "text-accent" },
    { label: "Confidence", value: report.confidence_score, icon: Shield, color: "text-chart-3" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="font-display text-3xl font-bold">Interview Report</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        {scores.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card rounded-xl p-6 text-center">
            <s.icon className={`mx-auto mb-2 h-8 w-8 ${s.color}`} />
            <p className="text-3xl font-bold text-foreground">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="glass-card rounded-2xl p-6">
          <h3 className="mb-3 flex items-center gap-2 font-semibold"><CheckCircle className="h-5 w-5 text-chart-4" /> Strengths</h3>
          <ul className="space-y-2">
            {report.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-chart-4" />{s}
              </li>
            ))}
          </ul>
        </div>
        <div className="glass-card rounded-2xl p-6">
          <h3 className="mb-3 flex items-center gap-2 font-semibold"><XCircle className="h-5 w-5 text-chart-5" /> Weaknesses</h3>
          <ul className="space-y-2">
            {report.weaknesses.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-chart-5" />{w}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
