import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { interviewService } from "@/services/interview";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Award, MessageSquare, Shield, CheckCircle, XCircle } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { ErrorFallback } from "@/components/ErrorFallback";

export default function InterviewReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { data: report, isLoading, isError, refetch } = useQuery({
    queryKey: ["interview-report", sessionId],
    queryFn: () => interviewService.getReport(sessionId!),
    enabled: !!sessionId,
    retry: 2,
  });

  if (isLoading) return <div className="space-y-4" role="status" aria-label="Loading report">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>;
  if (isError) return <ErrorFallback title="Report Load Failed" message="We couldn't load this interview report." onRetry={() => refetch()} />;
  if (!report) return <ErrorFallback title="Report Not Found" message="The requested report does not exist." />;

  const scores = [
    { label: "Technical", value: report.technical_score, icon: Award, color: "text-primary" },
    { label: "Communication", value: report.communication_score, icon: MessageSquare, color: "text-accent" },
    { label: "Confidence", value: report.confidence_score, icon: Shield, color: "text-chart-3" },
  ];

  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Interview Report</h1>
          <p className="text-muted-foreground">Your AI interview performance breakdown.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3" role="list" aria-label="Interview scores">
          {scores.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card glass-card-hover rounded-xl p-6 text-center" role="listitem">
              <s.icon className={`mx-auto mb-2 h-8 w-8 ${s.color}`} aria-hidden="true" />
              <p className="text-3xl font-bold text-foreground"><AnimatedCounter value={s.value} /></p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="glass-card glass-card-hover rounded-2xl p-6">
            <h3 className="mb-3 flex items-center gap-2 font-semibold"><CheckCircle className="h-5 w-5 text-chart-4" aria-hidden="true" /> Strengths</h3>
            <ul className="space-y-2" aria-label="Strengths">
              {report.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-chart-4" aria-hidden="true" />{s}
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="glass-card glass-card-hover rounded-2xl p-6">
            <h3 className="mb-3 flex items-center gap-2 font-semibold"><XCircle className="h-5 w-5 text-chart-5" aria-hidden="true" /> Weaknesses</h3>
            <ul className="space-y-2" aria-label="Weaknesses">
              {report.weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-chart-5" aria-hidden="true" />{w}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
