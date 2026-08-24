import React from "react";
import { Target, Sparkles, CheckCircle2, ChevronDown, Compass, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useCareerContext } from "@/hooks/useCareerContext";
import type { CareerDecision } from "@/types";

interface RoleAlignmentHeaderProps {
  careerDecision?: CareerDecision | null;
  selectedCategory: string;
  categories: string[];
  onSelectCategory: (cat: string) => void;
}

export function RoleAlignmentHeader({
  careerDecision,
  selectedCategory,
  categories,
  onSelectCategory,
}: RoleAlignmentHeaderProps) {
  const { targetRole, activeResume, resumes, setActiveResumeId } = useCareerContext();

  const verdict = careerDecision?.career_verdict || "Close fit";
  const confidence = careerDecision?.confidence_label || "High Confidence";

  const getVerdictVariant = (v: string) => {
    const lower = v.toLowerCase();
    if (lower.includes("ready") || lower.includes("strong")) return "success";
    if (lower.includes("close") || lower.includes("fit")) return "ai";
    return "warning";
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-card gradient-border relative overflow-hidden rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusBadge variant="ai" dot>
                Target Role Intelligence
              </StatusBadge>
              <StatusBadge variant={getVerdictVariant(verdict)}>
                Verdict: {verdict}
              </StatusBadge>
              <span className="text-xs text-muted-foreground">• {confidence}</span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Role Alignment & Skill Gap Analysis
            </h1>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {careerDecision?.decision_guidance ||
                `Comparing your verified profile against industry benchmarks for ${targetRole}. Identify high-priority skill gaps and bridge them with milestone roadmap projects.`}
            </p>
          </div>

          {/* Active Resume Selector */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            {resumes.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-10 gap-2.5 rounded-xl border-border/80 bg-secondary/30 px-3.5 text-xs font-medium hover:border-primary/40"
                  >
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="max-w-[150px] truncate">{activeResume?.file_name || "Select Resume"}</span>
                    {typeof activeResume?.ats_score === "number" && (
                      <StatusBadge variant="success" className="text-[10px] py-0 px-1.5 ml-1">
                        ATS {activeResume.ats_score}%
                      </StatusBadge>
                    )}
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-1.5 rounded-2xl border-border bg-popover/95 backdrop-blur-2xl">
                  <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Active Resume Source
                  </div>
                  <DropdownMenuSeparator />
                  {resumes.map((r) => (
                    <DropdownMenuItem
                      key={r.id}
                      onClick={() => setActiveResumeId(r.id)}
                      className="rounded-xl p-2.5 text-xs cursor-pointer hover:bg-secondary/70"
                    >
                      <FileText className="h-4 w-4 text-primary mr-2" />
                      <span className="truncate">{r.file_name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Category Pill Filters */}
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/50">
            <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
              <Compass className="h-3.5 w-3.5" /> Domain Focus:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => onSelectCategory(cat)}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                  selectedCategory === cat
                    ? "bg-primary text-white font-semibold shadow-md shadow-primary/20"
                    : "bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                {cat === "__all_categories__" ? "All Domains" : cat}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
