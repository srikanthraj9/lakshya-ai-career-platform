import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Sparkles, Globe, Loader2 } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorFallback } from "@/components/ErrorFallback";
import { EmptyState } from "@/components/EmptyState";
import { OpportunityHubHeader } from "@/components/jobs/OpportunityHubHeader";
import { OpportunityHubTabs, type OpportunityTab } from "@/components/jobs/OpportunityHubTabs";
import { JobCard } from "@/components/jobs/JobCard";
import { JobDetailDrawer } from "@/components/jobs/JobDetailDrawer";
import { useCareerContext } from "@/hooks/useCareerContext";
import { jobsService } from "@/services/jobs";
import { liveJobsService } from "@/services/liveJobs";
import type { JobRecommendation, LiveJob } from "@/types";

interface JobsPageProps {
  defaultTab?: OpportunityTab;
}

export default function JobsPage({ defaultTab = "recommendations" }: JobsPageProps) {
  const { activeResumeId } = useCareerContext();

  const [activeTab, setActiveTab] = useState<OpportunityTab>(defaultTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedJob, setSelectedJob] = useState<JobRecommendation | LiveJob | null>(null);

  // Fetch AI recommendations for active resume
  const {
    data: recommendationsData,
    isLoading: isRecsLoading,
    isError: isRecsError,
    refetch: refetchRecs,
  } = useQuery({
    queryKey: ["jobs-recommendations", activeResumeId],
    queryFn: () => jobsService.getRecommendations(activeResumeId!),
    enabled: Boolean(activeResumeId),
    retry: 2,
  });

  // Fetch Live Jobs
  const {
    data: liveJobsData = [],
    isLoading: isLiveLoading,
    isError: isLiveError,
    refetch: refetchLive,
  } = useQuery({
    queryKey: ["live-jobs"],
    queryFn: liveJobsService.getLiveJobs,
    retry: 2,
  });

  const aiJobs = useMemo(() => recommendationsData?.jobs || [], [recommendationsData]);

  // Filter recommendations
  const filteredRecs = useMemo(() => {
    return aiJobs.filter((j) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.skill_tags.some((s) => s.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }
      if (locationFilter && !j.location.toLowerCase().includes(locationFilter.toLowerCase())) {
        return false;
      }
      if (typeFilter === "remote" && !j.location.toLowerCase().includes("remote")) {
        return false;
      }
      if (typeFilter === "onsite" && j.location.toLowerCase().includes("remote")) {
        return false;
      }
      return true;
    });
  }, [aiJobs, searchQuery, locationFilter, typeFilter]);

  // Filter live jobs
  const filteredLive = useMemo(() => {
    return liveJobsData.filter((j) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.skill_tags.some((s) => s.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }
      if (locationFilter && !j.location.toLowerCase().includes(locationFilter.toLowerCase())) {
        return false;
      }
      if (typeFilter === "remote" && !j.location.toLowerCase().includes("remote")) {
        return false;
      }
      if (typeFilter === "onsite" && j.location.toLowerCase().includes("remote")) {
        return false;
      }
      return true;
    });
  }, [liveJobsData, searchQuery, locationFilter, typeFilter]);

  const displayedJobs = activeTab === "recommendations" ? filteredRecs : filteredLive;
  const isLoading = activeTab === "recommendations" ? isRecsLoading : isLiveLoading;
  const isError = activeTab === "recommendations" ? isRecsError : isLiveError;
  const refetch = activeTab === "recommendations" ? refetchRecs : refetchLive;

  return (
    <PageTransition>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header & Filter Controls */}
        <OpportunityHubHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          locationFilter={locationFilter}
          onLocationChange={setLocationFilter}
          typeFilter={typeFilter}
          onTypeChange={setTypeFilter}
          totalJobs={aiJobs.length + liveJobsData.length}
        />

        {/* Tab Navigation */}
        <OpportunityHubTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          recommendationsCount={filteredRecs.length}
          liveCount={filteredLive.length}
        />

        {/* Job Listings Grid */}
        {isLoading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64 rounded-3xl" />
            ))}
          </div>
        )}

        {isError && (
          <ErrorFallback
            title="Failed to Load Opportunities"
            message="We encountered an issue fetching market positions."
            onRetry={() => refetch()}
          />
        )}

        {!isLoading && !isError && displayedJobs.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {displayedJobs.map((job, idx) => (
              <JobCard
                key={`${job.company}-${job.title}-${idx}`}
                job={job}
                onSelectJob={setSelectedJob}
              />
            ))}
          </div>
        )}

        {!isLoading && !isError && displayedJobs.length === 0 && (
          <EmptyState
            icon={Briefcase}
            title="No Matching Opportunities Found"
            description="Try loosening your search filters or adding skills to your profile to unlock more opportunities."
          />
        )}

        {/* Job Details Slide-Out Drawer */}
        <JobDetailDrawer job={selectedJob} onClose={() => setSelectedJob(null)} />
      </div>
    </PageTransition>
  );
}
