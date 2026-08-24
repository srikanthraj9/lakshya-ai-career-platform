import React from "react";
import {
  FileText,
  Upload,
  ChevronDown,
  Download,
  Trash2,
  Check,
  MoreVertical,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { ResumeListItem } from "@/types";
import { formatChartDate } from "@/lib/careerMetrics";

interface ResumeStudioHeaderProps {
  resumes: ResumeListItem[];
  activeResumeId: string | null;
  activeResumeName?: string;
  activeAtsScore?: number;
  onSelectResume: (id: string) => void;
  onOpenUpload: () => void;
  onDownloadOriginal?: () => void;
  onDeleteResume?: () => void;
  isDownloading?: boolean;
}

export function ResumeStudioHeader({
  resumes,
  activeResumeId,
  activeResumeName,
  activeAtsScore,
  onSelectResume,
  onOpenUpload,
  onDownloadOriginal,
  onDeleteResume,
  isDownloading = false,
}: ResumeStudioHeaderProps) {
  const currentResume = resumes.find((r) => r.id === activeResumeId);
  const displayName = activeResumeName || currentResume?.file_name || "Select Resume";
  const displayScore = activeAtsScore ?? 95;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border/50">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Resume Intelligence Studio
          </h1>
          <StatusBadge variant="ai" dot>
            AI Workspace
          </StatusBadge>
        </div>
        <p className="text-sm text-muted-foreground">
          Analyze, optimize, diagnose ATS keywords, and tailor your resume for target roles.
        </p>
      </div>

      {/* Action Controls & Active Resume Selector */}
      <div className="flex flex-wrap items-center gap-2.5">
        {resumes.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-10 gap-2.5 rounded-xl border-border/80 bg-secondary/30 px-3.5 text-xs font-medium hover:border-primary/40 hover:bg-secondary/60"
              >
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span className="max-w-[150px] sm:max-w-[200px] truncate">{displayName}</span>
                {typeof displayScore === "number" && (
                  <StatusBadge variant="success" className="text-[10px] py-0 px-1.5 ml-1">
                    ATS {displayScore}%
                  </StatusBadge>
                )}
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 p-1.5 rounded-2xl border-border bg-popover/95 backdrop-blur-2xl">
              <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Switch Resume Version
              </div>
              <DropdownMenuSeparator />
              {resumes.map((r) => {
                const isSelected = r.id === activeResumeId;
                return (
                  <DropdownMenuItem
                    key={r.id}
                    onClick={() => onSelectResume(r.id)}
                    className="flex items-center justify-between gap-2 rounded-xl p-2.5 text-xs cursor-pointer hover:bg-secondary/70"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{r.file_name}</p>
                        {r.created_at && (
                          <p className="text-[10px] text-muted-foreground">
                            {formatChartDate(r.created_at)}
                          </p>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Upload Button */}
        <Button
          onClick={onOpenUpload}
          variant="gradient"
          className="h-10 gap-2 rounded-xl text-xs font-semibold text-white shadow-lg hover:shadow-primary/20"
        >
          <Plus className="h-4 w-4" />
          <span>Upload Version</span>
        </Button>

        {/* More Actions Menu */}
        {activeResumeId && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-xl border-border/80 bg-secondary/30 text-muted-foreground hover:text-foreground"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl border-border bg-popover/95 backdrop-blur-xl">
              {onDownloadOriginal && (
                <DropdownMenuItem onClick={onDownloadOriginal} disabled={isDownloading} className="gap-2 text-xs cursor-pointer">
                  <Download className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Download Original PDF</span>
                </DropdownMenuItem>
              )}
              {onDeleteResume && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDeleteResume} className="gap-2 text-xs text-destructive cursor-pointer hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    <span>Delete Resume</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
