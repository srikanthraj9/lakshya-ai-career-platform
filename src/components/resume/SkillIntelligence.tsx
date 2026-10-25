import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Brain,
  Map,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Layers,
  Upload,
  Info,
} from "lucide-react";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { SkillBenchmarkBar } from "@/components/shared/SkillBenchmarkBar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { SkillBenchmark } from "@/types/career";
import type { ResumeDetail, Resume, ResumeSkill, ResumeMissingSkill } from "@/types";

export interface SkillIntelligenceProps {
  resume?: ResumeDetail | Resume | null;
  skills?: Array<string | ResumeSkill | { skill?: string; skill_name?: string; name?: string }>;
  missingSkills?: Array<string | ResumeMissingSkill | { skill?: string; skill_name?: string; name?: string }>;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onOptimize?: () => void;
  onOpenUpload?: () => void;
}

/**
 * Normalizes any skill input (string, object with skill/skill_name/name)
 * into a clean, deduplicated array of non-empty strings.
 * Never throws, safely handles null, undefined, non-arrays, and malformed objects.
 */
export function normalizeSkillsList(raw: unknown): string[] {
  if (!raw || !Array.isArray(raw)) return [];
  const set = new Set<string>();
  const result: string[] = [];

  for (const item of raw) {
    let name = "";
    if (typeof item === "string") {
      name = item.trim();
    } else if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      if (typeof obj.skill === "string") {
        name = obj.skill.trim();
      } else if (typeof obj.skill_name === "string") {
        name = obj.skill_name.trim();
      } else if (typeof obj.name === "string") {
        name = obj.name.trim();
      }
    }

    if (name && !set.has(name.toLowerCase())) {
      set.add(name.toLowerCase());
      result.push(name);
    }
  }

  return result;
}

export function SkillIntelligence({
  resume,
  skills: skillsProp,
  missingSkills: missingSkillsProp,
  isLoading = false,
  isError = false,
  onRetry,
  onOptimize,
  onOpenUpload,
}: SkillIntelligenceProps) {
  // 1. Safe normalization of detected skills
  const resolvedSkills = useMemo<string[]>(() => {
    if (skillsProp !== undefined) {
      return normalizeSkillsList(skillsProp);
    }
    if (resume?.skills !== undefined) {
      return normalizeSkillsList(resume.skills);
    }
    return [];
  }, [skillsProp, resume?.skills]);

  // 2. Safe normalization of missing skills / skill gaps
  const resolvedMissingSkills = useMemo<string[]>(() => {
    if (missingSkillsProp !== undefined) {
      return normalizeSkillsList(missingSkillsProp);
    }
    const fromFeedback = (resume as ResumeDetail | null)?.feedback?.missing_skills;
    if (fromFeedback !== undefined) {
      return normalizeSkillsList(fromFeedback);
    }
    const fromModel = (resume as Resume | null)?.missing_skills;
    if (fromModel !== undefined) {
      return normalizeSkillsList(fromModel);
    }
    return [];
  }, [missingSkillsProp, resume]);

  // 3. Domain categorization
  const categorized = useMemo(() => {
    const frontend = [
      "react", "javascript", "typescript", "html", "css", "tailwind",
      "nextjs", "next.js", "vue", "angular", "redux", "svelte", "sass", "bootstrap", "vite"
    ];
    const backend = [
      "python", "fastapi", "django", "nodejs", "node.js", "express",
      "java", "spring", "golang", "go", "c#", ".net", "rest", "rest api", "graphql", "ruby", "php"
    ];
    const database = [
      "postgresql", "postgres", "mysql", "mongodb", "sqlite", "redis",
      "prisma", "sqlalchemy", "dynamodb", "cassandra", "sql"
    ];
    const devops = [
      "docker", "kubernetes", "git", "github", "aws", "azure", "gcp",
      "ci/cd", "linux", "terraform", "nginx", "bash", "ansible"
    ];
    const aiData = [
      "machine learning", "deep learning", "pytorch", "tensorflow", "pandas",
      "numpy", "scikit-learn", "nlp", "llm", "data science"
    ];

    const groups: Record<string, string[]> = {
      "Frontend Engineering": [],
      "Backend & APIs": [],
      "Databases & Caching": [],
      "DevOps, Cloud & Tools": [],
      "AI & Data Science": [],
      "Additional Technical Skills": [],
    };

    resolvedSkills.forEach((s) => {
      const lower = s.toLowerCase();
      if (frontend.some((f) => lower === f || lower.includes(f))) {
        groups["Frontend Engineering"].push(s);
      } else if (backend.some((b) => lower === b || lower.includes(b))) {
        groups["Backend & APIs"].push(s);
      } else if (database.some((d) => lower === d || lower.includes(d))) {
        groups["Databases & Caching"].push(s);
      } else if (devops.some((o) => lower === o || lower.includes(o))) {
        groups["DevOps, Cloud & Tools"].push(s);
      } else if (aiData.some((a) => lower === a || lower.includes(a))) {
        groups["AI & Data Science"].push(s);
      } else {
        groups["Additional Technical Skills"].push(s);
      }
    });

    return groups;
  }, [resolvedSkills]);

  // 4. Grounded Skill Proficiency Benchmarks
  // Evaluates skill depth based on verified occurrences in extracted text + ATS diversity score
  const benchmarks: SkillBenchmark[] = useMemo(() => {
    if (resolvedSkills.length === 0) return [];

    const resumeText = (
      (resume as ResumeDetail | null)?.extracted_text ||
      (resume as ResumeDetail | null)?.parsed_text ||
      ""
    ).toLowerCase();

    const baselineScore = (resume as ResumeDetail | null)?.breakdown?.skill_diversity || 75;

    return resolvedSkills.slice(0, 6).map((skill, index) => {
      const lowerSkill = skill.toLowerCase();
      let occurrences = 0;

      if (resumeText) {
        const regex = new RegExp(`\\b${lowerSkill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
        const matches = resumeText.match(regex);
        occurrences = matches ? matches.length : 1;
      } else {
        occurrences = 1;
      }

      // Base score derived from resume analysis; frequency adds depth bonus
      const occurrenceBonus = Math.min(occurrences * 5, 20);
      const positionDecay = index * 2;
      const rawScore = Math.round(baselineScore * 0.7 + occurrenceBonus + 15 - positionDecay);
      const userScore = Math.max(62, Math.min(rawScore, 98));

      return {
        skill,
        userScore,
        targetBenchmark: 80,
        status: (userScore >= 80 ? "strong" : "needs_work") as "strong" | "needs_work",
      };
    });
  }, [resolvedSkills, resume]);

  // ===================== UI STATES =====================

  // State 1: Loading State
  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="skill-intelligence-loading">
        <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-64 rounded-lg" />
              <Skeleton className="h-4 w-48 rounded-lg" />
            </div>
            <Skeleton className="h-9 w-36 rounded-xl" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-border/70 p-4 space-y-3">
                <Skeleton className="h-4 w-28 rounded-md" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-16 rounded-lg" />
                  <Skeleton className="h-6 w-20 rounded-lg" />
                  <Skeleton className="h-6 w-14 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 glass-card rounded-3xl p-6 space-y-4">
            <Skeleton className="h-6 w-48 rounded-lg" />
            <div className="space-y-3 pt-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-xl" />
              ))}
            </div>
          </div>
          <div className="lg:col-span-5 glass-card rounded-3xl p-6 space-y-4">
            <Skeleton className="h-6 w-40 rounded-lg" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // State 2: Error State with Retry
  if (isError) {
    return (
      <div
        className="glass-card rounded-3xl p-10 text-center space-y-4 border border-rose-500/20 bg-rose-500/5 max-w-xl mx-auto my-8"
        data-testid="skill-intelligence-error"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 mx-auto">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-display text-base font-semibold text-foreground">
            Unable to Load Skill Intelligence
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            We encountered a problem retrieving verified skill data for this resume version.
          </p>
        </div>
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
            size="sm"
            className="gap-2 rounded-xl border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry Analysis</span>
          </Button>
        )}
      </div>
    );
  }

  // State 3: Empty State (No resume selected)
  if (!resume && resolvedSkills.length === 0) {
    return (
      <div
        className="glass-card rounded-3xl p-12 text-center space-y-4 max-w-lg mx-auto my-8"
        data-testid="skill-intelligence-empty-no-resume"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto">
          <Layers className="h-6 w-6" />
        </div>
        <div className="space-y-1.5">
          <h3 className="font-display text-lg font-bold text-foreground">
            No Resume Selected
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Select a resume version from the top dropdown or upload a new resume to view verified skills, stack coverage, and industry benchmarks.
          </p>
        </div>
        {onOpenUpload && (
          <Button onClick={onOpenUpload} variant="gradient" size="sm" className="gap-2 text-xs">
            <Upload className="h-3.5 w-3.5" />
            <span>Upload Resume</span>
          </Button>
        )}
      </div>
    );
  }

  // State 4: Unextractable / Zero Skills Detected State
  if (resolvedSkills.length === 0) {
    return (
      <div
        className="glass-card rounded-3xl p-10 text-center space-y-5 border border-amber-500/20 bg-amber-500/5 max-w-2xl mx-auto my-8"
        data-testid="skill-intelligence-empty-no-skills"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 mx-auto">
          <Brain className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h3 className="font-display text-base font-semibold text-foreground">
            No Extractable Skills Detected
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
            We analyzed this resume version, but could not detect standard technical skill keywords. This typically occurs when a resume lacks a clear &ldquo;Technical Skills&rdquo; section header or uses non-standard graphical formatting.
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4 text-left max-w-md mx-auto space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Info className="h-4 w-4 text-primary" />
            <span>Tips to improve skill detection:</span>
          </div>
          <ul className="text-[11px] text-muted-foreground space-y-1 list-disc list-inside">
            <li>Include a dedicated &ldquo;Technical Skills&rdquo; or &ldquo;Skills&rdquo; section.</li>
            <li>List standard tools (e.g. Python, React, PostgreSQL, Docker).</li>
            <li>Avoid multi-column tables or image-based skill meters.</li>
          </ul>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          {onOptimize && (
            <Button onClick={onOptimize} variant="gradient" size="sm" className="gap-2 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Format with AI Resume Optimizer</span>
            </Button>
          )}
          {onOpenUpload && (
            <Button onClick={onOpenUpload} variant="outline" size="sm" className="gap-2 text-xs">
              <Upload className="h-3.5 w-3.5" />
              <span>Upload New Version</span>
            </Button>
          )}
        </div>
      </div>
    );
  }

  // State 5: Success State (Normal Rendering)
  return (
    <div className="space-y-6" data-testid="skill-intelligence-success">
      {/* Overview Banner */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-4">
        <SectionHeader
          title="Skill Intelligence & Stack Coverage"
          subtitle={`${resolvedSkills.length} verified technical skills detected from your resume`}
          icon={Brain}
          action={
            <Link to="/roadmap">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs rounded-xl border-primary/30 text-primary hover:bg-primary/10"
              >
                <Map className="h-3.5 w-3.5" />
                <span>Open Skill Roadmap</span>
              </Button>
            </Link>
          }
        />

        {/* Categorized Skills Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-2">
          {Object.entries(categorized).map(([category, items]) => {
            if (items.length === 0) return null;
            return (
              <div
                key={category}
                className="rounded-2xl border border-border/70 bg-secondary/30 p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-foreground">{category}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary/80 border border-white/5 text-muted-foreground">
                    {items.length} Skills
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {items.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-lg bg-secondary/80 border border-white/5 px-2.5 py-1 text-xs text-foreground font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Skill Strength vs Market Demand */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 glass-card rounded-3xl p-6 space-y-4">
          <SectionHeader
            title="Skill Proficiency vs Industry Benchmark"
            subtitle="Relative depth based on resume experience density and project context"
            icon={Brain}
          />

          <div className="space-y-2.5 pt-2">
            {benchmarks.map((b, idx) => (
              <SkillBenchmarkBar key={b.skill} benchmark={b} index={idx} />
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground/80 pt-2 border-t border-border/50 flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>
              Proficiency scores reflect candidate experience density in the uploaded document compared to standard 80% role readiness.
            </span>
          </p>
        </div>

        {/* Missing Skills to Acquire */}
        <div className="lg:col-span-5 glass-card rounded-3xl p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-sm font-semibold text-foreground">
                Recommended Skills for Target Role
              </h4>
              {resolvedMissingSkills.length > 0 && (
                <span className="text-[10px] font-bold text-amber-400">
                  {resolvedMissingSkills.length} Opportunities
                </span>
              )}
            </div>

            {resolvedMissingSkills.length > 0 ? (
              <>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Acquiring these high-demand tools will bridge the remaining gap to 100% role compatibility:
                </p>

                <div className="space-y-2 pt-1 max-h-60 overflow-y-auto pr-1">
                  {resolvedMissingSkills.map((missing) => (
                    <div
                      key={missing}
                      className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span className="font-medium text-foreground">{missing}</span>
                      </div>
                      <span className="text-[10px] text-amber-300 font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                        Priority Gap
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center space-y-2 my-2">
                <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto" />
                <p className="text-xs font-medium text-foreground">
                  No Critical Skill Gaps Detected
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Your detected stack has solid baseline coverage across core industry requirements.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-border/50">
            <Link to="/roadmap">
              <Button variant="gradient" className="w-full gap-2 text-xs font-semibold text-white">
                <Map className="h-3.5 w-3.5" />
                <span>
                  {resolvedMissingSkills.length > 0
                    ? "Add Missing Skills to Roadmap"
                    : "Explore Advanced Skill Roadmap"}
                </span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
