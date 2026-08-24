import React, { useState } from "react";
import { Zap, Bell, CheckCircle2, Shield } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { CareerAutomationRule } from "@/services/intelligenceService";

interface AutomationRulesProps {
  rules?: CareerAutomationRule[];
  onToggleRule?: (id: string, isEnabled: boolean) => void;
}

const DEFAULT_PRESET_RULES = [
  {
    id: "rule-1",
    title: "High-Match Opportunity Alert",
    description: "Notify me immediately when an opening matches ≥90% of my verified tech stack.",
    is_enabled: true,
  },
  {
    id: "rule-2",
    title: "Milestone Interview Validation",
    description: "Prompt a 5-minute Voice AI interview simulation upon completing a Roadmap milestone.",
    is_enabled: true,
  },
  {
    id: "rule-3",
    title: "ATS Density Quality Gate",
    description: "Alert me if my resume score drops below 85% after modifying work experience.",
    is_enabled: false,
  },
  {
    id: "rule-4",
    title: "Goal Deadline Momentum Tracking",
    description: "Elevate critical skill recommendations as my target career goal date approaches.",
    is_enabled: true,
  },
];

export function AutomationRules({ rules, onToggleRule }: AutomationRulesProps) {
  const [localRules, setLocalRules] = useState(DEFAULT_PRESET_RULES);

  const handleToggle = (id: string, next: boolean) => {
    setLocalRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_enabled: next } : r))
    );
    if (onToggleRule) {
      onToggleRule(id, next);
    }
  };

  return (
    <div className="glass-card rounded-3xl p-6 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm font-bold text-foreground">
            Autonomous Career Rules
          </h3>
        </div>
        <StatusBadge variant="ai" dot>
          Active Daemon
        </StatusBadge>
      </div>

      <p className="text-xs text-muted-foreground">
        Event-driven automation rules running across your career signals:
      </p>

      <div className="space-y-3">
        {localRules.map((rule) => (
          <div
            key={rule.id}
            className="flex items-start justify-between gap-4 p-3.5 rounded-2xl border border-border/60 bg-secondary/20 hover:border-primary/40 hover:bg-secondary/40 transition-all"
          >
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-foreground">{rule.title}</h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {rule.description}
              </p>
            </div>

            <Switch
              checked={rule.is_enabled}
              onCheckedChange={(checked) => handleToggle(rule.id, checked)}
              className="shrink-0 mt-1"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
