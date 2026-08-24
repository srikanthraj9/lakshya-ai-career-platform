import React from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  FileText,
  Target,
  Map,
  MessageSquare,
  Briefcase,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RecommendationWhy } from "./RecommendationWhy";
import type { CareerRecommendation } from "@/services/intelligenceService";

interface NextBestActionCardProps {
  action: CareerRecommendation;
  onComplete?: (id: string) => void;
}

export function NextBestActionCard({ action, onComplete }: NextBestActionCardProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "resume":
        return <FileText className="h-5 w-5 text-primary" />;
      case "skill_gap":
        return <Target className="h-5 w-5 text-cyan-400" />;
      case "roadmap":
        return <Map className="h-5 w-5 text-amber-400" />;
      case "interview":
        return <MessageSquare className="h-5 w-5 text-accent" />;
      case "job":
        return <Briefcase className="h-5 w-5 text-emerald-400" />;
      default:
        return <Zap className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <div className="glass-card gradient-border relative overflow-hidden rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
      {/* Background ambient glow */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      {/* Header Tier */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <StatusBadge variant="ai" dot>
            Highest Leverage Action
          </StatusBadge>
          <span className="text-xs text-muted-foreground">• Source: {action.source_module.replace("_", " ")}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
            +{Math.round(action.impact_score * 0.15)}% Readiness Boost
          </span>
        </div>
      </div>

      {/* Title & Description */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 border border-primary/25 shadow-inner">
          {getIcon(action.recommendation_type)}
        </div>

        <div className="space-y-1.5 flex-1 min-w-0">
          <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-foreground">
            {action.title}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {action.description}
          </p>
        </div>
      </div>

      {/* Explainable Why Widget */}
      <RecommendationWhy
        reason={action.reason}
        impactScore={action.impact_score}
        confidenceScore={action.confidence_score}
        urgencyScore={action.urgency_score}
      />

      {/* CTA Trigger Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50">
        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>Completing this action recalculates career readiness immediately.</span>
        </div>

        <div className="flex items-center gap-2.5">
          {onComplete && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onComplete(action.id)}
              className="rounded-xl text-xs gap-1.5 border-border/60 hover:bg-secondary"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              Mark Done
            </Button>
          )}

          {action.action_url && (
            <Button asChild size="sm" className="gradient-primary rounded-xl text-xs text-white gap-2 shadow-lg shadow-primary/25">
              <Link to={action.action_url}>
                <span>{action.action_label || "Execute Action"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
