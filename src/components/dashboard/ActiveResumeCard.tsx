import React from "react";
import { Link } from "react-router-dom";
import { FileText, ArrowRight, Wand2, CheckCircle2, Upload } from "lucide-react";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { ResumeListItem } from "@/types";

interface ActiveResumeCardProps {
  resume: ResumeListItem | null;
  atsScore?: number;
}

export function ActiveResumeCard({ resume, atsScore = 0 }: ActiveResumeCardProps) {
  return (
    <div className="glass-card glass-card-hover rounded-3xl p-6 flex flex-col justify-between">
      <div>
        <SectionHeader
          title="Active Resume Health"
          subtitle="Your primary resume indexed for job match algorithms"
          icon={FileText}
          action={
            <Link to="/resume/upload">
              <Button variant="ghost" size="sm" className="text-xs text-primary hover:bg-primary/10 h-7 px-2">
                <span>Resume Studio</span>
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          }
        />

        {resume ? (
          <div className="mt-3 rounded-2xl border border-border/70 bg-secondary/30 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-foreground truncate">{resume.file_name}</h4>
                  <p className="text-xs text-muted-foreground">Version 1.0 · Primary Document</p>
                </div>
              </div>

              {atsScore > 0 ? (
                <StatusBadge variant="success" dot>
                  ATS {atsScore}%
                </StatusBadge>
              ) : (
                <StatusBadge variant="default">
                  Parsed
                </StatusBadge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-muted-foreground border-t border-border/40">
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> High keyword match
              </span>
              <span>•</span>
              <span>LaTeX format ready</span>
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-border/80 bg-secondary/20 p-6 text-center space-y-2">
            <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-xs font-medium text-foreground">No active resume uploaded yet</p>
            <p className="text-[11px] text-muted-foreground">Upload your resume to get instant ATS scoring and keyword analysis.</p>
            <Link to="/resume/upload">
              <Button size="sm" variant="gradient" className="mt-2 text-xs">
                Upload Resume
              </Button>
            </Link>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/40 pt-3">
        <Link to="/resume/rewrite" className="flex-1">
          <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
            <Wand2 className="h-3.5 w-3.5 text-primary" />
            <span>AI Resume Polish</span>
          </Button>
        </Link>

        {resume && (
          <Link to={`/resume/${resume.id}`}>
            <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-foreground">
              <span>View Report</span>
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
