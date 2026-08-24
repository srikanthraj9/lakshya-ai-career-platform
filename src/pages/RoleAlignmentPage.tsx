import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Target, Compass, Sparkles, Loader2, FileText, ArrowRight } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ErrorFallback } from "@/components/ErrorFallback";
import { RoleAlignmentHeader } from "@/components/role/RoleAlignmentHeader";
import { RoleMatchCard } from "@/components/role/RoleMatchCard";
import { useCareerContext } from "@/hooks/useCareerContext";
import { roleService } from "@/services/role";
import type { RoleAlignmentResponse } from "@/types";

const ALL_CATEGORIES = "__all_categories__";

export default function RoleAlignmentPage() {
  const { activeResumeId, targetRole } = useCareerContext();
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORIES);

  // Fetch Role Alignment from backend
  const {
    data: roleData,
    isLoading,
    isError,
    refetch,
  } = useQuery<RoleAlignmentResponse>({
    queryKey: ["role-alignment", activeResumeId],
    queryFn: () => roleService.alignRole(activeResumeId!),
    enabled: Boolean(activeResumeId),
    retry: 2,
  });

  // Extract distinct categories
  const categories = useMemo(() => {
    if (!roleData?.matches) return [];
    const set = new Set<string>();
    roleData.matches.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return [ALL_CATEGORIES, ...Array.from(set)];
  }, [roleData]);

  // Filter matches
  const filteredMatches = useMemo(() => {
    if (!roleData?.matches) return [];
    if (selectedCategory === ALL_CATEGORIES) return roleData.matches;
    return roleData.matches.filter((m) => m.category === selectedCategory);
  }, [roleData, selectedCategory]);

  if (!activeResumeId) {
    return (
      <PageTransition>
        <div className="glass-card rounded-3xl p-10 text-center space-y-4 max-w-xl mx-auto">
          <FileText className="h-10 w-10 text-primary mx-auto" />
          <h2 className="font-display text-lg font-bold text-foreground">Upload a Resume to Analyze Roles</h2>
          <p className="text-xs text-muted-foreground">
            Lakshya AI evaluates your resume against industry role requirements to measure compatibility.
          </p>
          <Link to="/resume/upload">
            <Button variant="gradient" size="sm" className="gap-1.5 text-xs font-semibold text-white">
              <span>Go to Resume Studio</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </PageTransition>
    );
  }

  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-6 max-w-6xl mx-auto">
          <Skeleton className="h-32 w-full rounded-3xl" />
          <div className="space-y-4">
            <Skeleton className="h-64 rounded-3xl" />
            <Skeleton className="h-64 rounded-3xl" />
          </div>
        </div>
      </PageTransition>
    );
  }

  if (isError) {
    return (
      <PageTransition>
        <ErrorFallback
          title="Role Alignment Failed"
          message="We could not analyze role alignment for this resume."
          onRetry={() => refetch()}
        />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header with Career Decision Verdict */}
        <RoleAlignmentHeader
          careerDecision={roleData?.career_decision}
          selectedCategory={selectedCategory}
          categories={categories}
          onSelectCategory={setSelectedCategory}
        />

        {/* Role Matches List */}
        <div className="space-y-6">
          {filteredMatches.map((match, idx) => (
            <RoleMatchCard
              key={match.role_id || `${match.role}-${idx}`}
              match={match}
              isExpandedDefault={idx === 0}
            />
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
