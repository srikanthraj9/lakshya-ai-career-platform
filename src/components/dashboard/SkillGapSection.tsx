import React from "react";
import { Link } from "react-router-dom";
import { Target, ArrowRight, Brain, Plus } from "lucide-react";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { SkillBenchmarkBar } from "@/components/shared/SkillBenchmarkBar";
import { Button } from "@/components/ui/button";
import type { SkillBenchmark } from "@/types/career";

interface SkillGapSectionProps {
  benchmarks: SkillBenchmark[];
}

export function SkillGapSection({ benchmarks }: SkillGapSectionProps) {
  const needsWorkCount = benchmarks.filter(
    (b) => b.status === "needs_work" || b.status === "missing"
  ).length;

  return (
    <div className="glass-card glass-card-hover rounded-3xl p-6 flex flex-col justify-between">
      <div>
        <SectionHeader
          title="Skill Gap vs Market Demand"
          subtitle="Your verified proficiency vs target role benchmarks"
          icon={Target}
          action={
            <Link to="/roles/analyze">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary hover:bg-primary/10 h-7 px-2"
              >
                <span>Detailed Matrix</span>
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          }
        />

        {benchmarks.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border/80 bg-secondary/20 p-6 text-center space-y-2">
            <Brain className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-xs font-medium text-foreground">No verified skills scored yet</p>
            <p className="text-[11px] text-muted-foreground">
              Complete your onboarding skills or upload a resume to generate your benchmark matrix.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <Link to="/profile">
                <Button size="sm" variant="outline" className="text-xs h-7">
                  <Plus className="h-3 w-3 mr-1" /> Add Skills
                </Button>
              </Link>
              <Link to="/resume/upload">
                <Button size="sm" variant="gradient" className="text-xs h-7">
                  Upload Resume
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-1 mt-3">
            {benchmarks.map((benchmark, index) => (
              <SkillBenchmarkBar key={benchmark.skill} benchmark={benchmark} index={index} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 text-xs text-muted-foreground">
        <span>Target benchmark: 80%</span>
        {benchmarks.length === 0 ? (
          <span className="text-muted-foreground">Awaiting profile input</span>
        ) : needsWorkCount > 0 ? (
          <span className="font-semibold text-amber-400">
            {needsWorkCount} priority skill{needsWorkCount > 1 ? "s" : ""} need polish
          </span>
        ) : (
          <span className="font-semibold text-emerald-400">
            All verified skills meet benchmark
          </span>
        )}
      </div>
    </div>
  );
}
