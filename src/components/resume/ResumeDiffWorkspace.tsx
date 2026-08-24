import React from "react";
import { ArrowRight, CheckCircle2, Sparkles, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { ResumeRewriteResponse } from "@/types";

interface ResumeDiffWorkspaceProps {
  originalText: string;
  result: ResumeRewriteResponse;
}

export function ResumeDiffWorkspace({ originalText, result }: ResumeDiffWorkspaceProps) {
  return (
    <div className="glass-card rounded-3xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-display text-sm font-semibold text-foreground">AI Content Optimization Matrix</h4>
            <p className="text-xs text-muted-foreground">Compare your original draft with the ATS-enhanced version</p>
          </div>
        </div>

        <StatusBadge variant="success" dot>
          Enhanced Output
        </StatusBadge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 pt-2">
        {/* Original */}
        <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Original Content
            </span>
            <span className="text-[10px] text-muted-foreground">Source Input</span>
          </div>

          <ScrollArea className="h-80 pr-2">
            <pre className="font-mono text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {originalText.slice(0, 1500)}
              {originalText.length > 1500 && "..."}
            </pre>
          </ScrollArea>
        </div>

        {/* AI Optimized */}
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-primary/20 pb-2">
            <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> AI Enhanced Output
            </span>
            <span className="text-[10px] font-bold text-emerald-400">STAR Formatted</span>
          </div>

          <ScrollArea className="h-80 pr-2 space-y-3">
            <div className="space-y-3 text-xs leading-relaxed">
              {result.structured.summary && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-primary">Strengthened Summary</span>
                  <p className="text-muted-foreground bg-secondary/40 p-2.5 rounded-xl border border-border/30">
                    {result.structured.summary}
                  </p>
                </div>
              )}

              {result.structured.experience?.map((exp, idx) => (
                <div key={idx} className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-primary">
                    {exp.role} @ {exp.company}
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground bg-secondary/40 p-2.5 rounded-xl border border-border/30">
                    {exp.points.map((pt, pIdx) => (
                      <li key={pIdx} className="text-xs">{pt}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
