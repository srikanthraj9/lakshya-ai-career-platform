import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  Building,
  Calendar,
  DollarSign,
  Clock,
  MessageSquare,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { APPLICATION_STAGES, type JobApplication } from "@/services/applicationTrackerService";

interface ApplicationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: JobApplication | null;
  onTransition: (id: string, stage: string) => void;
  onOpenDebrief: (app: JobApplication) => void;
}

export function ApplicationDetailModal({
  isOpen,
  onClose,
  application,
  onTransition,
  onOpenDebrief,
}: ApplicationDetailModalProps) {
  if (!application) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-6 border-border/80 bg-popover/95 backdrop-blur-2xl shadow-2xl rounded-3xl space-y-5">
        <DialogHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-base border border-primary/25">
                {application.company_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <DialogTitle className="font-display text-xl font-bold text-foreground">
                  {application.job_title}
                </DialogTitle>
                <p className="text-xs text-muted-foreground font-semibold">
                  {application.company_name} • {application.location || "Remote"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <StatusBadge variant="ai" dot>
                {application.stage.toUpperCase()}
              </StatusBadge>
            </div>
          </div>
        </DialogHeader>

        {/* Stage Switcher Buttons */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Current Pipeline Stage
          </span>
          <div className="flex flex-wrap gap-1.5">
            {APPLICATION_STAGES.map((s) => (
              <button
                key={s.id}
                onClick={() => onTransition(application.id, s.id)}
                className={`rounded-xl px-3 py-1 text-xs font-semibold capitalize transition-all border ${
                  application.stage === s.id
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-secondary/40 text-muted-foreground border-border/50 hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes & Key Details */}
        {application.notes && (
          <div className="rounded-2xl border border-border/50 bg-secondary/15 p-3.5 space-y-1 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Application Notes
            </span>
            <p className="text-foreground leading-relaxed">{application.notes}</p>
          </div>
        )}

        {/* Action Events Timeline */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" /> Application History Timeline
            </h4>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenDebrief(application)}
              className="h-7 text-xs rounded-xl gap-1 text-accent border-accent/30 hover:bg-accent/10"
            >
              <MessageSquare className="h-3 w-3" /> Log Debrief
            </Button>
          </div>

          <div className="space-y-3 pl-2">
            {application.events && application.events.length > 0 ? (
              application.events.map((evt) => (
                <div key={evt.id} className="relative pl-5 border-l-2 border-primary/30 space-y-0.5 text-xs">
                  <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-primary" />
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-foreground">{evt.title}</p>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(evt.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  {evt.description && (
                    <p className="text-[11px] text-muted-foreground">{evt.description}</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No events recorded yet.</p>
            )}
          </div>
        </div>

        {/* Debriefs List */}
        {application.debriefs && application.debriefs.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-border/50">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-accent" /> Interview Debriefs ({application.debriefs.length})
            </h4>
            <div className="space-y-2">
              {application.debriefs.map((d) => (
                <div key={d.id} className="p-3 rounded-2xl border border-border/60 bg-secondary/20 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-foreground">{d.round_type}</p>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.2 rounded-md ${
                      d.outcome === "passed" ? "bg-emerald-500/20 text-emerald-400" :
                      d.outcome === "rejected" ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/20 text-amber-400"
                    }`}>
                      {d.outcome}
                    </span>
                  </div>
                  {d.candidate_reflection && (
                    <p className="text-muted-foreground italic text-[11px]">"{d.candidate_reflection}"</p>
                  )}
                  {d.identified_weaknesses && d.identified_weaknesses.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 text-[10px]">
                      <span className="text-muted-foreground">Identified Gaps:</span>
                      {d.identified_weaknesses.map((w) => (
                        <span key={w} className="rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.2">
                          {w}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
