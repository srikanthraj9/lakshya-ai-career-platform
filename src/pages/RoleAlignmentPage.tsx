import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  Compass,
  Filter,
  Flame,
  Gauge,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { PageTransition } from "@/components/PageTransition";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/services/api";
import { resumeService } from "@/services/resume";
import { roleService } from "@/services/role";
import type {
  CareerAction,
  ResumeDetail,
  ResumeListItem,
  RoleAlignmentMatch,
  RoleAlignmentResponse,
} from "@/types";

const ALL_CATEGORIES = "__all_categories__";

function toneForScore(score: number) {
  if (score < 30) {
    return {
      text: "text-destructive",
      badge: "border-destructive/30 bg-destructive/10 text-destructive",
      bar: "from-destructive via-orange-500 to-chart-5",
    };
  }
  if (score < 60) {
    return {
      text: "text-chart-5",
      badge: "border-chart-5/30 bg-chart-5/10 text-chart-5",
      bar: "from-chart-5 via-amber-400 to-accent",
    };
  }
  if (score < 80) {
    return {
      text: "text-primary",
      badge: "border-primary/30 bg-primary/10 text-primary",
      bar: "from-primary via-cyan-400 to-accent",
    };
  }
  return {
    text: "text-chart-4",
    badge: "border-chart-4/30 bg-chart-4/10 text-chart-4",
    bar: "from-chart-4 via-emerald-400 to-accent",
  };
}

function demandTone(demandLevel: string) {
  if (demandLevel === "High") {
    return "border-chart-4/30 bg-chart-4/10 text-chart-4";
  }
  if (demandLevel === "Low") {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }
  return "border-chart-5/30 bg-chart-5/10 text-chart-5";
}

function buildRoadmap(nextSteps: CareerAction[]) {
  return nextSteps.map((step, index) => ({
    week: `Week ${index + 1}`,
    action: step.action,
    rationale: step.rationale,
  }));
}

function verdictTone(verdict: string) {
  if (verdict === "Ready now") {
    return "border-chart-4/30 bg-chart-4/10 text-chart-4";
  }
  if (verdict === "Close fit") {
    return "border-primary/30 bg-primary/10 text-primary";
  }
  if (verdict === "Stretch role") {
    return "border-chart-5/30 bg-chart-5/10 text-chart-5";
  }
  return "border-destructive/30 bg-destructive/10 text-destructive";
}

function ResumeDropdown({
  resumes,
  value,
  onChange,
}: {
  resumes: ResumeListItem[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="resume-selector">Select Resume</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="resume-selector" className="rounded-xl">
          <SelectValue placeholder="Choose a resume" />
        </SelectTrigger>
        <SelectContent>
          {resumes.map((resume) => (
            <SelectItem key={resume.id} value={resume.id}>
              {resume.file_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CategoryFilter({
  categories,
  value,
  onChange,
}: {
  categories: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="role-category-selector" className="inline-flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        Filter by Category
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="role-category-selector" className="rounded-xl">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_CATEGORIES}>All Categories</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category} value={category}>
              {category}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function RoleCard({
  match,
  onImprove,
}: {
  match: RoleAlignmentMatch;
  onImprove: (match: RoleAlignmentMatch) => void;
}) {
  const tone = toneForScore(match.score);
  const [open, setOpen] = useState(false);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const roadmap = useMemo(() => buildRoadmap(match.next_steps), [match.next_steps]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top,rgba(39,196,255,0.14),transparent_40%),linear-gradient(180deg,rgba(14,17,29,0.96),rgba(10,13,22,0.92))] p-5 shadow-[0_14px_40px_-28px_rgba(0,0,0,0.9)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-md bg-white/8 px-2.5 text-xs text-foreground">
              {match.rank === 1 ? "#1 Top Match ⭐" : `#${match.rank}`}
            </Badge>
            <Badge variant="outline" className={`rounded-md border ${demandTone(match.demand_level)}`}>
              Demand: {match.demand_level}
            </Badge>
            <Badge variant="outline" className="rounded-md border-border/60 bg-background/20 text-muted-foreground">
              {match.category}
            </Badge>
            <Badge variant="outline" className={`rounded-md border ${verdictTone(match.verdict)}`}>
              {match.verdict}
            </Badge>
          </div>

          <div>
            <h3 className="font-display text-xl font-semibold text-foreground">{match.role_name}</h3>
            {typeof match.average_salary === "number" ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Average salary: ${Math.round(match.average_salary).toLocaleString()}
              </p>
            ) : null}
          </div>
        </div>

        <div className="min-w-[124px] text-right">
          <p className={`text-3xl font-bold ${tone.text}`}>{match.score}%</p>
          <Badge variant="outline" className={`mt-2 rounded-md border ${tone.badge}`}>
            {match.score_label}
          </Badge>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-muted-foreground">
          <span>Fit Score</span>
          <span>{match.score}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/8">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${tone.bar}`}
            initial={{ width: 0 }}
            animate={{ width: `${match.score}%` }}
            transition={{ duration: 0.85, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-background/20 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Skill Match</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{match.skill_score}%</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-background/20 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Semantic Match</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{match.semantic_score}%</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-background/20 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Readiness</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{match.readiness_score}%</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-primary/15 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">Why This Role</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{match.explanation}</p>
            <p className="mt-2 text-sm font-medium text-foreground">{match.verdict_reason}</p>
          </div>
        </div>
      </div>

      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="mt-4">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="h-auto rounded-md px-0 text-sm text-muted-foreground hover:bg-transparent">
              {open ? "Hide Details" : "Show Details"}
              <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-background/20 p-4">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-chart-4" />
                <p className="text-sm font-medium text-foreground">Matched Skills</p>
              </div>
              {match.matched_skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {match.matched_skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No matching skills</p>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-background/20 p-4">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-chart-5" />
                <p className="text-sm font-medium text-foreground">Missing Skills</p>
              </div>
              {match.missing_skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {match.missing_skills.map((skill) => (
                    <Badge key={skill} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">You already meet the visible role requirements.</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-background/20 p-4">
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-foreground">Strength Signals</p>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {match.strengths.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-chart-4" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-white/10 bg-background/20 p-4">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-chart-5" />
                <p className="text-sm font-medium text-foreground">Risk Signals</p>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {match.risks.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-chart-5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-background/20 p-4">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-foreground">Recommended Actions</p>
            </div>
            <div className="space-y-3">
              {match.next_steps.map((step, index) => (
                <div key={`${step.action}-${index}`} className="rounded-lg border border-border/50 bg-background/30 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-md border-primary/20 bg-primary/5 text-primary">
                      {step.priority}
                    </Badge>
                    <Badge variant="outline" className="rounded-md border-border/60 bg-background/40 text-muted-foreground">
                      {step.category}
                    </Badge>
                    {step.skill ? <Badge variant="secondary">{step.skill}</Badge> : null}
                  </div>
                  <p className="mt-3 text-sm text-foreground">{step.action}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{step.rationale}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Estimated time: {step.estimated_weeks} week{step.estimated_weeks > 1 ? "s" : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {showRoadmap ? (
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Flame className="h-4 w-4 text-accent" />
                <p className="text-sm font-medium text-foreground">Learning Plan</p>
              </div>
              <div className="space-y-3">
                {roadmap.map((item) => (
                  <div key={item.week} className="rounded-lg border border-border/50 bg-background/30 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{item.week}</p>
                    <p className="mt-1 text-sm text-foreground">{item.action}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.rationale}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button variant="gradient" className="rounded-xl" onClick={() => onImprove(match)}>
              <Sparkles className="mr-2 h-4 w-4" />
              Improve Resume for this Role
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={() => setShowRoadmap((current) => !current)}>
              <BriefcaseBusiness className="mr-2 h-4 w-4" />
              {showRoadmap ? "Hide Learning Plan" : "Generate Learning Plan"}
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
}

export default function RoleAlignmentPage() {
  const navigate = useNavigate();
  const [resumeId, setResumeId] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RoleAlignmentResponse | null>(null);

  const { data: resumes, isLoading: resumesLoading } = useQuery({
    queryKey: ["resumes"],
    queryFn: resumeService.listResumes,
  });

  const { data: resumeDetail } = useQuery<ResumeDetail>({
    queryKey: ["resume", resumeId],
    queryFn: () => resumeService.getResume(resumeId),
    enabled: !!resumeId,
  });

  const selectedResume = useMemo(
    () => resumes?.find((resume) => resume.id === resumeId) ?? null,
    [resumes, resumeId],
  );

  const categories = useMemo(() => {
    if (!result) {
      return [];
    }
    return [...new Set(result.matches.map((match) => match.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [result]);

  const filteredMatches = useMemo(() => {
    if (!result) {
      return [];
    }
    const sortedMatches = [...result.matches].sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.rank - b.rank;
    });
    if (categoryFilter === ALL_CATEGORIES) {
      return sortedMatches;
    }
    return sortedMatches.filter((match) => match.category === categoryFilter);
  }, [categoryFilter, result]);

  const visibleResumeSkills = useMemo(() => {
    if (result?.resume_skills?.length) {
      return result.resume_skills;
    }
    return resumeDetail?.skills ?? [];
  }, [result?.resume_skills, resumeDetail?.skills]);

  const handleAnalyze = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!resumeId) {
        return;
      }
      setLoading(true);
      try {
        const data = await roleService.alignRole(resumeId);
        setCategoryFilter(ALL_CATEGORIES);
        setResult(data);
      } catch (error) {
        toast.error(getApiErrorMessage(error));
      } finally {
        setLoading(false);
      }
    },
    [resumeId],
  );

  const handleImprove = useCallback(
    (match: RoleAlignmentMatch) => {
      navigate("/resume/rewrite", {
        state: {
          roleContext: {
            roleName: match.role_name,
            description: match.description,
            missingSkills: match.missing_skills,
            recommendation: match.explanation,
            resumeId,
            resumeFileName: selectedResume?.file_name,
            resumeText: resumeDetail?.extracted_text || resumeDetail?.parsed_text || "",
          },
        },
      });
    },
    [navigate, resumeDetail?.extracted_text, resumeDetail?.parsed_text, resumeId, selectedResume?.file_name],
  );

  return (
    <PageTransition>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold">Career Intelligence</h1>
          <p className="text-muted-foreground">Make a career decision, understand why it fits, and get the exact next steps to close the gap.</p>
        </div>

        <form
          onSubmit={handleAnalyze}
          className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(16,22,37,0.96),rgba(10,13,22,0.92))] p-5 shadow-[0_18px_40px_-32px_rgba(0,0,0,0.85)]"
        >
          {resumesLoading ? (
            <Skeleton className="h-14 w-full rounded-xl" />
          ) : resumes && resumes.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-end">
              <ResumeDropdown resumes={resumes} value={resumeId} onChange={setResumeId} />
              <CategoryFilter categories={categories} value={categoryFilter} onChange={setCategoryFilter} />
              <Button variant="gradient" type="submit" disabled={loading || !resumeId} className="rounded-xl">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  "Analyze Career Fit"
                )}
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/70 px-4 py-8 text-center">
              <p className="font-medium text-foreground">No resumes available</p>
              <p className="mt-1 text-sm text-muted-foreground">Upload a resume first to unlock career guidance.</p>
            </div>
          )}
        </form>

        {selectedResume ? (
          <div className="rounded-2xl border border-white/10 bg-background/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Analyzing resume</p>
                <p className="text-sm text-muted-foreground">{selectedResume.file_name}</p>
              </div>
              {visibleResumeSkills.length > 0 ? (
                <Badge variant="outline" className="rounded-md border-primary/20 bg-primary/5 text-primary">
                  {visibleResumeSkills.length} skills detected
                </Badge>
              ) : null}
            </div>
            {visibleResumeSkills.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {visibleResumeSkills.slice(0, 10).map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
                {visibleResumeSkills.length > 10 ? (
                  <Badge variant="outline">+{visibleResumeSkills.length - 10} more</Badge>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {result ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="rounded-2xl border border-primary/15 bg-[linear-gradient(180deg,rgba(16,22,37,0.95),rgba(10,13,22,0.92))] p-5">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className={`rounded-md border ${verdictTone(result.career_decision.career_verdict)}`}>
                  {result.career_decision.career_verdict || "No verdict"}
                </Badge>
                <Badge variant="outline" className="rounded-md border-border/60 bg-background/20 text-muted-foreground">
                  Confidence: {result.career_decision.confidence_label}
                </Badge>
                <Badge variant="outline" className="rounded-md border-border/60 bg-background/20 text-muted-foreground">
                  Readiness: {result.career_decision.readiness_band}
                </Badge>
              </div>
              <div className="mt-4">
                <p className="text-sm uppercase tracking-[0.16em] text-muted-foreground">Career Decision</p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-foreground">
                  {result.career_decision.target_role || "No strong role selected"}
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{result.career_decision.decision_guidance}</p>
                <p className="mt-3 text-sm leading-6 text-foreground">{result.career_decision.why}</p>
              </div>
              {result.career_decision.focus_skills.length > 0 ? (
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Primary Focus Skills</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {result.career_decision.focus_skills.map((skill) => (
                      <Badge key={skill} variant="outline">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-2xl border border-white/10 bg-background/30 p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Target className="h-4 w-4" />
                  <p className="text-sm">Target Role</p>
                </div>
                <p className="mt-3 text-xl font-semibold text-foreground">{result.career_decision.target_role || "-"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-background/30 p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Gauge className="h-4 w-4" />
                  <p className="text-sm">Resume Skill Signals</p>
                </div>
                <p className="mt-3 text-xl font-semibold text-foreground">{result.career_decision.resume_skill_count}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-background/30 p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Compass className="h-4 w-4" />
                  <p className="text-sm">Matches Returned</p>
                </div>
                <p className="mt-3 text-xl font-semibold text-foreground">{result.matches.length}</p>
              </div>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-64 w-full rounded-2xl" />
            ))}
          </div>
        ) : result ? (
          filteredMatches.length > 0 ? (
            <div className="space-y-4">
              {filteredMatches.map((match) => (
                <RoleCard key={match.role_id} match={match} onImprove={handleImprove} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 bg-background/30 p-8 text-center">
              <p className="font-medium text-foreground">No strong role matches found. Try improving your resume.</p>
              <p className="mt-1 text-sm text-muted-foreground">Adjust your category filter or strengthen missing skills to unlock better role guidance.</p>
            </div>
          )
        ) : null}
      </div>
    </PageTransition>
  );
}
