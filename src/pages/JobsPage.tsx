import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { jobsService } from "@/services/jobs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Briefcase, Building, ExternalLink, MapPin, Percent, Search } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { EmptyState } from "@/components/EmptyState";
import { ErrorFallback } from "@/components/ErrorFallback";

export default function JobsPage() {
  const [resumeId, setResumeId] = useState("");
  const [searchId, setSearchId] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["jobs", searchId],
    queryFn: () => jobsService.getRecommendations(searchId),
    enabled: !!searchId,
    retry: 2,
  });

  const handleSearch = useCallback(() => setSearchId(resumeId), [resumeId]);

  const jobList = useMemo(() => data?.jobs ?? [], [data]);
  const resumeSkills = useMemo(() => data?.resume_skills ?? [], [data]);

  return (
    <PageTransition>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Job Recommendations</h1>
          <p className="text-muted-foreground">Discover roles that match your profile.</p>
        </div>

        <div className="flex gap-3 items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="resume-id-input">Resume ID</Label>
            <Input id="resume-id-input" value={resumeId} onChange={(e) => setResumeId(e.target.value)} placeholder="Enter your resume ID" aria-describedby="resume-id-help" />
          </div>
          <Button variant="gradient" onClick={handleSearch} disabled={!resumeId || isLoading} aria-label="Find matching jobs">
            Find Jobs
          </Button>
        </div>

        {isLoading && <div className="grid gap-4 md:grid-cols-2" role="status" aria-label="Loading jobs">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>}

        {isError && <ErrorFallback title="Jobs Load Failed" message="Failed to load job recommendations." onRetry={() => refetch()} />}

        {!searchId && !isLoading && !isError && (
          <EmptyState
            icon={Search}
            title="Search for Jobs"
            description="Enter your resume ID above to get personalized job recommendations based on your skills."
          />
        )}

        {jobList.length === 0 && searchId && !isLoading && !isError && (
          <EmptyState
            icon={Briefcase}
            title="No Jobs Found"
            description="No matching jobs were found for your resume. Try uploading a more detailed resume."
            actionLabel="Upload Resume"
            actionHref="/resume/upload"
          />
        )}

        {jobList.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {resumeSkills.map((skill) => (
                <Badge key={skill} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2" role="list" aria-label="Recommended jobs">
            {jobList.map((job, i) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card glass-card-hover rounded-xl p-6 space-y-3"
                role="listitem"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-primary" aria-hidden="true" /> {job.title}
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Building className="h-3.5 w-3.5" aria-hidden="true" /> {job.company}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {job.location}
                    </p>
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Percent className="h-3 w-3" aria-hidden="true" /> {job.match_score}%
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground">{job.why}</p>

                <div className="flex flex-wrap gap-1.5" role="list" aria-label="Matched skills">
                  {job.matched_skills.map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs" role="listitem">{s}</Badge>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1.5" role="list" aria-label="Job tags">
                  {job.skill_tags.map((s) => (
                    <Badge key={s} variant="outline" className="text-xs" role="listitem">{s}</Badge>
                  ))}
                </div>

                <Button
                  variant="gradient"
                  className="w-full"
                  onClick={() => window.open(job.url, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                  Apply Now
                </Button>
              </motion.div>
            ))}
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
