import React, { useState } from "react";
import {
  Download,
  Copy,
  Check,
  FileText,
  Code2,
  Eye,
  Sparkles,
  RefreshCw,
  Save,
  GitBranch,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { resumeRewriteService } from "@/services/resumeRewrite";
import { resumeService } from "@/services/resume";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import type { ResumeRewriteResponse, ResumeSaveVersionResponse } from "@/types";

interface GeneratedResumePreviewProps {
  result: ResumeRewriteResponse;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  parentResumeId?: string;
  targetRoleTitle?: string;
  jobDescription?: string;
  onVersionSaved?: (saved: ResumeSaveVersionResponse) => void;
}

export function GeneratedResumePreview({
  result,
  onRegenerate,
  isRegenerating = false,
  parentResumeId,
  targetRoleTitle,
  jobDescription,
  onVersionSaved,
}: GeneratedResumePreviewProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [copied, setCopied] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const [versionLabel, setVersionLabel] = useState("v2.0 (AI Optimized)");
  const [savedVersion, setSavedVersion] = useState<ResumeSaveVersionResponse | null>(null);

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
    } catch {
      toast.error("Failed to download compiled PDF. Please download the LaTeX source.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSaveAsVersion = async () => {
    if (!result.document_id) {
      toast.error("Rewrite document ID is missing. Please regenerate.");
      return;
    }
    try {
      setIsSavingVersion(true);
      const saved = await resumeService.saveRewriteVersion(result.document_id, {
        version_label: versionLabel.trim() || undefined,
        target_role_title: targetRoleTitle?.trim() || undefined,
        job_description: jobDescription?.trim() || undefined,
      });

      setSavedVersion(saved);
      toast.success(`Saved as ${saved.version_label} in Resume Version History!`);

      if (user?.id) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.resumes.all(user.id) });
      }

      if (onVersionSaved) {
        onVersionSaved(saved);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to save rewrite version");
    } finally {
      setIsSavingVersion(false);
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

          {!savedVersion ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveAsVersion}
              disabled={isSavingVersion}
              className="h-8 gap-1.5 text-xs rounded-xl border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
            >
              <Save className={`h-3.5 w-3.5 ${isSavingVersion ? "animate-spin" : ""}`} />
              <span>{isSavingVersion ? "Saving..." : "Save as New Version"}</span>
            </Button>
          ) : (
            <StatusBadge variant="success" className="text-xs py-1 px-2.5">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              <span>{savedVersion.version_label} Saved</span>
            </StatusBadge>
          )}
        </div>
      </div>

      {/* Version Saved Lineage & Score Delta Banner */}
      {savedVersion && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-foreground">
                Saved as Version {savedVersion.version_number}.0 ({savedVersion.version_label})
              </span>
            </div>
            {savedVersion.score_delta !== null && savedVersion.score_delta !== undefined && (
              <div className="flex items-center gap-1.5">
                <StatusBadge
                  variant={savedVersion.score_delta >= 0 ? "success" : "warning"}
                  className="text-xs font-bold"
                >
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {savedVersion.score_delta >= 0 ? `+${savedVersion.score_delta}%` : `${savedVersion.score_delta}%`} ATS Score Delta
                </StatusBadge>
              </div>
            )}
          </div>

          {savedVersion.delta_explanation && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {savedVersion.delta_explanation}
            </p>
          )}

          {/* Fact-Checking Warnings */}
          {savedVersion.validation_warnings && savedVersion.validation_warnings.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Fact-Checking Verification Notice</span>
              </div>
              <ul className="list-disc list-inside text-[11px] text-amber-200/90 space-y-0.5">
                {savedVersion.validation_warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

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
