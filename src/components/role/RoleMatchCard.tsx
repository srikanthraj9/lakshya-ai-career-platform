import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Target,
  Award,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RoleActionPlan } from "./RoleActionPlan";
import { useCareerContext } from "@/hooks/useCareerContext";
import { toast } from "sonner";
import type { RoleAlignmentMatch } from "@/types";

interface RoleMatchCardProps {
  match: RoleAlignmentMatch;
  isExpandedDefault?: boolean;
}

export function RoleMatchCard({ match, isExpandedDefault = false }: RoleMatchCardProps) {
  const [isExpanded, setIsExpanded] = useState(isExpandedDefault);
  const { addSkillToRoadmap } = useCareerContext();

  const score = Math.round(match.readiness_score || match.score || 80);
  const isHighFit = score >= 80;

  const handleAddSkill = (skill: string) => {
    addSkillToRoadmap(skill);
    toast.success(`"${skill}" added to Career Roadmap!`);
  };

  return (
    <div className="glass-card gradient-border rounded-3xl p-6 sm:p-7 space-y-6 transition-all hover:border-primary/40">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
              Rank #{match.rank} Match
            </span>
            <StatusBadge variant="ai" className="text-[10px] py-0 px-1.5">
              {match.category}
            </StatusBadge>
            <StatusBadge
              variant={match.demand_level === "High" ? "success" : "warning"}
              className="text-[10px] py-0 px-1.5"
            >
              {match.demand_level} Demand
            </StatusBadge>
          </div>

          <h3 className="font-display text-xl font-bold text-foreground">{match.role_name}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">{match.description}</p>
        </div>

        {/* Readiness Score Gauge */}
        <div className="flex items-center gap-3 self-start sm:self-auto shrink-0 bg-secondary/30 border border-border/60 rounded-2xl p-3.5">
          <div className="space-y-0.5 text-left">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Compatibility</span>
            <p className="text-xs font-semibold text-foreground">{match.score_label || "Close Fit"}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/30">
            <span className="font-display text-lg font-bold gradient-text">{score}%</span>
          </div>
        </div>
      </div>

      {/* Coverage Progress Bars */}
      <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-border/50 text-xs">
        <div className="space-y-1.5 p-3 rounded-2xl bg-secondary/20 border border-border/40">
          <div className="flex justify-between">
            <span className="text-muted-foreground font-medium">Core Skills Match</span>
            <span className="font-bold text-emerald-400">{Math.round(match.core_skill_coverage * 100)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary/80 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-400"
              style={{ width: `${Math.round(match.core_skill_coverage * 100)}%` }}
            />
          </div>
        </div>

        <div className="space-y-1.5 p-3 rounded-2xl bg-secondary/20 border border-border/40">
          <div className="flex justify-between">
            <span className="text-muted-foreground font-medium">Advanced Architecture Match</span>
            <span className="font-bold text-primary">{Math.round(match.advanced_skill_coverage * 100)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary/80 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.round(match.advanced_skill_coverage * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Matched & Missing Skills Grid */}
      <div className="grid gap-4 md:grid-cols-2 text-xs">
        {/* Matched Skills */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2.5">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Verified Matched Skills ({match.matched_skills.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {match.matched_skills.map((skill) => (
              <span
                key={skill}
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-300 font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Missing Gap Skills */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2.5">
          <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Priority Skill Gaps ({match.missing_skills.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {match.missing_skills.map((missing) => (
              <button
                key={missing}
                onClick={() => handleAddSkill(missing)}
                title="Click to add to Career Roadmap"
                className="group inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-300 font-medium hover:bg-amber-500/20 transition-colors"
              >
                <Plus className="h-3 w-3 text-amber-400 group-hover:scale-110 transition-transform" />
                <span>{missing}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Strengths & Risks */}
      <div className="grid gap-4 md:grid-cols-2 text-xs pt-2">
        {match.strengths.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Key Strengths</span>
            <ul className="space-y-1 text-muted-foreground">
              {match.strengths.map((st, idx) => (
                <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <span>{st}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {match.risks.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Identified Risks</span>
            <ul className="space-y-1 text-muted-foreground">
              {match.risks.map((rk, idx) => (
                <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <span>{rk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Expand / Collapse Action Plan Drawer */}
      <div className="pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full h-9 gap-1.5 rounded-xl border-border/80 text-xs font-semibold text-foreground hover:border-primary/40"
        >
          <span>{isExpanded ? "Hide Action Plan" : "View Step-by-Step Action Plan"}</span>
          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>

        {isExpanded && <RoleActionPlan actions={match.next_steps} />}
      </div>
    </div>
  );
}
