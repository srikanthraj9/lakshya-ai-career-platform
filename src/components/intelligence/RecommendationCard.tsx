import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  X,
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

interface RecommendationCardProps {
  recommendation: CareerRecommendation;
  onComplete: (id: string) => void;
  onDismiss: (id: string) => void;
}

export function RecommendationCard({
  recommendation,
  onComplete,
  onDismiss,
}: RecommendationCardProps) {
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "critical":
        return <StatusBadge variant="danger" dot>Critical Priority</StatusBadge>;
      case "high":
        return <StatusBadge variant="warning" dot>High Impact</StatusBadge>;
      case "opportunity":
        return <StatusBadge variant="ai" dot>Opportunity</StatusBadge>;
      default:
        return <StatusBadge variant="neutral">Medium Priority</StatusBadge>;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "resume":
        return <FileText className="h-4 w-4 text-primary" />;
      case "skill_gap":
        return <Target className="h-4 w-4 text-cyan-400" />;
      case "roadmap":
        return <Map className="h-4 w-4 text-amber-400" />;
      case "interview":
        return <MessageSquare className="h-4 w-4 text-accent" />;
      case "job":
        return <Briefcase className="h-4 w-4 text-emerald-400" />;
      default:
        return <Zap className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <div className="glass-card glass-card-hover rounded-3xl p-5 sm:p-6 space-y-4 transition-all">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary border border-border/70">
            {getIcon(recommendation.recommendation_type)}
          </div>
          {getPriorityBadge(recommendation.priority)}
        </div>

        <button
          onClick={() => onDismiss(recommendation.id)}
          className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary transition-colors"
          title="Dismiss recommendation"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-1">
        <h3 className="font-display text-sm sm:text-base font-bold text-foreground">
          {recommendation.title}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {recommendation.description}
        </p>
      </div>

      {/* Explainable Why Widget */}
      <RecommendationWhy
        reason={recommendation.reason}
        impactScore={recommendation.impact_score}
        confidenceScore={recommendation.confidence_score}
        urgencyScore={recommendation.urgency_score}
      />

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
        <button
          onClick={() => onComplete(recommendation.id)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-emerald-400 transition-colors"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Mark Complete</span>
        </button>

        {recommendation.action_url && (
          <Button asChild size="sm" className="gradient-primary rounded-xl text-xs text-white gap-1.5 shadow-md shadow-primary/25">
            <Link to={recommendation.action_url}>
              <span>{recommendation.action_label || "Start"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
