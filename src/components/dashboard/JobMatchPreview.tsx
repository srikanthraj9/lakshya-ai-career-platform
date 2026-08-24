import React from "react";
import { Link } from "react-router-dom";
import { Briefcase, Building2, MapPin, ExternalLink, ArrowRight } from "lucide-react";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { LiveJob } from "@/types";

interface JobMatchPreviewProps {
  jobs: LiveJob[];
}

export function JobMatchPreview({ jobs }: JobMatchPreviewProps) {
  const displayJobs = jobs.slice(0, 2);

  return (
    <div className="glass-card glass-card-hover rounded-3xl p-6 flex flex-col justify-between">
      <div>
        <SectionHeader
          title="Live Job Opportunities"
          subtitle="Real-time open positions matched to your target role and verified skills"
          icon={Briefcase}
          action={
            <Link to="/jobs">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary hover:bg-primary/10 h-7 px-2"
              >
                <span>View All ({jobs.length})</span>
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          }
        />

        {displayJobs.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border/80 bg-secondary/20 p-6 text-center space-y-2">
            <Briefcase className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-xs font-medium text-foreground">No matching job openings found</p>
            <p className="text-[11px] text-muted-foreground">
              Update your target role or add skills to find personalized job opportunities.
            </p>
            <Link to="/jobs">
              <Button size="sm" variant="gradient" className="mt-2 text-xs h-7">
                Explore Job Catalog
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3 mt-3">
            {displayJobs.map((job) => {
              const score = typeof job.matchScore === "number" ? job.matchScore : null;
              const skillList =
                job.skills && Array.isArray(job.skills) && job.skills.length > 0
                  ? job.skills
                  : ["Full Time", job.category || "Engineering"];

              return (
                <div
                  key={job.id}
                  className="rounded-2xl border border-border/70 bg-secondary/30 p-3.5 space-y-2 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-foreground truncate">{job.title}</h4>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1 truncate">
                          <Building2 className="h-3 w-3 shrink-0" /> {job.company}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 shrink-0" /> {job.location || "Remote"}
                        </span>
                      </div>
                    </div>

                    {score !== null ? (
                      <StatusBadge variant="ai" className="font-bold text-[10px] shrink-0">
                        {score}% Fit
                      </StatusBadge>
                    ) : (
                      <StatusBadge variant="default" className="text-[10px] shrink-0">
                        Live Opening
                      </StatusBadge>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                    <div className="flex flex-wrap gap-1">
                      {skillList.slice(0, 3).map((s) => (
                        <span
                          key={s}
                          className="rounded bg-secondary/80 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {s}
                        </span>
                      ))}
                    </div>

                    <Link to="/jobs">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] px-2 text-primary hover:bg-primary/10"
                      >
                        <span>Apply</span>
                        <ExternalLink className="h-2.5 w-2.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 text-xs text-muted-foreground">
        <span>{jobs.length} jobs available</span>
        <Link
          to="/jobs"
          className="font-medium text-primary hover:underline flex items-center gap-1"
        >
          <span>Explore Job Matches</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
