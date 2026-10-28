import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { Wand2, Sparkles, Loader2, Target, CheckCircle2, ArrowRight, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { GeneratedResumePreview } from "./GeneratedResumePreview";
import { ResumeDiffWorkspace } from "./ResumeDiffWorkspace";
import { resumeRewriteService } from "@/services/resumeRewrite";
import { getApiErrorMessage } from "@/services/api";
import { toast } from "sonner";
import { useCareerContext } from "@/hooks/useCareerContext";
import type { ResumeDetail, ResumeRewriteResponse } from "@/types";

interface ResumeOptimizeProps {
  resume: ResumeDetail | null;
  initialJobDescription?: string;
}

export function ResumeOptimize({ resume, initialJobDescription = "" }: ResumeOptimizeProps) {
  const { targetRole: contextTargetRole } = useCareerContext();
  const [originalText, setOriginalText] = useState(resume?.extracted_text || resume?.parsed_text || "");
  const [targetRole, setTargetRole] = useState(
    contextTargetRole && contextTargetRole !== "No Target Role Selected" ? contextTargetRole : ""
  );
  const [jobDescription, setJobDescription] = useState(initialJobDescription);
  const [result, setResult] = useState<ResumeRewriteResponse | null>(null);

  useEffect(() => {
    if (!originalText && (resume?.extracted_text || resume?.parsed_text)) {
      setOriginalText(resume.extracted_text || resume.parsed_text || "");
    }
  }, [resume, originalText]);

  const compositeJobDescription = useMemo(() => {
    return [
      `Target Role: ${targetRole}`,
      jobDescription ? `Job Description: ${jobDescription}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }, [targetRole, jobDescription]);

  const mutation = useMutation({
    mutationFn: () => resumeRewriteService.rewrite(originalText, compositeJobDescription),
    onSuccess: (data) => {
      setResult(data);
      toast.success("Resume optimized and compiled to LaTeX successfully!");
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err));
    },
  });

  const handleGenerate = () => {
    if (!targetRole.trim()) {
      toast.error("Please enter a target role (e.g. Senior Full-Stack Engineer) to focus optimization.");
      return;
    }
    if (!originalText.trim()) {
      toast.error("Please provide your original resume text or select an active resume.");
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Configuration & Input Panel */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
        <SectionHeader
          title="AI Resume Optimization & Tailoring Studio"
          subtitle="Generate tailored publication-grade LaTeX resumes optimized for target role ATS algorithms"
          icon={Wand2}
        />

        <div className="grid gap-6 lg:grid-cols-2 pt-2">
          {/* Left Column: Target Role & Optimization Focus */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-primary" /> Target Role
              </label>
              <Input
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Senior Full Stack Engineer"
                className="bg-secondary/40 border-border/80 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Target Job Description (Optional for 1-to-1 tailoring)
              </label>
              <Textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste requirements, core responsibilities, or desired tech stack..."
                className="min-h-[140px] bg-secondary/40 border-border/80 text-xs rounded-xl leading-relaxed resize-none"
              />
            </div>

            <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Optimization Enhancements Included
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> STAR bullet points
                </span>
                <span className="flex items-center gap-1 text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> ATS keyword density
                </span>
                <span className="flex items-center gap-1 text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> LaTeX formatting
                </span>
                <span className="flex items-center gap-1 text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Clean typography
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Source Resume Text & Generation Trigger */}
          <div className="space-y-4 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-primary" /> Source Resume Content
                </label>
                <span className="text-[10px] text-muted-foreground">
                  {originalText.length} characters loaded
                </span>
              </div>
              <Textarea
                value={originalText}
                onChange={(e) => setOriginalText(e.target.value)}
                placeholder="Resume text will be parsed automatically or you can paste content here..."
                className="min-h-[220px] bg-secondary/40 border-border/80 font-mono text-xs rounded-xl leading-relaxed resize-none"
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={mutation.isPending || !originalText.trim()}
              variant="gradient"
              className="w-full h-11 gap-2 text-xs font-bold text-white shadow-lg hover:shadow-primary/25 hover:scale-[1.01] transition-all"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Optimizing & Compiling LaTeX PDF...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate AI Optimized Resume</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Loading Banner when Pending */}
      {mutation.isPending && (
        <div className="glass-card rounded-3xl p-8 text-center space-y-3 animate-pulse">
          <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
          <h3 className="font-display text-base font-semibold text-foreground">
            Lakshya AI is optimizing your resume...
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Restructuring experience bullets into high-impact STAR statements and compiling into professional LaTeX PDF.
          </p>
        </div>
      )}

      {/* Error Banner when Failed */}
      {mutation.isError && !mutation.isPending && (
        <div className="glass-card rounded-3xl p-6 border border-rose-500/20 bg-rose-500/5 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-rose-400 font-semibold text-sm">
            <AlertCircle className="h-5 w-5" />
            <span>AI Resume Optimization Failed</span>
          </div>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {getApiErrorMessage(mutation.error)}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            className="gap-2 text-xs border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Try Again</span>
          </Button>
        </div>
      )}

      {/* Generated Result Output */}
      {result && (
        <div className="space-y-6">
          <GeneratedResumePreview
            result={result}
            onRegenerate={handleGenerate}
            isRegenerating={mutation.isPending}
            parentResumeId={resume?.id}
            targetRoleTitle={targetRole}
            jobDescription={jobDescription}
          />
          <ResumeDiffWorkspace originalText={originalText} result={result} />
        </div>
      )}
    </div>
  );
}
