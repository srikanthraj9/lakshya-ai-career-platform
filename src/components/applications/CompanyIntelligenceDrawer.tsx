import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Building, ShieldCheck, DollarSign, Layers, HelpCircle, ExternalLink, Sparkles } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { CompanyIntelligence } from "@/services/applicationTrackerService";

interface CompanyIntelligenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string | null;
  onFetchCompany: (name: string) => Promise<CompanyIntelligence>;
}

export function CompanyIntelligenceDrawer({
  isOpen,
  onClose,
  companyName,
  onFetchCompany,
}: CompanyIntelligenceDrawerProps) {
  const [intel, setIntel] = useState<CompanyIntelligence | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && companyName) {
      setLoading(true);
      onFetchCompany(companyName)
        .then((res) => setIntel(res))
        .catch(() => setIntel(null))
        .finally(() => setLoading(false));
    }
  }, [isOpen, companyName, onFetchCompany]);

  if (!companyName) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto p-6 border-border/80 bg-popover/95 backdrop-blur-2xl shadow-2xl rounded-3xl space-y-5">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-sm border border-primary/25">
                {companyName.charAt(0).toUpperCase()}
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-foreground">
                  {intel?.name || companyName}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">{intel?.domain || "Engineering Profile"}</p>
              </div>
            </div>

            <StatusBadge variant="ai" dot>
              {intel?.confidence_score ?? 92}% Verified
            </StatusBadge>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
            <Sparkles className="mx-auto h-6 w-6 text-primary animate-pulse" />
            <p>Loading company hiring patterns and tech stack...</p>
          </div>
        ) : intel ? (
          <div className="space-y-5 text-xs">
            {/* Tech Stack */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" /> Verified Engineering Stack
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {intel.tech_stack.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-xl border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* Interview Format Breakdown */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Typical Interview Process
              </h4>
              <div className="space-y-2">
                {intel.interview_stages.map((stage, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-secondary/20"
                  >
                    <div>
                      <p className="font-bold text-foreground text-xs">{stage.round}</p>
                      <p className="text-[10px] text-muted-foreground">{stage.focus}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-semibold bg-secondary/80 px-2 py-0.5 rounded-md">
                      {stage.duration}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Salary Benchmarks */}
            {intel.salary_benchmarks && Object.keys(intel.salary_benchmarks).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-400" /> Compensation Bands
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(intel.salary_benchmarks).map(([level, salary]) => (
                    <div key={level} className="p-2.5 rounded-xl border border-border/60 bg-secondary/20 space-y-0.5">
                      <p className="text-[10px] text-muted-foreground">{level}</p>
                      <p className="font-bold text-foreground text-xs text-emerald-400">{salary}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hiring Culture Notes */}
            {intel.hiring_culture_notes && (
              <div className="space-y-1.5 rounded-2xl border border-border/50 bg-secondary/15 p-3.5">
                <span className="text-[11px] font-bold text-foreground uppercase tracking-wider block">
                  Hiring & Culture Insights
                </span>
                <p className="text-muted-foreground leading-relaxed italic text-[11px]">
                  "{intel.hiring_culture_notes}"
                </p>
              </div>
            )}

            {/* Common Interview Questions */}
            {intel.common_questions && intel.common_questions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-accent" /> Frequently Asked Questions
                </h4>
                <div className="space-y-1.5">
                  {intel.common_questions.map((q, idx) => (
                    <div key={idx} className="p-2 rounded-xl bg-secondary/20 border border-border/50 text-[11px] text-foreground">
                      • {q}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
