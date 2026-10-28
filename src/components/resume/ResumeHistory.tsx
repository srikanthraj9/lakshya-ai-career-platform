import React from "react";
import { FileText, CheckCircle2, Download, Trash2, ArrowRight, Upload, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { formatChartDate } from "@/lib/careerMetrics";
import type { ResumeListItem } from "@/types";

interface ResumeHistoryProps {
  resumes: ResumeListItem[];
  activeResumeId: string | null;
  onSelectResume: (id: string) => void;
  onOpenUpload: () => void;
  onDeleteResume?: (id: string) => void;
}

export function ResumeHistory({
  resumes,
  activeResumeId,
  onSelectResume,
  onOpenUpload,
  onDeleteResume,
}: ResumeHistoryProps) {
  if (resumes.length === 0) {
    return (
      <div className="glass-card rounded-3xl p-12 text-center space-y-4">
        <FileText className="h-12 w-12 text-muted-foreground/60 mx-auto" />
        <div className="space-y-1">
          <h3 className="font-display text-lg font-bold text-foreground">No Resume History Yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Upload your first resume to start building your versioned career intelligence archive.
          </p>
        </div>
        <Button onClick={onOpenUpload} variant="gradient" size="sm" className="gap-2 text-xs">
          <Upload className="h-3.5 w-3.5" />
          <span>Upload Master Resume</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
      <SectionHeader
        title="Resume Version History & Archive"
        subtitle={`${resumes.length} stored resume versions available in your workspace`}
        icon={Clock}
        action={
          <Button onClick={onOpenUpload} variant="gradient" size="sm" className="gap-1.5 text-xs">
            <Upload className="h-3.5 w-3.5" />
            <span>Upload New Version</span>
          </Button>
        }
      />

      <div className="space-y-3 pt-1">
        {resumes.map((resume, idx) => {
          const isActive = resume.id === activeResumeId;
          const versionNumber = resumes.length - idx;

          return (
            <div
              key={resume.id}
              className={`rounded-2xl border p-4 sm:p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isActive
                  ? "border-primary/40 bg-primary/10 shadow-[0_0_20px_-5px_rgba(124,92,252,0.2)]"
                  : "border-border/70 bg-secondary/30 hover:border-primary/30"
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                    isActive
                      ? "bg-primary text-white border-primary/40 shadow-sm"
                      : "bg-secondary text-muted-foreground border-white/5"
                  }`}
                >
                  <FileText className="h-5 w-5" />
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground truncate">{resume.file_name}</h4>
                    {isActive && (
                      <StatusBadge variant="ai" className="text-[10px] py-0 px-1.5">
                        Active Workspace
                      </StatusBadge>
                    )}
                    {resume.parent_resume_id && (
                      <StatusBadge variant="secondary" className="text-[10px] py-0 px-1.5 border border-primary/20 text-primary">
                        Rewrite Version
                      </StatusBadge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {resume.version_label || (resume.version_number ? `v${resume.version_number}.0` : `Version ${versionNumber}.0`)}
                    </span>
                    <span>•</span>
                    {(resume.base_quality_score ?? resume.ats_score) !== null && (resume.base_quality_score ?? resume.ats_score) !== undefined && (
                      <>
                        <span className="text-emerald-400 font-semibold">
                          {resume.base_quality_score ?? resume.ats_score}% ATS Quality
                        </span>
                        <span>•</span>
                      </>
                    )}
                    <span>Uploaded {resume.created_at ? formatChartDate(resume.created_at) : "Recently"}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                {!isActive ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSelectResume(resume.id)}
                    className="h-8 text-xs gap-1.5 rounded-xl border-border/80 text-foreground hover:border-primary/40"
                  >
                    <span>Make Active</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Currently Loaded
                  </span>
                )}

                {onDeleteResume && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onDeleteResume(resume.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                    title="Delete version"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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
