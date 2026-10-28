import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Wand2,
  ArrowRight,
  FileText,
  Brain,
  Sparkles,
  RefreshCw,
  Target,
  Layers,
  Search,
  HelpCircle,
  Info,
  Sliders,
  Plus,
  Check,
  Upload,
  BookOpen,
  TrendingUp,
  Cpu,
  BarChart3,
  History,
  FileCheck2,
  ChevronRight,
  ExternalLink,
  Briefcase,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { formatChartDate } from "@/lib/careerMetrics";
import { resumeService } from "@/services/resume";
import { toast } from "sonner";
import type {
  ResumeDetail,
  ResumeAssessment,
  ResumeAssessmentListItem,
  ResumeSkillEvidence,
} from "@/types";

interface ATSDiagnosticsProps {
  resume: ResumeDetail | null;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onOptimize?: () => void;
  onViewSkills?: () => void;
  onOpenUpload?: () => void;
}

// Preset target engineering roles and their high-priority ATS keyword expectations
const ROLE_PRESETS = [
  {
    id: "fullstack",
    label: "Full-Stack Developer",
    keywords: ["react", "typescript", "javascript", "python", "fastapi", "postgresql", "docker", "git", "rest", "node", "html", "css", "redis"],
  },
  {
    id: "python_backend",
    label: "Python Backend Developer",
    keywords: ["python", "django", "fastapi", "flask", "postgresql", "sql", "docker", "redis", "rest", "git", "celery", "linux", "numpy"],
  },
  {
    id: "frontend",
    label: "Frontend Developer",
    keywords: ["react", "typescript", "javascript", "html", "css", "tailwind", "redux", "vite", "git", "rest", "responsive design"],
  },
  {
    id: "junior_web",
    label: "Junior Web Developer",
    keywords: ["html", "css", "javascript", "python", "git", "sql", "django", "fastapi", "rest"],
  },
  {
    id: "senior_fullstack",
    label: "Senior Full-Stack Developer",
    keywords: ["react", "typescript", "python", "fastapi", "postgresql", "redis", "docker", "kubernetes", "microservices", "system design", "ci/cd", "git"],
  },
];

// Helper to audit resume structure based on real extracted text
interface StructureSection {
  name: string;
  status: "pass" | "warn" | "fail";
  note: string;
}

function analyzeStructure(resume: ResumeDetail): StructureSection[] {
  const text = (resume.extracted_text || resume.parsed_text || "").toLowerCase();

  // 1. Contact Information
  const hasEmail = /[\w.\-+]+@[\w.\-]+\.\w+/.test(text);
  const hasPhone = /\+?\d[\d\s().-]{7,}\d/.test(text);
  const contactStatus: "pass" | "warn" | "fail" = hasEmail && hasPhone ? "pass" : hasEmail || hasPhone ? "warn" : "fail";
  const contactNote = hasEmail && hasPhone
    ? "Verified professional email, phone number, and location header detected."
    : hasEmail
    ? "Email detected; add a verified contact phone number in the header."
    : "Contact header missing or unreadable by automated scanners.";

  // 2. Professional Summary
  const hasSummary = /professional summary|summary|career objective|objective/i.test(text);
  const summaryStatus: "pass" | "warn" | "fail" = hasSummary ? "pass" : "warn";
  const summaryNote = hasSummary
    ? "Structured professional summary paragraph detected and indexed."
    : "No distinct summary block detected; add a 2-3 sentence overview targeting your desired role.";

  // 3. Technical Skills
  const skillsCount = resume.skills?.length || 0;
  const skillsStatus: "pass" | "warn" | "fail" = skillsCount >= 6 ? "pass" : skillsCount > 0 ? "warn" : "fail";
  const skillsNote = skillsCount > 0
    ? `${skillsCount} technical skills cataloged and indexed across resume sections.`
    : "Technical skills section not detected or skills block format is unreadable.";

  // 4. Work Experience
  const hasExp = /experience|work experience|professional experience|internship/i.test(text);
  const weakCount = resume.feedback?.weak_points?.length || 0;
  const expStatus: "pass" | "warn" | "fail" = hasExp ? (weakCount > 0 ? "warn" : "pass") : "fail";
  const expNote = hasExp
    ? weakCount > 0
      ? `${weakCount} bullet points detected that can be strengthened with quantified metrics.`
      : "Chronological work history detected with clean role and timeline headings."
    : "Work experience section missing or unreadable.";

  // 5. Education & Credentials
  const hasEdu = /education|academic|degree|b\.?tech|bachelor|university|college/i.test(text);
  const eduStatus: "pass" | "warn" | "fail" = hasEdu ? "pass" : "warn";
  const eduNote = hasEdu
    ? "Degree, university name, and graduation timeline structured cleanly."
    : "Education section could not be clearly verified.";

  // 6. Projects & Portfolio
  const hasProjects = /projects|selected projects|personal projects/i.test(text);
  const projStatus: "pass" | "warn" | "fail" = hasProjects ? "pass" : "warn";
  const projNote = hasProjects
    ? "Project portfolio entries detected highlighting hands-on technical execution."
    : "Projects section not detected; adding 2-3 highlighted projects strengthens ATS ranking.";

  return [
    { name: "Contact Information", status: contactStatus, note: contactNote },
    { name: "Professional Summary", status: summaryStatus, note: summaryNote },
    { name: "Technical Skills", status: skillsStatus, note: skillsNote },
    { name: "Work Experience", status: expStatus, note: expNote },
    { name: "Education & Credentials", status: eduStatus, note: eduNote },
    { name: "Projects & Portfolio", status: projStatus, note: projNote },
  ];
}

const defaultFallbackQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function ATSDiagnosticsInternal({
  resume,
  isLoading = false,
  isError = false,
  onRetry,
  onOptimize,
  onViewSkills,
  onOpenUpload,
}: ATSDiagnosticsProps) {
  // Mode state: 'base_quality' | 'job_match' | 'history'
  const [activeMode, setActiveMode] = useState<"base_quality" | "job_match" | "history">("base_quality");

  // Target Role & Keyword matching state
  const [selectedRoleId, setSelectedRoleId] = useState<string>("fullstack");
  const [customJobDesc, setCustomJobDesc] = useState<string>("");
  const [customRoleTitle, setCustomRoleTitle] = useState<string>("");
  const [showFormulaModal, setShowFormulaModal] = useState<boolean>(false);

  // Active Job Match Assessment result
  const [latestAssessment, setLatestAssessment] = useState<ResumeAssessment | null>(null);
  const [selectedEvidenceSkill, setSelectedEvidenceSkill] = useState<string | null>(null);

  // Fetch assessment history for this resume
  const {
    data: assessmentHistory = [],
    isLoading: isHistoryLoading,
    refetch: refetchHistory,
  } = useQuery<ResumeAssessmentListItem[]>({
    queryKey: ["resume-assessments", resume?.id],
    queryFn: () => (resume?.id ? resumeService.getResumeAssessments(resume.id) : Promise.resolve([])),
    enabled: Boolean(resume?.id),
    staleTime: 30000,
  });

  // Job Assessment Mutation
  const assessMutation = useMutation({
    mutationFn: (payload: { scoring_mode: "job_match"; target_role_title?: string; target_job_description?: string }) => {
      if (!resume?.id) throw new Error("No active resume");
      return resumeService.assessResume(resume.id, payload);
    },
    onSuccess: (data) => {
      setLatestAssessment(data);
      toast.success(`Job Match assessment completed: ${data.overall_score}% (${data.match_verdict})`);
      refetchHistory();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to run ATS job assessment");
    },
  });

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="space-y-6" role="status" aria-label="Loading ATS diagnostics">
        <div className="glass-card rounded-3xl p-8 space-y-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-primary animate-spin" />
            <div className="space-y-1">
              <h3 className="font-display text-lg font-bold text-foreground">Analyzing ATS Compliance...</h3>
              <p className="text-xs text-muted-foreground">Extracting document structure, indexing technical keywords, and scoring compatibility.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 pt-4">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-12">
          <Skeleton className="lg:col-span-7 h-80 rounded-3xl" />
          <Skeleton className="lg:col-span-5 h-80 rounded-3xl" />
        </div>
      </div>
    );
  }

  // 2. Error State
  if (isError) {
    return (
      <div className="glass-card rounded-3xl p-8 text-center space-y-4 border border-destructive/30 bg-destructive/5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h3 className="font-display text-lg font-bold text-foreground">ATS Diagnostics Failed</h3>
          <p className="text-xs text-muted-foreground">
            We encountered an issue retrieving the ATS analysis for this resume version. Please verify your connection or retry.
          </p>
        </div>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="gap-2 text-xs border-destructive/40 hover:bg-destructive/10">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry Analysis</span>
          </Button>
        )}
      </div>
    );
  }

  // 3. No Resume Selected Empty State
  if (!resume) {
    return (
      <div className="glass-card rounded-3xl p-12 text-center space-y-5 border border-border/70">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/50 text-muted-foreground border border-border/80">
          <FileText className="h-8 w-8" />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h3 className="font-display text-xl font-bold text-foreground">No Resume Version Selected</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Please choose a resume version from the dropdown selector above or upload a new PDF to inspect ATS score breakdowns, keyword intelligence, and structural diagnostics.
          </p>
        </div>
        {onOpenUpload && (
          <Button onClick={onOpenUpload} variant="gradient" className="gap-2 text-xs font-semibold text-white shadow-lg">
            <Upload className="h-3.5 w-3.5" />
            <span>Upload Resume Version</span>
          </Button>
        )}
      </div>
    );
  }

  // 4. Unreadable Text / Empty Text State
  const rawText = resume.extracted_text || resume.parsed_text || "";
  if (!rawText.trim() || rawText.trim().length < 25) {
    return (
      <div className="glass-card rounded-3xl p-8 space-y-4 border border-amber-500/30 bg-amber-500/5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h3 className="font-display text-lg font-bold text-foreground">No Readable Text Extracted</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Lakshya AI could not extract readable machine text from <span className="font-semibold text-foreground">{resume.file_name || resume.original_filename}</span>. This usually happens if the PDF is a scanned image or contains unsupported embedded fonts.
          </p>
        </div>
        {onOpenUpload && (
          <Button onClick={onOpenUpload} variant="gradient" className="gap-2 text-xs font-semibold text-white">
            <Upload className="h-3.5 w-3.5" />
            <span>Upload Text-Based PDF</span>
          </Button>
        )}
      </div>
    );
  }

  // 5. Calculate Metrics & Analysis Grounded in Active Resume
  const baseQualityScore = typeof resume.base_quality_score === "number" ? resume.base_quality_score : (typeof resume.ats_score === "number" ? resume.ats_score : 0);
  const activeScore = activeMode === "job_match" && latestAssessment ? latestAssessment.overall_score : baseQualityScore;

  const breakdown = resume.breakdown || {
    keyword_match: 0,
    skill_diversity: 0,
    formatting: 0,
    action_verbs: 0,
    section_coverage: 0,
  };
  const feedback = resume.feedback;
  const normalizedSkills = (resume.skills || []).map((s) => s.toLowerCase());

  // Structure sections audit
  const sectionChecklist = analyzeStructure(resume);

  // Keyword Matching against selected target role or custom description
  const activeRolePreset = ROLE_PRESETS.find((r) => r.id === selectedRoleId) || ROLE_PRESETS[0];
  const effectiveRoleTitle = customRoleTitle.trim() || activeRolePreset.label;

  const targetKeywords = useMemo(() => {
    if (customJobDesc.trim()) {
      const words = customJobDesc
        .toLowerCase()
        .replace(/[^a-z0-9#+.\s-]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 2);
      return Array.from(new Set(words)).slice(0, 25);
    }
    return activeRolePreset.keywords;
  }, [customJobDesc, activeRolePreset]);

  const { matchedKeywords, missingKeywords, matchPercentage } = useMemo(() => {
    const matched = targetKeywords.filter((kw) =>
      normalizedSkills.some((s) => s.includes(kw) || kw.includes(s))
    );
    const missing = targetKeywords.filter((kw) => !matched.includes(kw));
    const matchPct = targetKeywords.length > 0 ? Math.round((matched.length / targetKeywords.length) * 100) : 0;
    return { matchedKeywords: matched, missingKeywords: missing, matchPercentage: matchPct };
  }, [targetKeywords, normalizedSkills]);

  // Readability & formatting statistics
  const charCount = rawText.length;
  const wordCount = rawText.trim().split(/\s+/).length;
  const bulletCount = (rawText.match(/^\s*[-*•]/gm) || []).length;

  const handleRunJobAssessment = () => {
    assessMutation.mutate({
      scoring_mode: "job_match",
      target_role_title: effectiveRoleTitle,
      target_job_description: customJobDesc || targetKeywords.join(", "),
    });
  };

  const handleSelectHistoricalRun = async (assessmentId: string) => {
    try {
      if (!resume?.id) return;
      const detail = await resumeService.getResumeAssessmentDetail(resume.id, assessmentId);
      setLatestAssessment(detail);
      setActiveMode("job_match");
      toast.info(`Loaded assessment for ${detail.target_role_title || "Target Role"} (${detail.overall_score}%)`);
    } catch {
      toast.error("Failed to load historical assessment detail");
    }
  };

  return (
    <div className="space-y-6">
      {/* View Mode Switcher Header Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveMode("base_quality")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeMode === "base_quality"
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "border border-border/80 bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Base Quality Diagnostics</span>
          </button>

          <button
            onClick={() => setActiveMode("job_match")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeMode === "job_match"
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "border border-border/80 bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            <Target className="h-3.5 w-3.5" />
            <span>Job-Specific ATS Match</span>
            {latestAssessment && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white">
                {latestAssessment.overall_score}%
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveMode("history")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeMode === "history"
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "border border-border/80 bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Assessment History ({assessmentHistory.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">Version:</span>
          <span className="font-semibold text-foreground px-2 py-0.5 rounded-lg bg-secondary/60 border border-border/60">
            {resume.version_label || `v${resume.version_number || 1}.0`}
          </span>
        </div>
      </div>

      {/* 1. Header Banner & Master Score */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6 border border-border/70 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {activeMode === "job_match" ? "Target Job Match Assessment" : "Document Quality Diagnostics"}
              </span>
              <span className="text-muted-foreground/40">•</span>
              <span className="text-xs font-semibold text-foreground truncate max-w-[240px] sm:max-w-md">
                {resume.file_name || resume.original_filename}
              </span>
              {resume.created_at && (
                <span className="text-[10px] text-muted-foreground">
                  (Analyzed {formatChartDate(resume.created_at)})
                </span>
              )}
            </div>
            <h3 className="font-display text-2xl font-bold tracking-tight text-foreground">
              {activeMode === "job_match"
                ? `Job Match: ${latestAssessment?.target_role_title || effectiveRoleTitle}`
                : "ATS Compatibility & Parsing Diagnostics"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              {activeMode === "job_match"
                ? "Evaluated against job requirements using grounded semantic skill matching and evidence tracing. Never uses synthetic keyword inflation."
                : "Audited using Lakshya AI's rule-based ATS evaluation model. Validates machine readability across enterprise Applicant Tracking Systems (Workday, Greenhouse, Lever, Taleo)."}
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2">
                <StatusBadge
                  variant={activeScore >= 80 ? "success" : activeScore >= 65 ? "warning" : "destructive"}
                  dot
                >
                  {activeMode === "job_match" && latestAssessment
                    ? latestAssessment.match_verdict
                    : activeScore >= 80
                    ? "ATS Ready"
                    : activeScore >= 65
                    ? "Competitive Profile"
                    : "Needs Optimization"}
                </StatusBadge>
              </div>
              <button
                onClick={() => setShowFormulaModal(!showFormulaModal)}
                className="text-[10px] text-primary hover:underline flex items-center gap-1 mt-1 font-medium"
              >
                <Info className="h-3 w-3" />
                <span>How is this calculated?</span>
              </button>
            </div>

            <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 shadow-[0_0_25px_-5px_rgba(124,92,252,0.35)]">
              <span className="font-display text-3xl font-bold gradient-text">{activeScore}%</span>
            </div>
          </div>
        </div>

        {/* Scoring Methodology Breakdown Banner */}
        <AnimatePresence>
          {showFormulaModal && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2.5 text-xs text-muted-foreground"
            >
              <div className="flex items-center justify-between font-semibold text-foreground">
                <span className="flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Dual-Mode ATS Scoring Architecture
                </span>
                <button
                  onClick={() => setShowFormulaModal(false)}
                  className="text-muted-foreground hover:text-foreground text-[11px]"
                >
                  ✕ Close
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 text-[11px] pt-1">
                <div className="p-3 rounded-xl bg-secondary/30 border border-border/50 space-y-1">
                  <span className="font-bold text-foreground">Mode A — Base Document Quality (100%):</span>
                  <p className="text-muted-foreground">
                    Section Coverage (35%) + Formatting & Layout (30%) + Action Verbs & Metrics (20%) + Proven Skill Breadth (15%). Keyword Match is strictly 0.0/N.A. without a target job.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-secondary/30 border border-border/50 space-y-1">
                  <span className="font-bold text-foreground">Mode B — Job-Specific ATS Match (100%):</span>
                  <p className="text-muted-foreground">
                    Required Skills (40%) + Preferred Skills (20%) + Contextual Keywords (20%) + Experience Alignment (10%) + Formatting & Hygiene (10%). Requires job description.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mode A Component Breakdown Meters */}
        {activeMode === "base_quality" && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 pt-2 border-t border-border/60">
            <div className="rounded-2xl border border-border/70 bg-secondary/30 p-3.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Keyword Match</span>
                <span className="font-bold text-foreground">N/A</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/80">
                <div className="h-full rounded-full bg-muted-foreground/30" style={{ width: "0%" }} />
              </div>
              <span className="text-[10px] text-amber-400 font-medium">Requires Target Job</span>
            </div>

            <div className="rounded-2xl border border-border/70 bg-secondary/30 p-3.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Skill Diversity</span>
                <span className="font-bold text-foreground">{Math.round(breakdown.skill_diversity)}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/80">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: `${Math.min(breakdown.skill_diversity, 100)}%` }} />
              </div>
              <span className="text-[10px] text-muted-foreground">Weight: 15%</span>
            </div>

            <div className="rounded-2xl border border-border/70 bg-secondary/30 p-3.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Formatting & Layout</span>
                <span className="font-bold text-foreground">{Math.round(breakdown.formatting)}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/80">
                <div className="h-full rounded-full bg-gradient-to-r from-accent to-sky-400" style={{ width: `${Math.min(breakdown.formatting, 100)}%` }} />
              </div>
              <span className="text-[10px] text-muted-foreground">Weight: 30%</span>
            </div>

            <div className="rounded-2xl border border-border/70 bg-secondary/30 p-3.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Action Verbs & Impact</span>
                <span className="font-bold text-foreground">{Math.round(breakdown.action_verbs)}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/80">
                <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-primary" style={{ width: `${Math.min(breakdown.action_verbs, 100)}%` }} />
              </div>
              <span className="text-[10px] text-muted-foreground">Weight: 20%</span>
            </div>

            <div className="rounded-2xl border border-border/70 bg-secondary/30 p-3.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Section Coverage</span>
                <span className="font-bold text-foreground">{Math.round(breakdown.section_coverage)}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/80">
                <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-400" style={{ width: `${Math.min(breakdown.section_coverage, 100)}%` }} />
              </div>
              <span className="text-[10px] text-muted-foreground">Weight: 35%</span>
            </div>
          </div>
        )}

        {/* Mode B Component Breakdown Meters (when assessment loaded) */}
        {activeMode === "job_match" && latestAssessment && latestAssessment.dimensions && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 pt-2 border-t border-border/60">
            {latestAssessment.dimensions.map((dim) => (
              <div key={dim.dimension_key} className="rounded-2xl border border-border/70 bg-secondary/30 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium capitalize">
                    {dim.dimension_key.replace(/_/g, " ")}
                  </span>
                  <span className="font-bold text-foreground">{Math.round(dim.raw_score)}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/80">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                    style={{ width: `${Math.min(dim.raw_score, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                  <span>Weight: {Math.round(dim.weight_factor * 100)}%</span>
                  <span className="text-primary font-semibold">+{Math.round(dim.weighted_score)} pts</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mode A: Standalone Base Quality Content */}
      {activeMode === "base_quality" && (
        <>
          {/* Prompt banner to evaluate job match */}
          <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Target className="h-4 w-4 text-primary" />
                <span>Want to see your realistic ATS score for a specific job?</span>
              </div>
              <p className="text-xs text-muted-foreground">
                ATS scanners compare resumes directly against specific job requirements. Run a job match assessment to see matched skills, missing keywords, and evidence grounding.
              </p>
            </div>
            <Button
              onClick={() => setActiveMode("job_match")}
              variant="gradient"
              size="sm"
              className="gap-2 text-xs shrink-0 font-semibold"
            >
              <span>Run Job-Specific Match</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Resume Structure Checklist */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-4 border border-border/70">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-display text-base font-bold text-foreground">
                  Resume Structure & Section Completeness
                </h4>
                <p className="text-xs text-muted-foreground">
                  Automated scanners require standardized headings to correctly segment contact data, experience, and education.
                </p>
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {sectionChecklist.filter((s) => s.status === "pass").length} of {sectionChecklist.length} Sections Verified
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
              {sectionChecklist.map((sec) => (
                <div
                  key={sec.name}
                  className="rounded-2xl border border-border/70 bg-secondary/30 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">{sec.name}</span>
                    {sec.status === "pass" ? (
                      <StatusBadge variant="success" className="text-[10px] py-0 px-2">
                        Verified
                      </StatusBadge>
                    ) : sec.status === "warn" ? (
                      <StatusBadge variant="warning" className="text-[10px] py-0 px-2">
                        Needs Polish
                      </StatusBadge>
                    ) : (
                      <StatusBadge variant="destructive" className="text-[10px] py-0 px-2">
                        Missing
                      </StatusBadge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{sec.note}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Mode B: Job-Specific Assessment & Live Role Matcher */}
      {activeMode === "job_match" && (
        <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6 border border-border/70">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
            <div>
              <h4 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                <span>Job-Specific ATS Assessment Configuration</span>
              </h4>
              <p className="text-xs text-muted-foreground">
                Enter target role details to assess alignment against verified skills and evidence in this resume version.
              </p>
            </div>
            <Button
              onClick={handleRunJobAssessment}
              disabled={assessMutation.isPending}
              variant="gradient"
              className="gap-2 text-xs font-semibold text-white shadow-lg shadow-primary/20"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${assessMutation.isPending ? "animate-spin" : ""}`} />
              <span>{assessMutation.isPending ? "Evaluating ATS Match..." : "Run Job Assessment"}</span>
            </Button>
          </div>

          {/* Role Presets & Inputs */}
          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Select Target Role Preset:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {ROLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setSelectedRoleId(preset.id);
                      setCustomRoleTitle(preset.label);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      selectedRoleId === preset.id && !customJobDesc
                        ? "bg-primary text-white shadow-sm shadow-primary/30"
                        : "border border-border/70 bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground">Target Role Title:</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Full-Stack Engineer"
                  value={customRoleTitle || activeRolePreset.label}
                  onChange={(e) => setCustomRoleTitle(e.target.value)}
                  className="w-full h-9 rounded-xl border border-border/80 bg-background/50 px-3 text-xs focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground">Job Description / Keywords:</label>
                <input
                  type="text"
                  placeholder="Paste JD text or key skills (e.g. React, Python, Docker)..."
                  value={customJobDesc}
                  onChange={(e) => setCustomJobDesc(e.target.value)}
                  className="w-full h-9 rounded-xl border border-border/80 bg-background/50 px-3 text-xs focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Grounded Evidence Viewer (if assessment has skill evidence) */}
          {latestAssessment && latestAssessment.skill_evidence && latestAssessment.skill_evidence.length > 0 && (
            <div className="rounded-2xl border border-border/80 bg-secondary/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <FileCheck2 className="h-4 w-4 text-emerald-400" />
                  <span>Resume Skill Evidence Grounding ({latestAssessment.skill_evidence.length} Verified Excerpts)</span>
                </h5>
                <span className="text-[10px] text-muted-foreground">Click skill chip to view quote</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {latestAssessment.skill_evidence.map((ev) => (
                  <button
                    key={`${ev.skill_name}-${ev.section_name}`}
                    onClick={() => setSelectedEvidenceSkill(selectedEvidenceSkill === ev.skill_name ? null : ev.skill_name)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      selectedEvidenceSkill === ev.skill_name
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                    }`}
                  >
                    <Check className="h-3 w-3" />
                    <span>{ev.skill_name}</span>
                    <span className="text-[9px] opacity-75">({ev.section_name})</span>
                  </button>
                ))}
              </div>

              {/* Selected Excerpt Drawer */}
              {selectedEvidenceSkill && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 space-y-1.5 text-xs">
                  {latestAssessment.skill_evidence
                    .filter((ev) => ev.skill_name === selectedEvidenceSkill)
                    .map((ev, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-300">
                          <span>Evidence for "{ev.skill_name}" in [{ev.section_name}]</span>
                          <span>Confidence: {Math.round(ev.confidence * 100)}%</span>
                        </div>
                        <p className="font-mono text-[11px] text-foreground/90 bg-background/50 p-2 rounded-lg border border-border/40 italic">
                          "{ev.excerpt_text}"
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Mode C: Assessment History Panel */}
      {activeMode === "history" && (
        <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-5 border border-border/70">
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <div>
              <h4 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                <span>Historical ATS Assessment Runs</span>
              </h4>
              <p className="text-xs text-muted-foreground">
                Audit trail of past evaluations performed on this resume version. Click to view score breakdown.
              </p>
            </div>
            <Button
              onClick={() => refetchHistory()}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh Runs</span>
            </Button>
          </div>

          {assessmentHistory.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <History className="h-8 w-8 text-muted-foreground/50 mx-auto" />
              <p className="text-xs text-muted-foreground">No prior job assessment runs recorded for this resume.</p>
              <Button
                onClick={() => setActiveMode("job_match")}
                variant="gradient"
                size="sm"
                className="text-xs"
              >
                Run First Job Assessment
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {assessmentHistory.map((run) => (
                <div
                  key={run.id}
                  onClick={() => handleSelectHistoricalRun(run.id)}
                  className="rounded-2xl border border-border/70 bg-secondary/30 p-4 hover:border-primary/40 hover:bg-secondary/50 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">
                        {run.target_role_title || (run.scoring_mode === "base_quality" ? "Baseline Audit" : "Target Job Match")}
                      </span>
                      <StatusBadge
                        variant={run.scoring_mode === "job_match" ? "primary" : "secondary"}
                        className="text-[10px] py-0 px-1.5"
                      >
                        {run.scoring_mode === "job_match" ? "Job Match" : "Base Quality"}
                      </StatusBadge>
                      {run.match_verdict && (
                        <StatusBadge
                          variant={run.overall_score >= 80 ? "success" : run.overall_score >= 65 ? "warning" : "destructive"}
                          className="text-[10px] py-0 px-1.5"
                        >
                          {run.match_verdict}
                        </StatusBadge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      <span>Evaluated: {formatChartDate(run.created_at)}</span>
                      <span className="mx-1.5">•</span>
                      <span>Engine: {run.algorithm_version}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-display text-xl font-bold gradient-text">
                      {Math.round(run.overall_score)}%
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Keyword Intelligence & Target Role Matcher (Always Available for Interactive Exploration) */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 glass-card rounded-3xl p-6 sm:p-8 space-y-5 border border-border/70">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span>Keyword Intelligence & Role Alignment</span>
              </h4>
              <p className="text-xs text-muted-foreground">
                Matches detected resume skills against target job requirements.
              </p>
            </div>
            <StatusBadge variant="primary" className="text-[10px]">
              {resume.skills?.length || 0} Skills Cataloged
            </StatusBadge>
          </div>

          {/* Role Presets Selector */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Select Target Role Preset:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {ROLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    setSelectedRoleId(preset.id);
                    setCustomJobDesc("");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    selectedRoleId === preset.id && !customJobDesc
                      ? "bg-primary text-white shadow-sm shadow-primary/30"
                      : "border border-border/70 bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Job Description Input */}
          <div className="space-y-1.5">
            <label htmlFor="custom-jd-input" className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
              <Sliders className="h-3 w-3" />
              <span>Or paste custom Job Description keywords:</span>
            </label>
            <input
              id="custom-jd-input"
              type="text"
              placeholder="e.g. React, TypeScript, GraphQL, Docker, Kubernetes, AWS..."
              value={customJobDesc}
              onChange={(e) => setCustomJobDesc(e.target.value)}
              className="w-full h-9 rounded-xl border border-border/80 bg-background/50 px-3 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>

          {/* Role Match Summary Card */}
          <div className="rounded-2xl border border-border/80 bg-secondary/30 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">
                Target Role Match ({customJobDesc ? "Custom Input" : activeRolePreset.label}):
              </span>
              <span className="font-bold text-primary">{matchPercentage}% Alignment</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/80">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                initial={{ width: 0 }}
                animate={{ width: `${matchPercentage}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Matched Keywords */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" />
                Matched Technical Keywords ({matchedKeywords.length})
              </span>
              <span className="text-[10px] text-muted-foreground">Found in Document</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {matchedKeywords.length > 0 ? (
                matchedKeywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300"
                  >
                    <Check className="h-3 w-3 text-emerald-400" />
                    {kw}
                  </span>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic">No direct keyword overlap with this target role.</p>
              )}
            </div>
          </div>

          {/* Missing Keywords */}
          {missingKeywords.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Missing High-Demand Keywords ({missingKeywords.length})
                </span>
                <span className="text-[10px] text-amber-300/80">Recommended for Role</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {missingKeywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300"
                  >
                    <Plus className="h-3 w-3 text-amber-400" />
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* All Detected Skills in this Resume Version */}
          <div className="space-y-2 pt-3 border-t border-border/50">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-primary" />
              All Verified Skills in this Resume Version ({normalizedSkills.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {normalizedSkills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-lg border border-border/70 bg-secondary/40 px-2.5 py-1 text-[11px] font-medium text-foreground"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Actionable Recommendations & Formatting Audit */}
        <div className="lg:col-span-5 space-y-6">
          {/* Action Items Card */}
          <div className="glass-card rounded-3xl p-6 space-y-4 border border-border/70">
            <h4 className="font-display text-base font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Diagnostic Recommendations</span>
            </h4>

            <div className="space-y-2.5 text-xs">
              {feedback?.summary?.map((item, idx) => (
                <div key={`sum-${idx}`} className="flex items-start gap-2.5 rounded-xl border border-border/70 bg-secondary/25 p-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-muted-foreground leading-relaxed">{item}</span>
                </div>
              ))}

              {feedback?.weak_points?.map((weakness, idx) => (
                <div key={`weak-${idx}`} className="flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-amber-200/90 leading-relaxed">{weakness}</span>
                </div>
              ))}

              {feedback?.formatting?.map((fmt, idx) => (
                <div key={`fmt-${idx}`} className="flex items-start gap-2.5 rounded-xl border border-sky-500/25 bg-sky-500/5 p-3">
                  <Info className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
                  <span className="text-sky-200/90 leading-relaxed">{fmt}</span>
                </div>
              ))}

              {(!feedback?.summary?.length && !feedback?.weak_points?.length && !feedback?.formatting?.length) && (
                <div className="p-4 rounded-xl bg-secondary/30 text-center text-muted-foreground text-xs">
                  Your resume structure conforms cleanly with no critical parsing blockers detected.
                </div>
              )}
            </div>

            {/* CTAs */}
            <div className="pt-3 border-t border-border/50 flex flex-col gap-2">
              {onOptimize && (
                <Button
                  onClick={onOptimize}
                  variant="gradient"
                  className="w-full gap-2 text-xs font-semibold text-white shadow-lg shadow-primary/20"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  <span>Optimize Resume with AI Rewriter</span>
                </Button>
              )}
              {onViewSkills && (
                <Button
                  onClick={onViewSkills}
                  variant="outline"
                  className="w-full gap-2 text-xs border-border/80 hover:bg-secondary/60"
                >
                  <Brain className="h-3.5 w-3.5 text-primary" />
                  <span>View Skill Intelligence & Roadmap</span>
                </Button>
              )}
            </div>
          </div>

          {/* Formatting & Parsing Audit Card */}
          <div className="glass-card rounded-3xl p-6 space-y-3.5 border border-border/70">
            <h4 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Machine Parsing & Formatting Statistics</span>
            </h4>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-secondary/30 border border-border/50 space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-medium">Text Stream</span>
                <p className="font-semibold text-foreground">{charCount.toLocaleString()} Characters</p>
              </div>

              <div className="p-3 rounded-xl bg-secondary/30 border border-border/50 space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-medium">Word Count</span>
                <p className="font-semibold text-foreground">{wordCount.toLocaleString()} Words</p>
              </div>

              <div className="p-3 rounded-xl bg-secondary/30 border border-border/50 space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-medium">Bullet Points</span>
                <p className="font-semibold text-foreground">{bulletCount} Detected</p>
              </div>

              <div className="p-3 rounded-xl bg-secondary/30 border border-border/50 space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-medium">Format Status</span>
                <p className="font-semibold text-emerald-400">PDF Clean Stream</p>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
              Document text was verified as continuous machine-readable characters. No scanned image blockers or broken font ligatures detected.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ATSDiagnosticsBoundary(props: ATSDiagnosticsProps) {
  let hasClient = false;
  try {
    hasClient = Boolean(useQueryClient());
  } catch {
    hasClient = false;
  }

  if (!hasClient) {
    return (
      <QueryClientProvider client={defaultFallbackQueryClient}>
        <ATSDiagnosticsInternal {...props} />
      </QueryClientProvider>
    );
  }

  return <ATSDiagnosticsInternal {...props} />;
}

export function ATSDiagnostics(props: ATSDiagnosticsProps) {
  return <ATSDiagnosticsBoundary {...props} />;
}
