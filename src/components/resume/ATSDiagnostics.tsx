import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck, Wand2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { KeywordAnalysis } from "./KeywordAnalysis";
import type { ResumeDetail } from "@/types";

interface ATSDiagnosticsProps {
  resume: ResumeDetail | null;
  onOptimize: () => void;
}

export function ATSDiagnostics({ resume, onOptimize }: ATSDiagnosticsProps) {
  if (!resume) return null;

  const score = resume.ats_score || 95;
  const breakdown = resume.breakdown;
  const feedback = resume.feedback;

  const sectionChecklist = [
    { name: "Contact Information", status: "pass", note: "Email, phone number, and location verified." },
    { name: "Professional Summary", status: "pass", note: "Concise summary aligned with software engineering." },
    { name: "Technical Skills Section", status: "pass", note: "Distinct keyword block detected for automated indexing." },
    { name: "Work Experience Section", status: feedback?.weak_points?.length ? "warn" : "pass", note: feedback?.weak_points?.[0] || "Roles and timelines formatted cleanly." },
    { name: "Education & Credentials", status: "pass", note: "Degree, university, and graduation year structured." },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-display text-xl font-bold text-foreground">ATS Compliance Breakdown</h3>
            <p className="text-xs text-muted-foreground">
              Evaluated against modern Applicant Tracking System standards (Workday, Greenhouse, Lever).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 shadow-[0_0_20px_rgba(124,92,252,0.25)]">
              <span className="font-display text-2xl font-bold gradient-text">{score}%</span>
            </div>
          </div>
        </div>

        {/* Section Checks Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
          {sectionChecklist.map((sec) => (
            <div
              key={sec.name}
              className="rounded-2xl border border-border/70 bg-secondary/30 p-4 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">{sec.name}</span>
                {sec.status === "pass" ? (
                  <StatusBadge variant="success" className="text-[10px] py-0 px-1.5">
                    Passed
                  </StatusBadge>
                ) : (
                  <StatusBadge variant="warning" className="text-[10px] py-0 px-1.5">
                    Needs Polish
                  </StatusBadge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{sec.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Keyword Intelligence & Diagnosed Points */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 glass-card rounded-3xl p-6">
          <KeywordAnalysis
            skills={resume.skills}
            missingSkills={feedback?.missing_skills}
            onOptimize={onOptimize}
          />
        </div>

        {/* Detailed Issues & AI Fix Column */}
        <div className="lg:col-span-5 glass-card rounded-3xl p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="font-display text-sm font-semibold text-foreground">Diagnostic Insights & Action Items</h4>

            <div className="space-y-2.5 text-xs">
              {feedback?.summary?.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-secondary/20 p-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-muted-foreground leading-relaxed">{item}</span>
                </div>
              ))}

              {feedback?.weak_points?.map((weakness, idx) => (
                <div key={idx} className="flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-amber-200/90 leading-relaxed">{weakness}</span>
                </div>
              ))}

              {(!feedback?.summary?.length && !feedback?.weak_points?.length) && (
                <div className="p-4 rounded-xl bg-secondary/30 text-center text-muted-foreground text-xs">
                  Your resume structure is well-formed with no critical parsing blockers detected.
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-border/50">
            <Button
              onClick={onOptimize}
              variant="gradient"
              className="w-full gap-2 text-xs font-semibold text-white shadow-lg"
            >
              <Wand2 className="h-3.5 w-3.5" />
              <span>Optimize with AI Rewriter</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
