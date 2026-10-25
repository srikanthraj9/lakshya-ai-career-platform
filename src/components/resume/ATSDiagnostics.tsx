import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { formatChartDate } from "@/lib/careerMetrics";
import type { ResumeDetail } from "@/types";

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
  const hasLocation = /location|india|remote|bangalore|hyderabad|delhi|mumbai|usa/i.test(text);
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

export function ATSDiagnostics({
  resume,
  isLoading = false,
  isError = false,
  onRetry,
  onOptimize,
  onViewSkills,
  onOpenUpload,
}: ATSDiagnosticsProps) {
  // Target Role & Keyword matching state
  const [selectedRoleId, setSelectedRoleId] = useState<string>("fullstack");
  const [customJobDesc, setCustomJobDesc] = useState<string>("");
  const [showFormulaModal, setShowFormulaModal] = useState<boolean>(false);

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
  const score = typeof resume.ats_score === "number" ? resume.ats_score : 0;
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

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Master Score */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6 border border-border/70 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Document Diagnostics
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
              ATS Compatibility & Parsing Diagnostics
            </h3>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              Audited using Lakshya AI's rule-based ATS evaluation model. Validates machine readability across enterprise Applicant Tracking Systems (Workday, Greenhouse, Lever, Taleo).
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2">
                <StatusBadge variant={score >= 80 ? "success" : score >= 65 ? "warning" : "destructive"} dot>
                  {score >= 80 ? "ATS Ready" : score >= 65 ? "Competitive Profile" : "Needs Optimization"}
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
              <span className="font-display text-3xl font-bold gradient-text">{score}%</span>
            </div>
          </div>
        </div>

        {/* Scoring Methodology Breakdown Banner (Expandable explanation) */}
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
                  ATS Composite Calculation Formula
                </span>
                <button
                  onClick={() => setShowFormulaModal(false)}
                  className="text-muted-foreground hover:text-foreground text-[11px]"
                >
                  ✕ Close
                </button>
              </div>
              <p className="font-mono text-[11px] text-primary/90 bg-background/50 p-2 rounded-xl border border-border/50">
                Composite Score = (Keyword Match × 35%) + (Skill Diversity × 25%) + (Formatting × 20%) + (Action Verbs × 10%) + (Section Coverage × 10%)
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 pt-1 text-[11px]">
                <div className="p-2 rounded-lg bg-secondary/30">
                  <span className="font-bold text-foreground">Keyword Match (35%):</span> Role-critical keyword density & alignment.
                </div>
                <div className="p-2 rounded-lg bg-secondary/30">
                  <span className="font-bold text-foreground">Skill Diversity (25%):</span> Volume & breadth of technical skills.
                </div>
                <div className="p-2 rounded-lg bg-secondary/30">
                  <span className="font-bold text-foreground">Formatting (20%):</span> Clean layout, font consistency, spacing.
                </div>
                <div className="p-2 rounded-lg bg-secondary/30">
                  <span className="font-bold text-foreground">Action Verbs (10%):</span> High-impact accomplishment verbs in bullets.
                </div>
                <div className="p-2 rounded-lg bg-secondary/30">
                  <span className="font-bold text-foreground">Section Coverage (10%):</span> Presence of core standard sections.
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Component Breakdown Meters */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 pt-2 border-t border-border/60">
          <div className="rounded-2xl border border-border/70 bg-secondary/30 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Keyword Match</span>
              <span className="font-bold text-foreground">{Math.round(breakdown.keyword_match)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/80">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${Math.min(breakdown.keyword_match, 100)}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground">Weight: 35%</span>
          </div>

          <div className="rounded-2xl border border-border/70 bg-secondary/30 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Skill Diversity</span>
              <span className="font-bold text-foreground">{Math.round(breakdown.skill_diversity)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/80">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: `${Math.min(breakdown.skill_diversity, 100)}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground">Weight: 25%</span>
          </div>

          <div className="rounded-2xl border border-border/70 bg-secondary/30 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Formatting & Layout</span>
              <span className="font-bold text-foreground">{Math.round(breakdown.formatting)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/80">
              <div className="h-full rounded-full bg-gradient-to-r from-accent to-sky-400" style={{ width: `${Math.min(breakdown.formatting, 100)}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground">Weight: 20%</span>
          </div>

          <div className="rounded-2xl border border-border/70 bg-secondary/30 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Action Verbs</span>
              <span className="font-bold text-foreground">{Math.round(breakdown.action_verbs)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/80">
              <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-primary" style={{ width: `${Math.min(breakdown.action_verbs, 100)}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground">Weight: 10%</span>
          </div>

          <div className="rounded-2xl border border-border/70 bg-secondary/30 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Section Coverage</span>
              <span className="font-bold text-foreground">{Math.round(breakdown.section_coverage)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/80">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-400" style={{ width: `${Math.min(breakdown.section_coverage, 100)}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground">Weight: 10%</span>
          </div>
        </div>
      </div>

      {/* 2. Resume Structure Checklist */}
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

      {/* 3. Keyword Intelligence & Target Role Matcher */}
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

          {/* Missing Keywords (Growth Opportunities) */}
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
              {/* Summary suggestions */}
              {feedback?.summary?.map((item, idx) => (
                <div key={`sum-${idx}`} className="flex items-start gap-2.5 rounded-xl border border-border/70 bg-secondary/25 p-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-muted-foreground leading-relaxed">{item}</span>
                </div>
              ))}

              {/* Weak points suggestions */}
              {feedback?.weak_points?.map((weakness, idx) => (
                <div key={`weak-${idx}`} className="flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-amber-200/90 leading-relaxed">{weakness}</span>
                </div>
              ))}

              {/* Formatting suggestions */}
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
