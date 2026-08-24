import React from "react";
import { Plus, Layers, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApplicationCard } from "./ApplicationCard";
import { APPLICATION_STAGES, type JobApplication } from "@/services/applicationTrackerService";

interface ApplicationKanbanProps {
  applications: JobApplication[];
  onTransition: (id: string, stage: string) => void;
  onOpenDetail: (app: JobApplication) => void;
  onOpenDebrief: (app: JobApplication) => void;
  onOpenCompanyIntel: (companyName: string) => void;
  onOpenOutreach: (app: JobApplication) => void;
  onOpenAddModal: () => void;
  onDelete: (id: string) => void;
}

export function ApplicationKanban({
  applications,
  onTransition,
  onOpenDetail,
  onOpenDebrief,
  onOpenCompanyIntel,
  onOpenOutreach,
  onOpenAddModal,
  onDelete,
}: ApplicationKanbanProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
      {APPLICATION_STAGES.map((stage) => {
        const stageApps = applications.filter((app) => app.stage === stage.id);

        return (
          <div
            key={stage.id}
            className="flex flex-col rounded-3xl border border-border/60 bg-secondary/15 backdrop-blur-xl p-3.5 min-w-[260px] space-y-3"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-1.5 py-1 border-b border-border/40">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${
                  stage.id === "offer" ? "bg-emerald-400" :
                  stage.id === "interviewing" ? "bg-amber-400" :
                  stage.id === "screening" ? "bg-cyan-400" :
                  stage.id === "applied" ? "bg-primary" :
                  stage.id === "wishlist" ? "bg-muted-foreground" : "bg-rose-400"
                }`} />
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  {stage.label}
                </h4>
              </div>
              <span className="rounded-full bg-secondary/80 border border-border/60 px-2 py-0.2 text-[10px] font-bold text-muted-foreground">
                {stageApps.length}
              </span>
            </div>

            {/* Application Cards List */}
            <div className="flex-1 space-y-3 min-h-[350px]">
              {stageApps.map((app) => (
                <ApplicationCard
                  key={app.id}
                  application={app}
                  onTransition={onTransition}
                  onOpenDetail={onOpenDetail}
                  onOpenDebrief={onOpenDebrief}
                  onOpenCompanyIntel={onOpenCompanyIntel}
                  onOpenOutreach={onOpenOutreach}
                  onDelete={onDelete}
                />
              ))}

              {stageApps.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 p-6 text-center text-xs text-muted-foreground/60 h-32 space-y-1">
                  <span>No applications</span>
                </div>
              )}
            </div>

            {/* Quick Add at bottom of wishlist */}
            {stage.id === "wishlist" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenAddModal}
                className="w-full rounded-xl text-xs gap-1.5 border border-dashed border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              >
                <Plus className="h-3 w-3" />
                Add Application
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
