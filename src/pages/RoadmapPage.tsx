import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import {
  Map,
  Sparkles,
  Loader2,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Target,
  ArrowRight,
} from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { RoadmapHeader } from "@/components/roadmap/RoadmapHeader";
import { RoadmapInsights } from "@/components/roadmap/RoadmapInsights";
import { RoadmapMilestoneCard } from "@/components/roadmap/RoadmapMilestoneCard";
import { Button } from "@/components/ui/button";
import { useCareerContext } from "@/hooks/useCareerContext";
import { useAuth } from "@/context/AuthContext";
import { roadmapService } from "@/services/roadmap";
import { getApiErrorMessage } from "@/services/api";
import { getUserStorage, setUserStorage } from "@/lib/userStorage";
import { toast } from "sonner";
import type { RoadmapStep } from "@/types";

function roadmapStorageKey(role: string, experience: string) {
  return `roadmap-progress:${role.trim().toLowerCase()}:${experience.trim().toLowerCase()}`;
}

export default function RoadmapPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const { targetRole, setTargetRole, addSkillToRoadmap } = useCareerContext();

  const [role, setRole] = useState(
    targetRole && targetRole !== "No Target Role Selected" ? targetRole : ""
  );
  const [experience, setExperience] = useState("Intermediate");
  const [roadmap, setRoadmap] = useState<RoadmapStep[]>([]);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Sync role with CareerContext
  useEffect(() => {
    if (targetRole && targetRole !== "No Target Role Selected" && !role) {
      setRole(targetRole);
    }
  }, [targetRole, role]);

  // Load completed steps from user-scoped storage for active roadmap
  const storageKey = useMemo(() => roadmapStorageKey(role, experience), [role, experience]);

  useEffect(() => {
    if (!userId || !role) {
      setCompletedSteps([]);
      return;
    }
    const saved = getUserStorage<number[]>(userId, storageKey, []);
    setCompletedSteps(saved || []);
  }, [userId, storageKey, role]);

  // Mutation for roadmap generation
  const generateMutation = useMutation({
    mutationFn: (vars: { target_role: string; experience_level: string }) =>
      roadmapService.generate(vars),
    onSuccess: (data) => {
      setRoadmap(data.roadmap);
      toast.success("Personalized roadmap generated successfully!");
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err));
    },
  });

  // Auto-generate on initial mount if a real role is present
  useEffect(() => {
    if (role && role.trim().length > 0 && roadmap.length === 0 && !generateMutation.isPending) {
      generateMutation.mutate({ target_role: role, experience_level: experience });
    }
  }, [role]);

  const handleGenerate = () => {
    if (!role.trim()) {
      toast.error("Please enter a target career role.");
      return;
    }
    setTargetRole(role.trim());
    generateMutation.mutate({ target_role: role.trim(), experience_level: experience });
  };

  const handleToggleComplete = useCallback(
    (index: number) => {
      setCompletedSteps((prev) => {
        const next = prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index];
        if (userId) {
          setUserStorage(userId, storageKey, next);
        }
        // Asynchronously persist to server
        roadmapService.saveProgress(role, experience, next).catch(() => {});
        return next;
      });
    },
    [userId, storageKey, role, experience]
  );

  return (
    <PageTransition>
      <div className="space-y-8 max-w-7xl mx-auto pb-12">
        <RoadmapHeader
          role={role}
          experience={experience}
          onRoleChange={setRole}
          onExperienceChange={setExperience}
          onGenerate={handleGenerate}
          isLoading={generateMutation.isPending}
        />

        {generateMutation.isPending ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium text-sm">
              Generating your personalized career acceleration roadmap...
            </p>
          </div>
        ) : !role && roadmap.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/80 bg-secondary/20 p-12 text-center space-y-4 max-w-2xl mx-auto my-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto border border-primary/20">
              <Target className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">No Target Role Selected</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Select your target career role above or complete onboarding to generate a step-by-step
                personalized learning curriculum.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <Link to="/onboarding">
                <Button size="sm" variant="gradient" className="gap-1.5 text-xs">
                  <span>Complete Onboarding</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Milestones & Learning Path</h2>
                  <p className="text-sm text-muted-foreground">
                    Track your mastery and build high-impact production capabilities.
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-primary">
                    {completedSteps.length} of {roadmap.length} Completed
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <AnimatePresence>
                  {roadmap.map((step, idx) => (
                    <RoadmapMilestoneCard
                      key={`step-${idx}`}
                      step={step}
                      index={idx}
                      isCompleted={completedSteps.includes(idx)}
                      onToggleComplete={() => handleToggleComplete(idx)}
                      onAddSkill={addSkillToRoadmap}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <RoadmapInsights
                roadmap={roadmap}
                completedCount={completedSteps.length}
                targetRole={role || "Career Goal"}
              />
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
