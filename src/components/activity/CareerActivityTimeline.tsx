import React from "react";
import {
  Clock,
  FileText,
  Target,
  CheckCircle2,
  Mic,
  Briefcase,
  Wand2,
  Sparkles,
  History,
} from "lucide-react";
import { useActivity } from "@/context/ActivityContext";
import { formatChartDate } from "@/lib/careerMetrics";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { CareerActivityType } from "@/services/activityService";

interface CareerActivityTimelineProps {
  maxItems?: number;
  showTitle?: boolean;
}

export function CareerActivityTimeline({
  maxItems = 10,
  showTitle = true,
}: CareerActivityTimelineProps) {
  const { activities } = useActivity();

  const displayed = activities.slice(0, maxItems);

  const getIcon = (type: CareerActivityType) => {
    switch (type) {
      case "resume_uploaded":
      case "resume_analyzed":
      case "ats_improved":
        return <FileText className="h-4 w-4 text-primary" />;
      case "target_role_updated":
        return <Target className="h-4 w-4 text-cyan-400" />;
      case "roadmap_milestone_completed":
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case "interview_completed":
        return <Mic className="h-4 w-4 text-accent" />;
      case "job_matched":
        return <Briefcase className="h-4 w-4 text-emerald-400" />;
      case "resume_tailored":
        return <Wand2 className="h-4 w-4 text-primary" />;
      default:
        return <Sparkles className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <div className="glass-card rounded-3xl p-6 space-y-6">
      {showTitle && (
        <div className="flex items-center justify-between pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <History className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-foreground">
                Career Progress Timeline
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Real-time milestone achievements and actions
              </p>
            </div>
          </div>

          <StatusBadge variant="ai" dot>
            Verified Log
          </StatusBadge>
        </div>
      )}

      {displayed.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          No activities recorded yet. Complete roadmap milestones or upload resumes to see your timeline.
        </div>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-border/60">
          {displayed.map((act) => (
            <div key={act.id} className="relative group">
              {/* Timeline Node Dot */}
              <div className="absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-card border-2 border-primary shadow-sm group-hover:scale-110 transition-transform">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              </div>

              {/* Activity Card */}
              <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3.5 space-y-1.5 hover:border-primary/40 hover:bg-secondary/40 transition-all">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getIcon(act.type)}
                    <h4 className="font-display text-xs font-bold text-foreground truncate">
                      {act.title}
                    </h4>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                    <Clock className="h-2.5 w-2.5" />
                    {formatChartDate(act.timestamp)}
                  </span>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed pl-6">
                  {act.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
