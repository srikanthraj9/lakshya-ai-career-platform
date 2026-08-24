import React from "react";
import { History, CheckCircle2, Clock, ArrowRight, Trophy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { formatChartDate } from "@/lib/careerMetrics";
import type { InterviewSessionListItem } from "@/types";

interface InterviewHistoryProps {
  sessions: InterviewSessionListItem[];
  isLoading?: boolean;
  onOpenReport: (sessionId: string) => void;
  onResumeSession: (session: InterviewSessionListItem) => void;
  onStartNew: () => void;
}

export function InterviewHistory({
  sessions,
  isLoading = false,
  onOpenReport,
  onResumeSession,
  onStartNew,
}: InterviewHistoryProps) {
  if (sessions.length === 0 && !isLoading) {
    return (
      <div className="glass-card rounded-3xl p-10 text-center space-y-4 max-w-2xl mx-auto">
        <History className="h-10 w-10 text-muted-foreground/60 mx-auto" />
        <div className="space-y-1">
          <h3 className="font-display text-base font-bold text-foreground">No Interview Sessions Yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Complete your first AI mock interview above to record scores and track performance growth over time.
          </p>
        </div>
        <Button onClick={onStartNew} variant="gradient" size="sm" className="gap-1.5 text-xs">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Start First Interview</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6 max-w-4xl mx-auto">
      <SectionHeader
        title="Your Interview Practice History"
        subtitle={`${sessions.length} recorded interview simulations`}
        icon={History}
      />

      <div className="space-y-3">
        {sessions.map((s) => {
          const isCompleted = s.status === "completed";
          const score = typeof s.overall_score === "number" ? Math.round(s.overall_score) : null;

          return (
            <div
              key={s.id}
              className="rounded-2xl border border-border/70 bg-secondary/30 p-4 sm:p-5 transition-all hover:border-primary/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-foreground">{s.role}</h4>
                  <StatusBadge variant="ai" className="text-[10px] py-0 px-1.5 capitalize">
                    {s.difficulty}
                  </StatusBadge>
                  {isCompleted ? (
                    <StatusBadge variant="success" className="text-[10px] py-0 px-1.5">
                      Completed
                    </StatusBadge>
                  ) : (
                    <StatusBadge variant="warning" className="text-[10px] py-0 px-1.5">
                      In Progress ({s.current_index}/{s.total_questions})
                    </StatusBadge>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Started {s.started_at ? formatChartDate(s.started_at) : "Recently"}</span>
                  {score !== null && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-400 font-semibold">Overall Score: {score}%</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                {isCompleted ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenReport(s.id)}
                    className="h-8 text-xs gap-1.5 rounded-xl border-border/80 text-foreground hover:border-primary/40"
                  >
                    <span>View Report</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="gradient"
                    onClick={() => onResumeSession(s)}
                    className="h-8 text-xs gap-1.5 rounded-xl text-white shadow-sm"
                  >
                    <span>Resume</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
