import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  Cloud,
  Code2,
  Database,
  ExternalLink,
  GitBranch,
  Layers3,
  Loader2,
  Map,
  PlayCircle,
  Rocket,
  Target,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/EmptyState";
import { PageTransition } from "@/components/PageTransition";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/services/api";
import { roadmapService } from "@/services/roadmap";
import type { RoadmapStep } from "@/types";

const experienceLevels = ["Beginner", "Intermediate", "Advanced"];
const ROADMAP_META_KEY = "lakshya:roadmap-meta";

function roadmapStorageKey(role: string, experience: string) {
  return `roadmap-progress:${role.trim().toLowerCase()}:${experience.trim().toLowerCase()}`;
}

function parseDurationToWeeks(duration: string): number {
  const normalized = duration.trim().toLowerCase();
  const match = normalized.match(/(\d+)/);
  const value = match ? Number(match[1]) : 0;

  if (!value) {
    return 0;
  }

  if (normalized.includes("month")) {
    return value * 4;
  }

  if (normalized.includes("day")) {
    return Math.max(1, Math.round(value / 7));
  }

  return value;
}

function stepIcon(step: string) {
  const normalized = step.toLowerCase();

  if (normalized.includes("python") || normalized.includes("javascript") || normalized.includes("typescript")) {
    return Code2;
  }
  if (normalized.includes("api") || normalized.includes("fastapi") || normalized.includes("crud")) {
    return Layers3;
  }
  if (normalized.includes("postgresql") || normalized.includes("sql") || normalized.includes("data")) {
    return Database;
  }
  if (normalized.includes("deploy") || normalized.includes("aws") || normalized.includes("cloud")) {
    return Cloud;
  }
  if (normalized.includes("ci/cd") || normalized.includes("github")) {
    return GitBranch;
  }
  return BrainCircuit;
}

function progressLabel(completedCount: number, totalCount: number) {
  if (!totalCount) {
    return "No roadmap loaded";
  }
  if (!completedCount) {
    return "Ready to begin";
  }
  if (completedCount === totalCount) {
    return "Roadmap completed";
  }
  return "Momentum building";
}

export default function RoadmapPage() {
  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("");
  const [roadmap, setRoadmap] = useState<RoadmapStep[]>([]);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const storageKey = useMemo(() => roadmapStorageKey(role, experience), [experience, role]);

  useEffect(() => {
    if (!roadmap.length) {
      setCompletedSteps([]);
      setExpandedStep(null);
      return;
    }

    const storedValue = localStorage.getItem(storageKey);
    if (!storedValue) {
      setCompletedSteps([]);
      setExpandedStep(0);
      return;
    }

    try {
      const parsed = JSON.parse(storedValue);
      if (Array.isArray(parsed)) {
        setCompletedSteps(parsed.filter((item): item is number => typeof item === "number"));
      } else {
        setCompletedSteps([]);
      }
    } catch {
      setCompletedSteps([]);
    }

    setExpandedStep(0);
  }, [roadmap, storageKey]);

  useEffect(() => {
    if (!roadmap.length) {
      return;
    }
    localStorage.setItem(storageKey, JSON.stringify(completedSteps));
    localStorage.setItem(ROADMAP_META_KEY, JSON.stringify({
      role,
      experience,
      progress: completionPercent,
      completed_count: completedSteps.length,
      total_count: roadmap.length,
      updated_at: new Date().toISOString(),
    }));
  }, [completedSteps, completionPercent, experience, roadmap.length, role, storageKey]);

  const mutation = useMutation({
    mutationFn: () => roadmapService.generate({
      target_role: role,
      experience_level: experience,
    }),
    onSuccess: (data) => {
      setRoadmap(data.roadmap);
      setErrorMessage(null);
      localStorage.setItem(ROADMAP_META_KEY, JSON.stringify({
        role,
        experience,
        progress: 0,
        completed_count: 0,
        total_count: data.roadmap.length,
        updated_at: new Date().toISOString(),
      }));
      toast.success("Roadmap generated");
    },
    onError: (error) => {
      const message = getApiErrorMessage(error);
      setRoadmap([]);
      setCompletedSteps([]);
      setExpandedStep(null);
      setErrorMessage(message);
      toast.error(message);
    },
  });

  const totalWeeks = useMemo(
    () => roadmap.reduce((total, step) => total + parseDurationToWeeks(step.duration), 0),
    [roadmap],
  );
  const completionPercent = roadmap.length ? Math.round((completedSteps.length / roadmap.length) * 100) : 0;
  const completedCount = completedSteps.length;

  const summaryHeadline = role.trim()
    ? `You can become a ${role.trim()} in about ${Math.max(totalWeeks, 1)} weeks`
    : "Generate an AI roadmap for your next role";

  return (
    <PageTransition>
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold tracking-tight">AI Skill Roadmap</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Turn a target role into a guided learning sprint with progress tracking, expandable steps, and action-ready resources.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_38%),rgba(9,12,24,0.92)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
          >
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" aria-hidden="true" />
            <div className="relative z-10 space-y-5 pointer-events-auto">
              <div className="space-y-2">
                <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                  AI Planner
                </Badge>
                <h2 className="font-display text-2xl font-semibold text-foreground">Build your roadmap</h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Choose the role and current level. The planner will turn that into a practical, step-by-step learning path.
                </p>
              </div>

              <div className="space-y-4">
                <Input
                  value={role}
                  onChange={(event) => {
                    setRole(event.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="Target role, e.g. Backend Engineer"
                  className="relative z-20 h-12 rounded-2xl border-white/10 bg-white/5 text-base pointer-events-auto"
                  aria-label="Target role"
                  autoComplete="off"
                  readOnly={false}
                />
                <Select
                  value={experience}
                  onValueChange={(value) => {
                    setExperience(value);
                    setErrorMessage(null);
                  }}
                >
                  <SelectTrigger className="relative z-20 h-12 rounded-2xl border-white/10 bg-white/5 pointer-events-auto" aria-label="Current experience level">
                    <SelectValue placeholder="Current experience level" />
                  </SelectTrigger>
                  <SelectContent>
                    {experienceLevels.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="gradient"
                  className="relative z-20 h-12 w-full rounded-2xl text-base pointer-events-auto"
                  onClick={() => {
                    setErrorMessage(null);
                    mutation.mutate();
                  }}
                  disabled={!role.trim() || !experience || mutation.isPending}
                  aria-label="Generate roadmap"
                >
                  {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
                  Generate Roadmap
                </Button>
              </div>

              {errorMessage ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {errorMessage}
                </div>
              ) : null}

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  <span>Progress</span>
                  <span>{completionPercent}%</span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-[linear-gradient(90deg,rgba(251,191,36,0.95),rgba(244,114,182,0.9),rgba(59,130,246,0.9))]"
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPercent}%` }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                  <span>{progressLabel(completedCount, roadmap.length)}</span>
                  <span>{completedCount}/{roadmap.length || 0} steps</span>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-[30px] border border-primary/15 bg-[linear-gradient(135deg,rgba(20,25,44,0.96),rgba(10,13,25,0.92))] p-6 shadow-[0_24px_70px_rgba(2,6,23,0.28)]"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(251,191,36,0.16),transparent_32%)]" aria-hidden="true" />
              <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-3">
                  <Badge variant="outline" className="border-accent/30 bg-accent/10 text-accent">
                    AI Summary
                  </Badge>
                  <div>
                    <h2 className="font-display text-2xl font-semibold text-foreground">{summaryHeadline}</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                      {roadmap.length
                        ? `This roadmap is tuned for a ${experience || "Beginner"} starting point and focuses on the highest-leverage steps first.`
                        : "Generate a roadmap to get an interactive timeline with durations, resources, and a clear completion path."}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Target Role</p>
                    <p className="mt-2 font-medium text-foreground">{role.trim() || "Not selected"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Experience</p>
                    <p className="mt-2 font-medium text-foreground">{experience || "Not selected"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">ETA</p>
                    <p className="mt-2 font-medium text-foreground">{roadmap.length ? `${Math.max(totalWeeks, 1)} weeks` : "-"}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {mutation.isPending ? (
              <div className="space-y-4" role="status" aria-label="Generating roadmap">
                {[1, 2, 3].map((item) => (
                  <Skeleton key={item} className="h-40 w-full rounded-[28px]" />
                ))}
              </div>
            ) : null}

            {!mutation.isPending && roadmap.length === 0 && !mutation.isSuccess ? (
              <EmptyState
                icon={Map}
                title="Generate Your Roadmap"
                description="Pick a role and experience level to unlock an interactive timeline with milestones, resources, and progress tracking."
              />
            ) : null}

            {!mutation.isPending && roadmap.length > 0 ? (
              <div className="relative pl-4" role="list" aria-label="Learning roadmap">
                <div className="absolute left-[1.55rem] top-4 bottom-4 w-px bg-gradient-to-b from-primary/80 via-accent/60 to-transparent" aria-hidden="true" />
                <div className="space-y-5">
                  {roadmap.map((stage, index) => {
                    const Icon = stepIcon(stage.step);
                    const isExpanded = expandedStep === index;
                    const isCompleted = completedSteps.includes(index);
                    const firstResource = stage.resources[0];

                    return (
                      <motion.div
                        key={`${stage.step}-${index}`}
                        initial={{ opacity: 0, x: -24 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.08 }}
                        className="relative"
                        role="listitem"
                      >
                        <div
                          className={`absolute left-0 top-6 z-10 flex h-12 w-12 items-center justify-center rounded-2xl border shadow-[0_12px_30px_rgba(2,6,23,0.18)] ${
                            isCompleted
                              ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-300"
                              : isExpanded
                                ? "border-primary/50 bg-primary/15 text-primary"
                                : "border-white/10 bg-slate-950/80 text-muted-foreground"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>

                        <div className="ml-16 rounded-[26px] bg-gradient-to-br from-primary/30 via-accent/20 to-transparent p-[1px] transition-transform duration-300 hover:-translate-y-1">
                          <div className="rounded-[25px] border border-white/10 bg-[linear-gradient(135deg,rgba(16,20,36,0.98),rgba(8,10,20,0.96))] px-5 py-5">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div className="space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline" className="border-white/10 bg-white/5 text-muted-foreground">
                                    Step {index + 1}
                                  </Badge>
                                  <Badge className={isCompleted ? "bg-emerald-500/20 text-emerald-300" : "bg-primary/15 text-primary"}>
                                    {stage.duration || "Flexible pace"}
                                  </Badge>
                                </div>
                                <div>
                                  <h3 className="font-display text-xl font-semibold text-foreground">{stage.step}</h3>
                                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                    {isCompleted
                                      ? "Completed. Revisit the resources any time you want to refresh or deepen the topic."
                                      : "Expand this step to see the resources, then jump straight into the highest-value learning material."}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {firstResource ? (
                                  <Button asChild variant="gradient" className="rounded-xl">
                                    <a href={firstResource} target="_blank" rel="noreferrer">
                                      <PlayCircle className="mr-2 h-4 w-4" />
                                      Start Learning
                                    </a>
                                  </Button>
                                ) : null}
                                <Button
                                  variant="outline"
                                  className="rounded-xl border-white/10 bg-white/5"
                                  onClick={() => setExpandedStep((current) => current === index ? null : index)}
                                >
                                  {isExpanded ? "Hide Details" : "View Resources"}
                                  <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                </Button>
                                <Button
                                  variant={isCompleted ? "secondary" : "outline"}
                                  className={`rounded-xl ${isCompleted ? "bg-emerald-500/15 text-emerald-300" : "border-white/10 bg-white/5"}`}
                                  onClick={() => {
                                    setCompletedSteps((current) => {
                                      if (current.includes(index)) {
                                        return current.filter((item) => item !== index);
                                      }
                                      return [...current, index].sort((left, right) => left - right);
                                    });
                                  }}
                                >
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  {isCompleted ? "Completed" : "Mark Complete"}
                                </Button>
                              </div>
                            </div>

                            <AnimatePresence initial={false}>
                              {isExpanded ? (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.24, ease: "easeOut" }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-5 border-t border-white/10 pt-5">
                                    <div className="mb-4 flex items-center gap-2">
                                      <BookOpen className="h-4 w-4 text-primary" />
                                      <p className="text-sm font-medium text-foreground">Recommended Resources</p>
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-2">
                                      {stage.resources.map((resource) => (
                                        <a
                                          key={resource}
                                          href={resource}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="group rounded-2xl border border-white/10 bg-white/5 p-4 transition-all duration-300 hover:border-primary/40 hover:bg-primary/10"
                                        >
                                          <div className="flex items-start justify-between gap-3">
                                            <div>
                                              <p className="text-sm font-medium text-foreground">Learning Resource</p>
                                              <p className="mt-1 break-all text-xs leading-5 text-muted-foreground">{resource}</p>
                                            </div>
                                            <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                                          </div>
                                        </a>
                                      ))}
                                    </div>

                                    <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Target className="h-4 w-4 text-accent" />
                                        <span>Suggested sprint length</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                        <span>{stage.duration || "Flexible pace"}</span>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              ) : null}
                            </AnimatePresence>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
