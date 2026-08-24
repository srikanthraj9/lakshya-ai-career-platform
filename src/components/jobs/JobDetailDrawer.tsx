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
  X,
  Clock,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useCareerContext } from "@/hooks/useCareerContext";
import { toast } from "sonner";
import type { JobRecommendation, LiveJob } from "@/types";

interface JobDetailDrawerProps {
  job: JobRecommendation | LiveJob | null;
  onClose: () => void;
}

export function JobDetailDrawer({ job, onClose }: JobDetailDrawerProps) {
  const navigate = useNavigate();
  const { addSkillToRoadmap } = useCareerContext();

  if (!job) return null;

  const matchScore = "match_score" in job ? job.match_score : null;
  const matchedSkills = "matched_skills" in job ? job.matched_skills : [];
  const skillTags = job.skill_tags || [];

  const handleTailorResume = () => {
    navigate("/resume/rewrite", {
      state: {
        targetRole: job.title,
        jobDescription: `${job.title} at ${job.company}\n\nLocation: ${job.location}\n\nRequired Competencies:\n${skillTags.join(", ")}\n\nRole Context:\n${job.why}`,
      },
    });
  };

  const handleAddSkill = (skill: string) => {
    addSkillToRoadmap(skill);
    toast.success(`"${skill}" added to Career Roadmap!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-200">
      <div className="w-full max-w-lg bg-card border-l border-border h-full flex flex-col justify-between p-6 sm:p-8 shadow-2xl overflow-y-auto space-y-6">
        <div className="space-y-6">
          {/* Top Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">{job.company}</p>
                <h3 className="font-display text-base font-bold text-foreground truncate">{job.title}</h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Match Score & Location */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-secondary/30 border border-border/60">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Work Location</span>
              <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-primary" /> {job.location}
              </p>
            </div>

            {matchScore !== null ? (
              <div className="flex items-center gap-2.5">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Semantic Fit</span>
                  <p className="text-xs font-bold text-emerald-400">Strong Match</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-sm">
                  {matchScore}%
                </div>
              </div>
            ) : (
              <StatusBadge variant="ai">Live Scraped</StatusBadge>
            )}
          </div>

          {/* Match Justification */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Why You Match
            </span>
            <p className="text-xs text-muted-foreground leading-relaxed p-4 rounded-2xl bg-secondary/20 border border-border/40">
              {job.why || "Matches candidate technical stack and engineering background."}
            </p>
          </div>

          {/* Matched Skills */}
          {matchedSkills.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Matched Competencies ({matchedSkills.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {matchedSkills.map((s) => (
                  <span
                    key={s}
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300 font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Required Skill Tags */}
          {skillTags.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-primary" /> Key Technologies Required ({skillTags.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {skillTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleAddSkill(tag)}
                    title="Click to add to Career Roadmap"
                    className="group inline-flex items-center gap-1 rounded-lg border border-border/60 bg-secondary/30 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                  >
                    <Plus className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span>{tag}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="pt-4 border-t border-border/50 flex flex-col sm:flex-row gap-2.5">
          <Button
            onClick={handleTailorResume}
            variant="gradient"
            className="flex-1 gap-2 rounded-xl text-xs font-semibold text-white shadow-md h-11"
          >
            <Wand2 className="h-4 w-4" />
            <span>✨ Tailor Resume for This Job</span>
          </Button>

          <Button
            onClick={() => window.open(job.url, "_blank", "noopener,noreferrer")}
            variant="outline"
            className="gap-1.5 rounded-xl text-xs font-semibold h-11 border-border/80"
          >
            <span>Apply External</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
