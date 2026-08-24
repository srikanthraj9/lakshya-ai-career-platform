import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CareerReadinessScore } from "@/components/shared/CareerReadinessScore";
import type { CareerReadinessBreakdown } from "@/types/career";

interface DashboardHeroProps {
  userName: string;
  targetRoleTitle: string;
  breakdown: CareerReadinessBreakdown;
}

export function DashboardHero({
  userName,
  targetRoleTitle,
  breakdown,
}: DashboardHeroProps) {
  const hasRole =
    targetRoleTitle &&
    targetRoleTitle !== "No Target Role Selected" &&
    targetRoleTitle !== "Exploring Tech Roles";

  return (
    <section className="space-y-6" aria-label="Career Command Center Hero">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            👋 Welcome back, {userName}
          </h1>
          {hasRole ? (
            <p className="text-sm text-muted-foreground">
              Your <span className="font-medium text-foreground">{targetRoleTitle}</span> career
              journey is moving forward.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your autonomous career intelligence command center. Select your target role to unlock
              tailored roadmaps and diagnostics.
            </p>
          )}
        </div>

        {!hasRole && (
          <Link to="/onboarding">
            <Button size="sm" variant="gradient" className="gap-1.5 text-xs">
              <Target className="h-3.5 w-3.5" />
              <span>Complete Onboarding</span>
              <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
            </Button>
          </Link>
        )}
      </div>

      <CareerReadinessScore breakdown={breakdown} targetRoleTitle={targetRoleTitle} />
    </section>
  );
}
