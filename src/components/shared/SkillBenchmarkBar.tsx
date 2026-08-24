import React from "react";
import { motion } from "framer-motion";
import { StatusBadge } from "./StatusBadge";
import type { SkillBenchmark } from "@/types/career";
import { cn } from "@/lib/utils";

interface SkillBenchmarkBarProps {
  benchmark: SkillBenchmark;
  index?: number;
}

export function SkillBenchmarkBar({ benchmark, index = 0 }: SkillBenchmarkBarProps) {
  const isStrong = benchmark.status === "strong";
  const isNeedsWork = benchmark.status === "needs_work";

  const barColor = isStrong
    ? "from-emerald-500 to-teal-400"
    : isNeedsWork
    ? "from-amber-500 to-yellow-400"
    : "from-rose-500 to-orange-400";

  const statusVariant = isStrong ? "success" : isNeedsWork ? "warning" : "destructive";
  const statusLabel = isStrong ? "Proficient" : isNeedsWork ? "Needs Polish" : "Skill Gap";

  return (
    <div className="space-y-1.5 py-2">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{benchmark.skill}</span>
          <StatusBadge variant={statusVariant} className="text-[10px] py-0 px-1.5">
            {statusLabel}
          </StatusBadge>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="font-semibold text-foreground">{benchmark.userScore}%</span>
          <span className="text-[11px]">/ Target {benchmark.targetBenchmark}%</span>
        </div>
      </div>

      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary/70">
        {/* Target Benchmark Marker */}
        <div
          className="absolute top-0 bottom-0 z-10 w-0.5 bg-white/40 shadow"
          style={{ left: `${benchmark.targetBenchmark}%` }}
          title={`Target benchmark: ${benchmark.targetBenchmark}%`}
        />

        {/* User score progress bar */}
        <motion.div
          className={cn("h-full rounded-full bg-gradient-to-r", barColor)}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(benchmark.userScore, 4)}%` }}
          transition={{ duration: 0.8, delay: index * 0.08, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
