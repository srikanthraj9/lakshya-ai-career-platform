import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Award,
  BriefcaseBusiness,
  Calendar,
  FileSearch,
  Gauge,
  Mail,
  Mic2,
  PencilLine,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { PageTransition } from "@/components/PageTransition";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/context/AuthContext";
import { analyticsService } from "@/services/analytics";
import { resumeService } from "@/services/resume";
import { roleService } from "@/services/role";
import type { CareerProgress, ResumeDetail, ResumeListItem, RoleAlignmentResponse, SkillGrowth } from "@/types";

type RoadmapMeta = {
  role?: string;
  experience?: string;
  progress?: number;
  completed_count?: number;
  total_count?: number;
  updated_at?: string;
};

type InterviewMeta = {
  session_id?: string;
  role?: string;
  difficulty?: string;
  overall_score?: number;
  questions_answered?: number;
  updated_at?: string;
  summary?: string;
};

function readLocalStorageJson<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(key);
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function initials(name: string | undefined, email: string) {
  const source = (name || email).trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return "U";
  }
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("");
}

function formatDate(value?: string) {
  if (!value) {
    return "Not available";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Not available";
  }
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatRelative(value?: string) {
  if (!value) {
    return "No recent activity";
  }
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return "No recent activity";
  }
  const diffHours = Math.max(0, Math.round((Date.now() - timestamp) / (1000 * 60 * 60)));
  if (diffHours < 24) {
    return `${diffHours || 1}h ago`;
  }
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) {
    return `${diffDays}d ago`;
  }
  return formatDate(value);
}

function readinessTone(readiness: string) {
  const normalized = readiness.toLowerCase();
  if (normalized.includes("high") || normalized.includes("ready")) {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }
  if (normalized.includes("medium")) {
    return "border-amber-400/20 bg-amber-400/10 text-amber-200";
  }
  return "border-sky-400/20 bg-sky-400/10 text-sky-200";
}

function DashboardCard({
  title,
  subtitle,
  icon: Icon,
  className = "",
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,22,36,0.94),rgba(9,12,22,0.96))] p-6 shadow-[0_24px_80px_-44px_rgba(0,0,0,0.95)] ${className}`}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
      {children}
    </motion.div>
  );
}

function ProgressMetric({
  label,
  value,
  helper,
  accentClass,
}: {
  label: string;
  value: number;
  helper: string;
  accentClass: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}%</p>
      </div>
      <Progress value={value} className="h-2.5 bg-white/10" />
      <p className={`text-xs ${accentClass}`}>{helper}</p>
    </div>
  );
}

function ActivityItem({
  icon: Icon,
  title,
  description,
  meta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  meta: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-primary/20 hover:bg-white/[0.07]">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/80">{meta}</p>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const roadmapMeta = useMemo(() => readLocalStorageJson<RoadmapMeta>("lakshya:roadmap-meta"), []);
  const interviewMeta = useMemo(() => readLocalStorageJson<InterviewMeta>("lakshya:interview-meta"), []);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["profile-analytics-summary"],
    queryFn: analyticsService.getSummary,
    retry: 2,
    enabled: !!user,
  });

  const { data: resumes, isLoading: resumesLoading } = useQuery({
    queryKey: ["profile-resumes"],
    queryFn: resumeService.listResumes,
    retry: 2,
    enabled: !!user,
  });

  const { data: skillGrowth } = useQuery({
    queryKey: ["profile-skill-growth"],
    queryFn: analyticsService.getSkillGrowth,
    retry: 2,
    enabled: !!user,
  });

  const { data: careerProgress } = useQuery({
    queryKey: ["profile-career-progress"],
    queryFn: analyticsService.getCareerProgress,
    retry: 2,
    enabled: !!user,
  });

  const latestResume = useMemo(
    () => [...(resumes ?? [])].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())[0],
    [resumes],
  );

  const { data: latestResumeDetail, isLoading: detailLoading } = useQuery<ResumeDetail>({
    queryKey: ["profile-latest-resume", latestResume?.id],
    queryFn: () => resumeService.getResume(latestResume!.id),
    enabled: !!latestResume?.id,
    retry: 2,
  });

  const { data: alignment, isLoading: alignmentLoading } = useQuery<RoleAlignmentResponse>({
    queryKey: ["profile-role-alignment", latestResume?.id],
    queryFn: () => roleService.alignRole(latestResume!.id),
    enabled: !!latestResume?.id,
    retry: 1,
  });

  if (!user) {
    return (
      <EmptyState
        icon={User}
        title="Not logged in"
        description="Please log in to view your profile."
        actionLabel="Login"
        actionHref="/login"
      />
    );
  }

  const topMatch = alignment?.matches?.[0];
  const topRole = alignment?.career_decision?.target_role || topMatch?.role_name || "Role alignment pending";
  const confidenceScore = topMatch?.score ?? summary?.ats_score ?? 0;
  const readiness = alignment?.career_decision?.readiness_band || "Building";

  const resumeScore = latestResumeDetail?.ats_score ?? summary?.ats_score ?? 0;
  const totalTrackedSkills = (topMatch?.matched_skills?.length ?? 0) + (topMatch?.missing_skills?.length ?? 0);
  const skillGapPercent = totalTrackedSkills
    ? Math.round(((topMatch?.missing_skills?.length ?? 0) / totalTrackedSkills) * 100)
    : 0;
  const fallbackMomentum = careerProgress?.length ? careerProgress[careerProgress.length - 1].score : 0;
  const roadmapProgress = Math.max(0, Math.min(100, Math.round(roadmapMeta?.progress ?? fallbackMomentum ?? 0)));
  const latestCareerSignal = careerProgress?.length ? careerProgress[careerProgress.length - 1] : null;

  const liveSkills = latestResumeDetail?.skills?.length
    ? latestResumeDetail.skills
    : (skillGrowth ?? []).slice(0, 8).map((skill: SkillGrowth) => skill.skill);
  const visibleSkills = liveSkills.slice(0, 8);
  const extraSkillsCount = Math.max(0, liveSkills.length - visibleSkills.length);

  const roadmapStatusText = roadmapMeta?.role
    ? `${roadmapMeta.role} roadmap • ${roadmapMeta.completed_count ?? 0}/${roadmapMeta.total_count ?? 0} steps done`
    : "Generate a roadmap to start tracking milestones";

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold tracking-tight">Profile Dashboard</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            A live view of your career readiness, recent activity, and next best actions across resume, roadmap, and interview prep.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.22),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.16),transparent_34%),linear-gradient(180deg,rgba(12,18,30,0.98),rgba(8,11,21,0.96))] p-7 shadow-[0_28px_90px_-42px_rgba(0,0,0,0.95)]"
        >
          <div className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" aria-hidden="true" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 items-center justify-center rounded-[26px] border border-white/15 bg-white/5 text-2xl font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                {initials(user.full_name, user.email)}
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-2xl font-semibold text-foreground">{user.full_name}</h2>
                  <Badge className="border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                    Active
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {user.email}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Joined {formatDate(user.created_at)}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Career intelligence enabled
                  </span>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              className="h-11 rounded-2xl border-white/15 bg-white/5 px-5 text-sm hover:bg-white/10"
              onClick={() => toast.info("Profile editing flow can be wired once account settings are added.")}
            >
              <PencilLine className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          </div>
        </motion.div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <DashboardCard
            title="Career Summary"
            subtitle="Your strongest role target based on the latest resume and alignment signals."
            icon={Target}
            className="bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_35%),linear-gradient(180deg,rgba(18,24,38,0.96),rgba(9,12,22,0.96))]"
          >
            {alignmentLoading || detailLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-48 rounded-xl" />
                <Skeleton className="h-4 w-72 rounded-xl" />
                <div className="grid gap-3 sm:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-20 rounded-2xl" />)}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Top Direction
                  </div>
                  <h3 className="font-display text-3xl font-semibold text-foreground">{topRole}</h3>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    {alignment?.career_decision?.why || "Upload and analyze a resume to unlock role-level career guidance."}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Confidence</p>
                    <p className="mt-3 text-3xl font-semibold text-foreground">{confidenceScore}%</p>
                    <p className="mt-1 text-xs text-muted-foreground">Match confidence from latest role alignment</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Readiness</p>
                    <div className="mt-3">
                      <Badge className={readinessTone(readiness)}>{readiness}</Badge>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">{alignment?.career_decision?.career_verdict || "Waiting for more role evidence"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Focus Skills</p>
                    <p className="mt-3 text-lg font-semibold text-foreground">
                      {alignment?.career_decision?.focus_skills?.slice(0, 2).join(", ") || "No major gaps"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">High-leverage gaps to close next</p>
                  </div>
                </div>
              </div>
            )}
          </DashboardCard>

          <DashboardCard
            title="Skills Snapshot"
            subtitle="The strongest signals currently visible in your profile."
            icon={BriefcaseBusiness}
          >
            {detailLoading ? (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={index} className="h-8 w-24 rounded-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  {visibleSkills.map((skill) => (
                    <Badge key={skill} className="rounded-full border-primary/20 bg-primary/10 px-3 py-1.5 text-sm text-primary hover:bg-primary/15">
                      {skill}
                    </Badge>
                  ))}
                  {extraSkillsCount > 0 ? (
                    <Badge variant="outline" className="rounded-full border-white/10 bg-white/5 px-3 py-1.5 text-sm text-muted-foreground">
                      + {extraSkillsCount} more
                    </Badge>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Detected Skills</p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">{summary?.skill_count ?? liveSkills.length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Latest Resume</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{latestResume?.file_name || "No resume uploaded"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(latestResume?.created_at)}</p>
                  </div>
                </div>
              </div>
            )}
          </DashboardCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <DashboardCard
            title="Progress Tracking"
            subtitle="A compact view of your readiness across resume quality, gaps, and execution progress."
            icon={TrendingUp}
          >
            {summaryLoading ? (
              <div className="space-y-5">
                {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-2xl" />)}
              </div>
            ) : (
              <div className="space-y-5">
                <ProgressMetric
                  label="Resume Score"
                  value={resumeScore}
                  helper={latestResumeDetail ? `${latestResumeDetail.file_name} is your latest analyzed resume` : "Analyze a resume to improve ATS performance"}
                  accentClass="text-primary"
                />
                <ProgressMetric
                  label="Skill Gap"
                  value={skillGapPercent}
                  helper={skillGapPercent ? `${topMatch?.missing_skills?.length ?? 0} skills still need stronger proof` : "Your visible gaps are under control"}
                  accentClass="text-chart-5"
                />
                <ProgressMetric
                  label="Roadmap Progress"
                  value={roadmapProgress}
                  helper={roadmapStatusText}
                  accentClass="text-chart-4"
                />
              </div>
            )}
          </DashboardCard>

          <DashboardCard
            title="Activity & History"
            subtitle="Recent momentum across resume analysis, interviews, and roadmap planning."
            icon={FileSearch}
          >
            <div className="space-y-3">
              <ActivityItem
                icon={FileSearch}
                title="Last resume analyzed"
                description={latestResume ? latestResume.file_name : "Upload a resume to begin career analysis"}
                meta={latestResume ? `${formatRelative(latestResume.created_at)} • ${formatDate(latestResume.created_at)}` : "No resume activity yet"}
              />
              <ActivityItem
                icon={Mic2}
                title="Last interview taken"
                description={interviewMeta?.role ? `${interviewMeta.role} • Score ${interviewMeta.overall_score ?? 0}%` : summary?.interview_score ? `Interview readiness currently ${summary.interview_score}%` : "Start a mock interview to track readiness"}
                meta={interviewMeta?.updated_at ? `${formatRelative(interviewMeta.updated_at)} • ${formatDate(interviewMeta.updated_at)}` : summary?.interview_score ? "Tracked in analytics" : "No interview activity yet"}
              />
              <ActivityItem
                icon={Rocket}
                title="Last roadmap generated"
                description={roadmapMeta?.role ? `${roadmapMeta.role} • ${roadmapMeta.experience || "Current level not set"}` : "Generate a roadmap to create a guided plan"}
                meta={roadmapMeta?.updated_at ? `${formatRelative(roadmapMeta.updated_at)} • ${formatDate(roadmapMeta.updated_at)}` : "No roadmap activity yet"}
              />
            </div>
          </DashboardCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <DashboardCard
            title="Next Actions"
            subtitle="Move directly into the next highest-leverage workflow."
            icon={Gauge}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <Button
                variant="gradient"
                className="h-24 flex-col rounded-[24px]"
                onClick={() => navigate("/resume/rewrite")}
              >
                <Award className="mb-2 h-5 w-5" />
                Improve Resume
              </Button>
              <Button
                variant="outline"
                className="h-24 flex-col rounded-[24px] border-white/10 bg-white/5 hover:bg-white/10"
                onClick={() => navigate("/roadmap")}
              >
                <Rocket className="mb-2 h-5 w-5" />
                View Roadmap
              </Button>
              <Button
                variant="outline"
                className="h-24 flex-col rounded-[24px] border-white/10 bg-white/5 hover:bg-white/10"
                onClick={() => navigate("/interview/setup")}
              >
                <Target className="mb-2 h-5 w-5" />
                Start Interview
              </Button>
            </div>
          </DashboardCard>

          <DashboardCard
            title="Career Momentum"
            subtitle="How your readiness is trending based on stored analytics and your latest role target."
            icon={Sparkles}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Current Direction</p>
                <p className="mt-2 text-xl font-semibold text-foreground">{topRole}</p>
                <p className="mt-2 text-sm text-muted-foreground">{alignment?.career_decision?.decision_guidance || "Run role alignment on your latest resume to unlock guidance."}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Latest Progress Signal</p>
                <p className="mt-2 text-xl font-semibold text-foreground">
                  {latestCareerSignal?.score ?? roadmapProgress}%
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {latestCareerSignal
                    ? `Based on ${(latestCareerSignal as CareerProgress).week} in career progress analytics.`
                    : "Roadmap completion and resume quality will raise this over time."}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {alignment?.career_decision?.focus_skills?.slice(0, 3).map((skill) => (
                <Badge key={skill} variant="outline" className="rounded-full border-chart-5/20 bg-chart-5/10 px-3 py-1 text-chart-5">
                  Focus: {skill}
                </Badge>
              ))}
              {alignment?.career_decision?.career_verdict ? (
                <Badge variant="outline" className="rounded-full border-white/10 bg-white/5 px-3 py-1 text-muted-foreground">
                  {alignment.career_decision.career_verdict}
                </Badge>
              ) : null}
            </div>

            <Button
              variant="ghost"
              className="mt-4 h-auto px-0 text-primary hover:bg-transparent hover:text-primary/80"
              onClick={() => navigate(latestResume?.id ? "/roles/analyze" : "/resume/upload")}
            >
              View detailed career alignment
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </DashboardCard>
        </div>
      </div>
    </PageTransition>
  );
}
