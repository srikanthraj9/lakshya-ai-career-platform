import React, { useState } from "react";
import { Download, Copy, Check, FileText, Code2, Eye, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { resumeRewriteService } from "@/services/resumeRewrite";
import { toast } from "sonner";
import type { ResumeRewriteResponse } from "@/types";

interface GeneratedResumePreviewProps {
  result: ResumeRewriteResponse;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

export function GeneratedResumePreview({
  result,
  onRegenerate,
  isRegenerating = false,
}: GeneratedResumePreviewProps) {
  const [copied, setCopied] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleCopyLatex = () => {
    navigator.clipboard.writeText(result.latex);
    setCopied(true);
    toast.success("LaTeX code copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLatex = () => {
    const blob = new Blob([result.latex], { type: "text/x-tex" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "optimized_resume.tex";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Downloaded LaTeX source (.tex)");
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const blob = await resumeRewriteService.downloadPdf(result.pdf_url);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "optimized_resume.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Downloaded optimized PDF");
    } catch (err) {
      toast.error("Failed to download compiled PDF. Please download the LaTeX source.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="glass-card rounded-3xl p-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <h3 className="font-display text-lg font-bold text-foreground">AI Optimized Resume Document</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Compiled into high-precision, publication-grade LaTeX formatting.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {onRegenerate && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="h-8 gap-1.5 text-xs rounded-xl border-border"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
              <span>Regenerate</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLatex}
            className="h-8 gap-1.5 text-xs rounded-xl border-border"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "Copied" : "Copy LaTeX"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadLatex}
            className="h-8 gap-1.5 text-xs rounded-xl border-border"
          >
            <Code2 className="h-3.5 w-3.5 text-primary" />
            <span>Download .TEX</span>
          </Button>

          <Button
            variant="gradient"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="h-8 gap-1.5 text-xs font-semibold text-white shadow-md"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{downloadingPdf ? "Compiling..." : "Download PDF"}</span>
          </Button>
        </div>
      </div>

      {/* Tabs for PDF & LaTeX Code Preview */}
      <Tabs defaultValue="structured" className="w-full">
        <TabsList className="bg-secondary/40 p-1 rounded-xl">
          <TabsTrigger value="structured" className="text-xs gap-1.5 rounded-lg">
            <Eye className="h-3.5 w-3.5" />
            <span>Structured Preview</span>
          </TabsTrigger>
          <TabsTrigger value="latex" className="text-xs gap-1.5 rounded-lg">
            <Code2 className="h-3.5 w-3.5" />
            <span>LaTeX Source</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="structured" className="mt-4">
          <div className="rounded-2xl border border-border/70 bg-secondary/20 p-6 space-y-6">
            {/* Header / Contact info */}
            <div className="text-center space-y-1 pb-4 border-b border-border/40">
              <h2 className="font-display text-xl font-bold text-foreground">{result.structured.name}</h2>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {result.structured.email && <span>{result.structured.email}</span>}
                {result.structured.phone && <span>• {result.structured.phone}</span>}
                {result.structured.linkedin && <span>• {result.structured.linkedin}</span>}
                {result.structured.github && <span>• {result.structured.github}</span>}
              </div>
            </div>

            {/* Summary */}
            {result.structured.summary && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Professional Summary</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{result.structured.summary}</p>
              </div>
            )}

            {/* Experience */}
            {result.structured.experience?.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Work Experience</h4>
                <div className="space-y-3">
                  {result.structured.experience.map((exp, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-foreground">
                        <span>{exp.role} — {exp.company}</span>
                        <span className="text-muted-foreground font-normal">{exp.duration}</span>
                      </div>
                      <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                        {exp.points.map((pt, pIdx) => (
                          <li key={pIdx} className="leading-relaxed">{pt}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Projects */}
            {result.structured.projects?.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Key Projects</h4>
                <div className="space-y-3">
                  {result.structured.projects.map((proj, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-foreground">
                        <span>{proj.title}</span>
                        <span className="text-muted-foreground font-normal">{proj.duration}</span>
                      </div>
                      <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                        {proj.points.map((pt, pIdx) => (
                          <li key={pIdx} className="leading-relaxed">{pt}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="latex" className="mt-4">
          <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
            <ScrollArea className="h-96 w-full pr-3">
              <pre className="font-mono text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                {result.latex}
              </pre>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
