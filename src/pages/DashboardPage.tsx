import { Award, Brain, TrendingUp, Target, Megaphone, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/PageTransition";
import { ErrorFallback } from "@/components/ErrorFallback";
import { MetricCard } from "@/components/shared/MetricCard";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { NextBestActions } from "@/components/dashboard/NextBestActions";
import { QuickLaunchpad } from "@/components/dashboard/QuickLaunchpad";
import { CareerProgressChart } from "@/components/dashboard/CareerProgressChart";
import { SkillGapSection } from "@/components/dashboard/SkillGapSection";
import { ActiveResumeCard } from "@/components/dashboard/ActiveResumeCard";
import { JobMatchPreview } from "@/components/dashboard/JobMatchPreview";
import { CareerActivityTimeline } from "@/components/activity/CareerActivityTimeline";
import { useAuth } from "@/context/AuthContext";
import { useDashboardData } from "@/hooks/useDashboardData";

export default function DashboardPage() {
  const { user } = useAuth();
  const {
    profile,
    breakdown,
    targetRole,
    summary,
    nextBestActions,
    formattedProgressTrend,
    skillBenchmarks,
    activeResume,
    recentJobs,
    isLoading,
    isError,
    refetchAll,
  } = useDashboardData();

  const { data: activeAnnouncements = [] } = useQuery({
    queryKey: ["candidate", "active-announcements"],
    queryFn: async () => {
      try {
        const res = await api.get("/notifications/announcements");
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        return [];
      }
    },
    staleTime: 60000,
  });

  const userName =
    user?.full_name?.split(" ")[0] || (user?.email ? user.email.split("@")[0] : "Candidate");
  const rawAts = activeResume?.ats_score ?? (summary?.ats_score ?? 0);
  const rawSkills =
    profile?.skills?.length || activeResume?.skills?.length || summary?.skill_count || 0;
  const rawInterview = summary?.interview_score ?? (breakdown?.interviewReadiness ?? 0);
  const rawRoleMatch = targetRole.readiness ?? (breakdown?.roleMatch ?? 0);

  if (isError) {
    return (
      <PageTransition>
        <ErrorFallback
          title="Command Center Unavailable"
          message="Failed to load your career intelligence metrics."
          onRetry={refetchAll}
        />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Active Platform Broadcast Announcements */}
        {activeAnnouncements.length > 0 && (
          <div className="flex flex-col gap-3">
            {activeAnnouncements.map((ann: any) => (
              <div
                key={ann.id}
                className={`rounded-2xl p-4 border flex items-start gap-3 backdrop-blur-xl ${
                  ann.type === "maintenance"
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                    : ann.type === "warning"
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                    : "bg-primary/10 border-primary/20 text-primary"
                }`}
              >
                <Megaphone className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-foreground">{ann.title}</span>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{ann.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 1. Hero & Career Readiness Master Score */}
        <DashboardHero
          userName={userName}
          targetRoleTitle={targetRole.title}
          breakdown={breakdown}
        />

        {/* Intentional Empty State for New Candidates with No Target Role Selected */}
        {targetRole.title === "No Target Role Selected" && (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-xl shadow-sm">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Target className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-foreground">
                  Target Career Role Not Selected
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                  Select your desired tech role to unlock role-specific ATS diagnostics, personalized skill gap breakdowns, and tailored roadmap recommendations.
                </p>
              </div>
            </div>
            <Link to="/role-alignment" className="shrink-0 self-end sm:self-center">
              <Button size="sm" variant="gradient" className="gap-1.5 text-xs shadow-md shadow-primary/20">
                <span>Choose Target Role</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        )}

        {/* 2. AI Next Best Actions & Quick Launchpad */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <NextBestActions actions={nextBestActions} />
          </div>
          <div>
            <QuickLaunchpad />
          </div>
        </div>

        {/* 3. Performance Snapshot (4 KPI Cards) */}
        <section aria-label="Career Performance Snapshot" className="space-y-4">
          <h3 className="font-display text-lg font-semibold text-foreground tracking-tight">
            Career Performance Snapshot
          </h3>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="ATS Score"
              value={rawAts}
              suffix="%"
              icon={Award}
              statusLabel={
                rawAts > 0
                  ? rawAts >= 85
                    ? "Excellent"
                    : rawAts >= 70
                    ? "Competitive"
                    : "Needs Polish"
                  : "Resume Needed"
              }
              statusVariant={
                rawAts > 0
                  ? rawAts >= 85
                    ? "success"
                    : rawAts >= 70
                    ? "warning"
                    : "destructive"
                  : "default"
              }
              delta={
                rawAts > 0
                  ? rawAts >= 85
                    ? "▲ Top 5% Candidate"
                    : "▲ Optimization Available"
                  : "Upload resume to calculate"
              }
              isLoading={isLoading}
              delay={0.05}
            />

            <MetricCard
              label="Tech Skills"
              value={rawSkills}
              suffix=" Verified"
              icon={Brain}
              statusLabel={rawSkills > 0 ? `${rawSkills} Verified Skills` : "No Verified Skills"}
              statusVariant={rawSkills > 0 ? "success" : "default"}
              delta={
                rawSkills > 0
                  ? "Profile competencies"
                  : "Add in Profile / Upload Resume"
              }
              isLoading={isLoading}
              delay={0.1}
            />

            <MetricCard
              label="Interview Readiness"
              value={rawInterview > 0 ? rawInterview : 0}
              suffix={rawInterview > 0 ? "%" : ""}
              icon={TrendingUp}
              statusLabel={
                rawInterview > 0
                  ? rawInterview >= 75
                    ? "Ready"
                    : "Needs Practice"
                  : "Not Measured Yet"
              }
              statusVariant={
                rawInterview > 0
                  ? rawInterview >= 75
                    ? "success"
                    : "warning"
                  : "default"
              }
              emptyFallbackText="Take 5-min Mock"
              delta={
                rawInterview > 0 ? "▲ Benchmark Scored" : "Start Voice/Text Simulation"
              }
              isLoading={isLoading}
              delay={0.15}
            />

            <MetricCard
              label="Target Role Match"
              value={rawRoleMatch > 0 ? rawRoleMatch : 0}
              suffix={rawRoleMatch > 0 ? "%" : ""}
              icon={Target}
              statusLabel={
                rawRoleMatch >= 80
                  ? "Strong Match"
                  : rawRoleMatch > 0
                  ? "Good Foundation"
                  : "Set in Onboarding"
              }
              statusVariant={
                rawRoleMatch >= 80
                  ? "success"
                  : rawRoleMatch > 0
                  ? "accent"
                  : "default"
              }
              delta={targetRole.title}
              isLoading={isLoading}
              delay={0.2}
            />
          </div>
        </section>

        {/* 4. Visual Intelligence (Career Progress Chart & Skill Gap vs Market Demand) */}
        <div className="grid gap-6 lg:grid-cols-2">
          <CareerProgressChart data={formattedProgressTrend} isLoading={isLoading} />
          <SkillGapSection benchmarks={skillBenchmarks} />
        </div>

        {/* 5. Live Feeds: Active Resume Health & New Job Opportunities */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ActiveResumeCard resume={activeResume} atsScore={rawAts} />
          <JobMatchPreview jobs={recentJobs} />
        </div>

        {/* 6. Career Progress Timeline */}
        <CareerActivityTimeline maxItems={4} />
      </div>
    </PageTransition>
  );
}
