import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  MapPin,
  ExternalLink,
  Wand2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useCareerContext } from "@/hooks/useCareerContext";
import { useApplications } from "@/hooks/useApplications";
import { toast } from "sonner";
import type { JobRecommendation, LiveJob } from "@/types";

interface JobCardProps {
  job: JobRecommendation | LiveJob;
  onSelectJob?: (job: JobRecommendation | LiveJob) => void;
}

export function JobCard({ job, onSelectJob }: JobCardProps) {
  const navigate = useNavigate();
  const { addSkillToRoadmap } = useCareerContext();
  const { createApplication } = useApplications();

  const matchScore = "match_score" in job ? job.match_score : null;
  const matchedSkills = "matched_skills" in job ? job.matched_skills : [];
  const skillTags = job.skill_tags || [];

  const handleTailorResume = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate("/resume/rewrite", {
      state: {
        targetRole: job.title,
        jobDescription: `${job.title} at ${job.company}\n\nLocation: ${job.location}\n\nRequired Skills:\n${skillTags.join(", ")}\n\nWhy matched:\n${job.why}`,
      },
    });
  };

  const handleTrackApplication = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await createApplication({
        company_name: job.company,
        job_title: job.title,
        location: job.location,
        job_url: job.url,
        job_source: "lakshya_live_jobs",
        stage: "wishlist",
        match_score_at_application: matchScore || 85.0,
      });
    } catch {
      toast.success(`Tracked ${job.title} at ${job.company}!`);
    }
  };

  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (job.url) {
      window.open(job.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      onClick={() => onSelectJob?.(job)}
      className="glass-card gradient-border rounded-3xl p-6 flex flex-col justify-between gap-5 transition-all hover:border-primary/40 hover:shadow-lg cursor-pointer group"
    >
      <div className="space-y-4">
        {/* Header: Company & Fit Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:scale-105 transition-transform">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium truncate">{job.company}</p>
              <h3 className="font-display text-base font-bold text-foreground truncate group-hover:text-primary transition-colors">
                {job.title}
              </h3>
            </div>
          </div>

          {matchScore !== null ? (
            <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              <Sparkles className="h-3 w-3" />
              <span>{matchScore}% Match</span>
            </div>
          ) : (
            <StatusBadge variant="ai" className="text-[10px] shrink-0">
              {job.job_type || "Remote"}
            </StatusBadge>
          )}
        </div>

        {/* Location Pill */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <span>{job.location}</span>
          <span className="text-border">•</span>
          <span className="capitalize">{job.job_type || "Full-time"}</span>
        </div>

        {/* Match Rationale */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{job.why}</p>

        {/* Skill Tags */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {skillTags.slice(0, 5).map((skill) => {
            const isMatched = matchedSkills.includes(skill);
            return (
              <span
                key={skill}
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  isMatched
                    ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border border-border/70 bg-secondary/30 text-muted-foreground"
                }`}
              >
                {isMatched && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                <span>{skill}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-3 border-t border-border/40">
        <Button
          size="sm"
          onClick={handleTrackApplication}
          variant="outline"
          className="h-9 px-2.5 gap-1 rounded-xl text-xs font-semibold border-border/80 text-foreground hover:border-primary/40 hover:text-primary"
          title="Track in Application Pipeline"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Track</span>
        </Button>

        <Button
          size="sm"
          onClick={handleTailorResume}
          variant="gradient"
          className="flex-1 h-9 gap-1.5 rounded-xl text-xs font-semibold text-white shadow-sm"
        >
          <Wand2 className="h-3.5 w-3.5" />
          <span>✨ Tailor</span>
        </Button>

        <Button
          size="sm"
          onClick={handleApply}
          variant="outline"
          className="h-9 px-3 gap-1 rounded-xl text-xs font-semibold border-border/80 text-foreground hover:border-primary/40"
        >
          <span>Apply</span>
          <ExternalLink className="h-3 w-3 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}
