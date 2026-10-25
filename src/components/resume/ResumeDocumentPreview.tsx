import React, { useState } from "react";
import { FileText, Download, Eye, Maximize2, Sparkles, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { toast } from "sonner";

interface ResumeDocumentPreviewProps {
  fileName?: string;
  extractedText?: string | null;
  atsScore?: number;
  onDownload?: () => void;
  isDownloading?: boolean;
}

export function ResumeDocumentPreview({
  fileName = "resume.pdf",
  extractedText,
  atsScore = 0,
  onDownload,
  isDownloading = false,
}: ResumeDocumentPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"formatted" | "raw">("formatted");

  const handleCopyText = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    toast.success("Resume text copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-card flex flex-col justify-between rounded-3xl p-6 h-full min-h-[500px]">
      <div className="space-y-4 flex-1 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-sm font-semibold text-foreground truncate">{fileName}</h3>
              <p className="text-[11px] text-muted-foreground">Original Document Analysis</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="rounded-xl border border-border/70 bg-secondary/40 p-0.5 flex text-[10px]">
              <button
                onClick={() => setViewMode("formatted")}
                className={`px-2 py-1 rounded-lg transition-colors ${
                  viewMode === "formatted" ? "bg-primary text-white font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Structure
              </button>
              <button
                onClick={() => setViewMode("raw")}
                className={`px-2 py-1 rounded-lg transition-colors ${
                  viewMode === "raw" ? "bg-primary text-white font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Text
              </button>
            </div>
          </div>
        </div>

        {/* Content Viewer Area */}
        <div className="flex-1 rounded-2xl border border-border/70 bg-background/50 p-4 min-h-[350px] relative overflow-hidden flex flex-col">
          {extractedText ? (
            <ScrollArea className="h-full max-h-[420px] pr-3 text-xs">
              {viewMode === "formatted" ? (
                <div className="space-y-3 font-sans text-muted-foreground leading-relaxed">
                  <div className="p-3 rounded-xl bg-secondary/30 border border-border/40 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Parsed Text Preview</span>
                    <p className="text-xs text-foreground font-mono whitespace-pre-wrap leading-relaxed">
                      {extractedText.slice(0, 1200)}
                      {extractedText.length > 1200 && "..."}
                    </p>
                  </div>
                </div>
              ) : (
                <pre className="font-mono text-[11px] text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
                  {extractedText}
                </pre>
              )}
            </ScrollArea>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2">
              <FileText className="h-10 w-10 text-muted-foreground/60" />
              <p className="text-xs font-medium text-foreground">Document Content Available</p>
              <p className="text-[11px] text-muted-foreground max-w-xs">
                Parsed keywords and ATS structure are indexed for analysis.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StatusBadge variant="success" dot>
            ATS Score: {atsScore}%
          </StatusBadge>
        </div>

        <div className="flex items-center gap-2">
          {extractedText && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyText}
              className="h-8 text-xs gap-1.5 rounded-xl border-border/70"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? "Copied" : "Copy Text"}</span>
            </Button>
          )}

          {onDownload && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              disabled={isDownloading}
              className="h-8 text-xs gap-1.5 rounded-xl border-border/70 text-foreground hover:bg-secondary"
            >
              <Download className="h-3.5 w-3.5 text-primary" />
              <span>{isDownloading ? "Downloading..." : "Download PDF"}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
