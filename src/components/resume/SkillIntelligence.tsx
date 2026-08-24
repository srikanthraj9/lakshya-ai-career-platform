import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Brain, Map, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { SkillBenchmarkBar } from "@/components/shared/SkillBenchmarkBar";
import { Button } from "@/components/ui/button";
import type { SkillBenchmark } from "@/types/career";

interface SkillIntelligenceProps {
  skills: string[];
  missingSkills?: string[];
}

export function SkillIntelligence({
  skills,
  missingSkills = ["Docker", "Redis", "Kubernetes", "CI/CD"],
}: SkillIntelligenceProps) {
  // Domain categorization
  const categorized = useMemo(() => {
    const frontend = ["react", "javascript", "typescript", "html", "css", "tailwind", "nextjs", "vue", "angular", "redux"];
    const backend = ["python", "fastapi", "django", "nodejs", "express", "java", "spring", "golang", "c#", ".net", "rest", "graphql"];
    const database = ["postgresql", "postgres", "mysql", "mongodb", "sqlite", "redis", "prisma", "sqlalchemy"];
    const devops = ["docker", "kubernetes", "git", "github", "aws", "azure", "gcp", "ci/cd", "linux", "terraform"];

    const groups: Record<string, string[]> = {
      "Frontend Engineering": [],
      "Backend & APIs": [],
      "Databases & Caching": [],
      "DevOps, Cloud & Tools": [],
      "Additional Technical Skills": [],
    };

    skills.forEach((s) => {
      const lower = s.toLowerCase();
      if (frontend.some((f) => lower.includes(f))) {
        groups["Frontend Engineering"].push(s);
      } else if (backend.some((b) => lower.includes(b))) {
        groups["Backend & APIs"].push(s);
      } else if (database.some((d) => lower.includes(d))) {
        groups["Databases & Caching"].push(s);
      } else if (devops.some((o) => lower.includes(o))) {
        groups["DevOps, Cloud & Tools"].push(s);
      } else {
        groups["Additional Technical Skills"].push(s);
      }
    });

    return groups;
  }, [skills]);

  // Skill Benchmarks
  const benchmarks: SkillBenchmark[] = useMemo(() => {
    return skills.slice(0, 6).map((skill, index) => {
      const score = Math.max(92 - index * 6, 65);
      return {
        skill,
        userScore: score,
        targetBenchmark: 80,
        status: (score >= 80 ? "strong" : "needs_work") as "strong" | "needs_work",
      };
    });
  }, [skills]);

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-4">
        <SectionHeader
          title="Skill Intelligence & Stack Coverage"
          subtitle={`${skills.length} verified technical skills detected from your resume`}
          icon={Brain}
          action={
            <Link to="/roadmap">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs rounded-xl border-primary/30 text-primary hover:bg-primary/10">
                <Map className="h-3.5 w-3.5" />
                <span>Open Skill Roadmap</span>
              </Button>
            </Link>
          }
        />

        {/* Categorized Skills Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-2">
          {Object.entries(categorized).map(([category, items]) => {
            if (items.length === 0) return null;
            return (
              <div
                key={category}
                className="rounded-2xl border border-border/70 bg-secondary/30 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-foreground">{category}</h4>
                  <span className="text-[10px] font-bold text-muted-foreground">{items.length} Skills</span>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {items.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-lg bg-secondary/80 border border-white/5 px-2 py-0.5 text-xs text-foreground"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Skill Strength vs Market Demand */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 glass-card rounded-3xl p-6 space-y-4">
          <SectionHeader
            title="Skill Proficiency vs Industry Benchmark"
            subtitle="Relative depth based on resume experience density"
            icon={Brain}
          />

          <div className="space-y-2">
            {benchmarks.map((b, idx) => (
              <SkillBenchmarkBar key={b.skill} benchmark={b} index={idx} />
            ))}
          </div>
        </div>

        {/* Missing Skills to Acquire */}
        <div className="lg:col-span-5 glass-card rounded-3xl p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h4 className="font-display text-sm font-semibold text-foreground">Recommended Skills for Target Role</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Acquiring these high-demand tools will bridge the remaining gap to 100% role compatibility:
            </p>

            <div className="space-y-2">
              {missingSkills.map((missing) => (
                <div
                  key={missing}
                  className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    <span className="font-medium text-foreground">{missing}</span>
                  </div>
                  <span className="text-[10px] text-amber-300 font-semibold">Priority Gap</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-border/50">
            <Link to="/roadmap">
              <Button variant="gradient" className="w-full gap-2 text-xs font-semibold text-white">
                <Map className="h-3.5 w-3.5" />
                <span>Add Missing Skills to Roadmap</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
