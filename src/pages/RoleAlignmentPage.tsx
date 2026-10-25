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
    error,
    refetch,
  } = useQuery<RoleAlignmentResponse>({
    queryKey: ["role-alignment", activeResumeId, targetRole],
    queryFn: () => roleService.alignRole(activeResumeId!, targetRole),
    enabled: Boolean(activeResumeId),
    retry: import.meta.env.MODE === "test" ? false : 2,
  });

  // Extract distinct categories
  const categories = useMemo(() => {
    if (!roleData?.matches || !Array.isArray(roleData.matches)) return [];
    const set = new Set<string>();
    roleData.matches.forEach((m) => {
      if (m?.category) set.add(m.category);
    });
    return [ALL_CATEGORIES, ...Array.from(set)];
  }, [roleData]);

  // Filter matches
  const filteredMatches = useMemo(() => {
    if (!roleData?.matches || !Array.isArray(roleData.matches)) return [];
    if (selectedCategory === ALL_CATEGORIES) return roleData.matches;
    return roleData.matches.filter((m) => m?.category === selectedCategory);
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
    const errorDetail =
      (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
    const errorMessage = errorDetail && typeof errorDetail === "string"
      ? errorDetail
      : "We could not analyze role alignment for this resume. Please check your connection or try again.";

    return (
      <PageTransition>
        <ErrorFallback
          title="Role Alignment Failed"
          message={errorMessage}
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
        {filteredMatches.length === 0 ? (
          <div className="glass-card rounded-3xl p-8 text-center space-y-3">
            <Compass className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold text-foreground">No roles found in this category</p>
            <p className="text-xs text-muted-foreground">Try selecting "All Categories" to view all evaluated career tracks.</p>
            <Button variant="outline" size="sm" onClick={() => setSelectedCategory(ALL_CATEGORIES)}>
              Reset Filter
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredMatches.map((match, idx) => (
              <RoleMatchCard
                key={match.role_id || `${match.role}-${idx}`}
                match={match}
                isExpandedDefault={idx === 0}
              />
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
