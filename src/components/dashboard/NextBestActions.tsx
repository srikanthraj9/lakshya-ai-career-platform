import React from "react";
import { Zap, Sparkles } from "lucide-react";
import { AIInsightCard } from "@/components/shared/AIInsightCard";
import { SectionHeader } from "@/components/shared/SectionHeader";
import type { NextBestAction } from "@/types/career";

interface NextBestActionsProps {
  actions: NextBestAction[];
}

export function NextBestActions({ actions }: NextBestActionsProps) {
  return (
    <div className="space-y-4">
      <SectionHeader
        title="What To Do Next"
        subtitle="Prioritized AI recommendations based on your current readiness"
        icon={Zap}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => (
          <AIInsightCard key={action.id} action={action} />
        ))}
      </div>
    </div>
  );
}
