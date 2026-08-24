import React, { useState } from "react";
import { Sparkles, Layers, Filter } from "lucide-react";
import { RecommendationCard } from "./RecommendationCard";
import type { CareerRecommendation } from "@/services/intelligenceService";

interface CareerRecommendationsProps {
  recommendations: CareerRecommendation[];
  onComplete: (id: string) => void;
  onDismiss: (id: string) => void;
}

export function CareerRecommendations({
  recommendations,
  onComplete,
  onDismiss,
}: CareerRecommendationsProps) {
  const [filter, setFilter] = useState<"all" | "critical" | "high" | "opportunity">("all");

  const filtered = recommendations.filter((r) => {
    if (filter === "all") return true;
    return r.priority === filter;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <h3 className="font-display text-base font-bold text-foreground">
            Ranked Career Strategy Actions
          </h3>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
            {filtered.length}
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-secondary/40 p-1 rounded-xl border border-border/50 text-xs">
          {(["all", "critical", "high", "opportunity"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-all ${
                filter === tab
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card rounded-3xl p-8 text-center text-xs text-muted-foreground space-y-2">
          <Sparkles className="mx-auto h-6 w-6 text-primary/50" />
          <p>No actions in this priority filter. You're in a great spot!</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((rec) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              onComplete={onComplete}
              onDismiss={onDismiss}
            />
          ))}
        </div>
      )}
    </div>
  );
}
