import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Map,
  Sparkles,
  Loader2,
  BookOpen,
  CheckCircle2,
  Target,
  ArrowRight,
  RotateCw,
  AlertCircle,
  HelpCircle,
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

function roadmapCacheKey(role: string, experience: string) {
  return `roadmap-data:${role.trim().toLowerCase()}:${experience.trim().toLowerCase()}`;
}

function progressStorageKey(role: string, experience: string) {
  return `roadmap-progress:${role.trim().toLowerCase()}:${experience.trim().toLowerCase()}`;
}

function taskStorageKey(role: string, experience: string) {
  return `roadmap-tasks:${role.trim().toLowerCase()}:${experience.trim().toLowerCase()}`;
}

export default function RoadmapPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const { targetRole, setTargetRole, detectedSkills, missingSkills } = useCareerContext();

  const [role, setRole] = useState(
    targetRole && targetRole !== "No Target Role Selected" ? targetRole : "Full Stack Developer"
  );
  const [experience, setExperience] = useState("Intermediate");
  const [roadmap, setRoadmap] = useState<RoadmapStep[]>([]);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [expandedSteps, setExpandedSteps] = useState<number[]>([0]);

  // Sync role with CareerContext if targetRole is available
  useEffect(() => {
    if (targetRole && targetRole !== "No Target Role Selected" && !role) {
      setRole(targetRole);
    }
  }, [targetRole, role]);

  const cacheKey = useMemo(() => roadmapCacheKey(role, experience), [role, experience]);
  const progressKey = useMemo(() => progressStorageKey(role, experience), [role, experience]);
  const tasksKey = useMemo(() => taskStorageKey(role, experience), [role, experience]);

  // Load cached roadmap, progress, and checklist tasks on role or experience change
  useEffect(() => {
    if (!userId || !role.trim()) return;

    // 1. Load cached roadmap structure if present
    const cachedRoadmap = getUserStorage<RoadmapStep[]>(userId, cacheKey, []);
    if (cachedRoadmap && cachedRoadmap.length > 0) {
      setRoadmap(cachedRoadmap);
    }

    // 2. Load completed steps
    const savedSteps = getUserStorage<number[]>(userId, progressKey, []);
    setCompletedSteps(savedSteps || []);

    // 3. Load completed checklist tasks
    const savedTasks = getUserStorage<string[]>(userId, tasksKey, []);
    setCompletedTasks(savedTasks || []);
  }, [userId, cacheKey, progressKey, tasksKey, role]);

  // Query server for saved roadmap progress records and reconcile
  useQuery({
    queryKey: ["roadmap-progress", userId, role, experience],
    queryFn: async () => {
      const records = await roadmapService.getProgress();
      const currentRecord = records.find(
        (r) =>
          r.role.trim().toLowerCase() === role.trim().toLowerCase() &&
          r.experience_level.trim().toLowerCase() === experience.trim().toLowerCase()
      );
      if (currentRecord && Array.isArray(currentRecord.completed_steps)) {
        setCompletedSteps((prev) => {
          const merged = Array.from(new Set([...prev, ...currentRecord.completed_steps]));
          if (userId) {
            setUserStorage(userId, progressKey, merged);
          }
          return merged;
        });
      }
      return records;
    },
    enabled: Boolean(userId && role.trim()),
    staleTime: 60000,
  });

  // Mutation for generating roadmap
  const generateMutation = useMutation({
    mutationFn: (vars: {
      target_role: string;
      experience_level: string;
      current_skills?: string[];
      missing_skills?: string[];
    }) => roadmapService.generate(vars),
    onSuccess: (data) => {
      if (data?.roadmap && data.roadmap.length > 0) {
        setRoadmap(data.roadmap);
        if (userId) {
          setUserStorage(userId, cacheKey, data.roadmap);
        }
        // Expand first milestone by default
        setExpandedSteps([0]);
        toast.success(
          data.is_personalized
            ? "Personalized career roadmap generated based on your profile and target role!"
            : "Adaptive career roadmap generated successfully!"
        );
      }
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err));
    },
  });

  // Auto-generate on mount if no cached roadmap exists and role is valid
  useEffect(() => {
    if (role && role.trim().length > 0 && roadmap.length === 0 && !generateMutation.isPending) {
      generateMutation.mutate({
        target_role: role.trim(),
        experience_level: experience,
        current_skills: detectedSkills,
        missing_skills: missingSkills,
      });
    }
  }, [role, experience]);

  const handleGenerate = () => {
    if (!role.trim()) {
      toast.error("Please enter a target career role.");
      return;
    }
    setTargetRole(role.trim());
    generateMutation.mutate({
      target_role: role.trim(),
      experience_level: experience,
      current_skills: detectedSkills,
      missing_skills: missingSkills,
    });
  };

  // Toggle milestone completion
  const handleToggleComplete = useCallback(
    (index: number) => {
      setCompletedSteps((prev) => {
        const next = prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index];
        if (userId) {
          setUserStorage(userId, progressKey, next);
        }
        roadmapService.saveProgress(role, experience, next).catch(() => {});
        return next;
      });
    },
    [userId, progressKey, role, experience]
  );

  // Toggle checklist tasks
  const handleToggleTask = useCallback(
    (taskId: string) => {
      setCompletedTasks((prev) => {
        const next = prev.includes(taskId) ? prev.filter((t) => t !== taskId) : [...prev, taskId];
        if (userId) {
          setUserStorage(userId, tasksKey, next);
        }
        return next;
      });
    },
    [userId, tasksKey]
  );

  // Toggle milestone card expansion
  const handleToggleExpand = useCallback((index: number) => {
    setExpandedSteps((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  }, []);

  // Add individual missing skill to roadmap
  const handleAddSkill = useCallback(
    (skill: string) => {
      if (!skill.trim()) return;

      // Check if skill already exists in roadmap
      const skillLower = skill.trim().toLowerCase();
      const alreadyExists = roadmap.some((step) => {
        if (step.title?.toLowerCase().includes(skillLower)) return true;
        if (step.step?.toLowerCase().includes(skillLower)) return true;
        if (step.skills?.some((s) => s.toLowerCase() === skillLower)) return true;
        return false;
      });

      if (alreadyExists) {
        toast.info(`"${skill}" is already included in your roadmap milestones!`);
        return;
      }

      const newMilestone: RoadmapStep = {
        step: `Targeted Skill Enhancement: Master ${skill}`,
        title: `Master ${skill}`,
        duration: "1-2 weeks",
        stage: "Custom Skill Gap Focus",
        skills: [skill],
        why_it_matters: `Targeted proficiency in ${skill} directly strengthens your technical qualifications for ${role} roles.`,
        prerequisites: ["Core software engineering principles"],
        beginner_friendly_explanation: `A structured learning module to build production confidence and practical project capability with ${skill}.`,
        practical_project: `Build and deploy an application component or standalone service integrating ${skill} with automated test coverage.`,
        checklist: [
          `Study core architecture and idioms of ${skill}`,
          `Set up local development workflow and build a prototype`,
          `Integrate ${skill} into an end-to-end practical solution`,
          `Write unit tests and document the implementation`,
        ],
        resources: [
          { name: `${skill} Documentation & Reference`, url: "https://devdocs.io/" },
          { name: "Developer Roadmap Guide", url: "https://roadmap.sh" },
        ],
      };

      const updatedRoadmap = [...roadmap, newMilestone];
      setRoadmap(updatedRoadmap);
      if (userId) {
        setUserStorage(userId, cacheKey, updatedRoadmap);
      }
      toast.success(`Added "${skill}" to your Career Roadmap!`);
    },
    [roadmap, role, userId, cacheKey]
  );

  // Add all eligible missing skills to roadmap
  const handleAddAllSkills = useCallback(() => {
    if (!missingSkills || missingSkills.length === 0) return;

    // Filter out skills already in the roadmap
    const existingSkillsSet = new Set<string>();
    roadmap.forEach((step) => {
      (step.skills || []).forEach((s) => existingSkillsSet.add(s.toLowerCase()));
      if (step.title) existingSkillsSet.add(step.title.toLowerCase());
      if (step.step) existingSkillsSet.add(step.step.toLowerCase());
    });

    const skillsToAdd = missingSkills.filter((s) => !existingSkillsSet.has(s.toLowerCase()));

    if (skillsToAdd.length === 0) {
      toast.info("All detected skill gaps are already in your roadmap!");
      return;
    }

    const newMilestones: RoadmapStep[] = skillsToAdd.map((skill) => ({
      step: `Targeted Skill Enhancement: Master ${skill}`,
      title: `Master ${skill}`,
      duration: "1-2 weeks",
      stage: "Skill Gap Acceleration",
      skills: [skill],
      why_it_matters: `Mastery of ${skill} addresses key hiring criteria for ${role}.`,
      prerequisites: ["Core engineering foundations"],
      beginner_friendly_explanation: `Step-by-step guidance to achieve production fluency in ${skill}.`,
      practical_project: `Build a portfolio project demonstrating ${skill} in a real-world scenario with tests.`,
      checklist: [
        `Learn the fundamentals and best practices of ${skill}`,
        `Complete a hands-on implementation exercise`,
        `Integrate ${skill} into your existing portfolio projects`,
        `Validate your implementation with unit tests`,
      ],
      resources: [
        { name: `${skill} Official Docs`, url: "https://devdocs.io/" },
        { name: "Developer Roadmap Reference", url: "https://roadmap.sh" },
      ],
    }));

    const updatedRoadmap = [...roadmap, ...newMilestones];
    setRoadmap(updatedRoadmap);
    if (userId) {
      setUserStorage(userId, cacheKey, updatedRoadmap);
    }
    toast.success(`Added ${skillsToAdd.length} recommended skills to your Career Roadmap!`);
  }, [missingSkills, roadmap, role, userId, cacheKey]);

  return (
    <PageTransition>
      <div className="space-y-8 max-w-7xl mx-auto pb-16 px-4 sm:px-6 lg:px-8">
        {/* Header with Role & Level Selection */}
        <RoadmapHeader
          role={role}
          experience={experience}
          onRoleChange={setRole}
          onExperienceChange={setExperience}
          onGenerate={handleGenerate}
          isGenerating={generateMutation.isPending}
          isLoading={generateMutation.isPending}
          totalMilestones={roadmap.length}
          completedMilestones={completedSteps.length}
        />

        {/* State 1: Generating Roadmap */}
        {generateMutation.isPending ? (
          <div className="glass-card rounded-3xl p-16 text-center space-y-4 max-w-2xl mx-auto border border-primary/20">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto border border-primary/20">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-display text-lg font-bold text-foreground">
                Sequencing Your Career Roadmap...
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                Analyzing verified profile competencies, aligning with {role} hiring benchmarks, and constructing practical production milestones.
              </p>
            </div>
          </div>
        ) : !role && roadmap.length === 0 ? (
          /* State 2: Empty State */
          <div className="rounded-3xl border border-dashed border-border/80 bg-secondary/20 p-12 text-center space-y-4 max-w-2xl mx-auto my-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto border border-primary/20">
              <Target className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">No Target Role Selected</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Enter your target career role above or select one of the suggested roles to generate a structured, personalized learning curriculum.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <Button
                size="sm"
                variant="gradient"
                className="gap-1.5 text-xs font-semibold"
                onClick={() => setRole("Full Stack Developer")}
              >
                <span>Select Full Stack Developer</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          /* State 3: Roadmap Content & Insights */
          <div className="grid gap-8 lg:grid-cols-12">
            {/* Left 8 Cols: Milestones & Curriculum */}
            <div className="lg:col-span-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" /> Milestones & Learning Path
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Sequenced from foundational capabilities to advanced, job-ready production mastery.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-primary/10 px-3.5 py-1.5 rounded-full border border-primary/20 self-start sm:self-auto">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-primary">
                    {completedSteps.length} of {roadmap.length} Milestones Completed
                  </span>
                </div>
              </div>

              {/* Milestone Cards List */}
              <div className="space-y-4">
                <AnimatePresence>
                  {roadmap.map((step, idx) => (
                    <motion.div
                      key={`step-${idx}-${step.title || step.step}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, delay: idx * 0.04 }}
                    >
                      <RoadmapMilestoneCard
                        step={step}
                        index={idx}
                        isCompleted={completedSteps.includes(idx)}
                        onToggleComplete={() => handleToggleComplete(idx)}
                        isExpanded={expandedSteps.includes(idx)}
                        onToggleExpand={() => handleToggleExpand(idx)}
                        completedTasks={completedTasks}
                        onToggleTask={handleToggleTask}
                        onAddSkill={handleAddSkill}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Bottom Generate Again Prompt */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-3xl border border-border/60 bg-secondary/20">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-foreground">
                      Ready to adapt or adjust your path?
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      You can change your target role or experience level anytime to recalculate your roadmap.
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending}
                  className="rounded-xl border-border/80 text-xs font-semibold gap-1.5 shrink-0"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Re-Generate Roadmap</span>
                </Button>
              </div>
            </div>

            {/* Right 4 Cols: Insights & Skill Gaps Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              <RoadmapInsights
                roadmap={roadmap}
                completedCount={completedSteps.length}
                targetRole={role || "Target Role"}
                missingSkills={missingSkills}
                onAddSkill={handleAddSkill}
                onAddAllSkills={handleAddAllSkills}
              />
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
