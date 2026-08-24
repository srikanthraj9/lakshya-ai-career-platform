import React from "react";
import {
  Building,
  Calendar,
  DollarSign,
  ArrowRight,
  MessageSquare,
  Sparkles,
  ExternalLink,
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APPLICATION_STAGES, type JobApplication } from "@/services/applicationTrackerService";

interface ApplicationCardProps {
  application: JobApplication;
  onTransition: (id: string, stage: string) => void;
  onOpenDetail: (app: JobApplication) => void;
  onOpenDebrief: (app: JobApplication) => void;
  onOpenCompanyIntel: (companyName: string) => void;
  onOpenOutreach: (app: JobApplication) => void;
  onDelete: (id: string) => void;
}

export function ApplicationCard({
  application,
  onTransition,
  onOpenDetail,
  onOpenDebrief,
  onOpenCompanyIntel,
  onOpenOutreach,
  onDelete,
}: ApplicationCardProps) {
  const currentStageIndex = APPLICATION_STAGES.findIndex((s) => s.id === application.stage);
  const nextStage = APPLICATION_STAGES[currentStageIndex + 1];

  return (
    <div className="glass-card glass-card-hover rounded-2xl p-4 space-y-3.5 border border-border/60 transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xs border border-primary/25">
            {application.company_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <button
              onClick={() => onOpenCompanyIntel(application.company_name)}
              className="text-xs font-bold text-foreground hover:text-primary transition-colors truncate block text-left"
              title="View Company Intelligence"
            >
              {application.company_name}
            </button>
            <p className="text-[11px] text-muted-foreground truncate">{application.job_title}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {application.match_score_at_application > 0 && (
            <span className="rounded-full bg-primary/10 border border-primary/25 px-2 py-0.5 text-[10px] font-bold text-primary">
              {Math.round(application.match_score_at_application)}% Fit
            </span>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-popover/95 backdrop-blur-xl border-border/80 text-xs">
              <DropdownMenuItem onClick={() => onOpenDetail(application)} className="cursor-pointer">
                View Timeline & Notes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOpenDebrief(application)} className="cursor-pointer text-accent">
                Log Interview Debrief
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOpenOutreach(application)} className="cursor-pointer text-primary">
                ✨ Generate AI Outreach Note
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOpenCompanyIntel(application.company_name)} className="cursor-pointer">
                Company Hiring Profile
              </DropdownMenuItem>
              {application.job_url && (
                <DropdownMenuItem asChild className="cursor-pointer">
                  <a href={application.job_url} target="_blank" rel="noopener noreferrer">
                    Open Job Listing <ExternalLink className="ml-auto h-3 w-3" />
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onDelete(application.id)} className="cursor-pointer text-destructive focus:text-destructive">
                <Trash2 className="h-3 w-3 mr-1.5" /> Delete Application
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Meta Pills */}
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        {application.salary_range && (
          <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
            <DollarSign className="h-2.5 w-2.5" />
            {application.salary_range}
          </span>
        )}
        {application.location && (
          <span className="truncate max-w-[140px]">{application.location}</span>
        )}
      </div>

      {/* Next Step / Debrief Highlight */}
      {application.next_step_notes && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-2 text-[11px] text-foreground flex items-center justify-between">
          <div className="truncate">
            <span className="text-primary font-semibold">Next:</span> {application.next_step_notes}
          </div>
          {application.next_step_date && (
            <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
              {new Date(application.next_step_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
      )}

      {/* Footer Stage Advancement Actions */}
      <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
        <button
          onClick={() => onOpenDetail(application)}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {application.events?.length || 1} Events
        </button>

        <div className="flex items-center gap-1.5">
          {application.stage === "interviewing" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenDebrief(application)}
              className="h-7 px-2.5 rounded-xl text-[10px] gap-1 border-accent/30 text-accent hover:bg-accent/10"
            >
              <MessageSquare className="h-3 w-3" />
              Debrief
            </Button>
          )}

          {nextStage && nextStage.id !== "closed" ? (
            <Button
              size="sm"
              onClick={() => onTransition(application.id, nextStage.id)}
              className="h-7 px-2.5 gradient-primary rounded-xl text-[10px] text-white gap-1 shadow-sm"
            >
              <span>{nextStage.label}</span>
              <ChevronRight className="h-3 w-3" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenDetail(application)}
              className="h-7 px-2 text-[10px] rounded-xl text-muted-foreground"
            >
              Details →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
