import React from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, CheckSquare, Brain, Wand2, History } from "lucide-react";
import { cn } from "@/lib/utils";

export type ResumeStudioTab = "overview" | "ats" | "skills" | "optimize" | "history";

interface ResumeStudioTabsProps {
  activeTab: ResumeStudioTab;
  onTabChange: (tab: ResumeStudioTab) => void;
  hasRewriteResult?: boolean;
}

export function ResumeStudioTabs({
  activeTab,
  onTabChange,
  hasRewriteResult = false,
}: ResumeStudioTabsProps) {
  const tabs = [
    { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
    { id: "ats" as const, label: "ATS Diagnostics", icon: CheckSquare },
    { id: "skills" as const, label: "Skill Intelligence", icon: Brain },
    {
      id: "optimize" as const,
      label: "AI Optimize",
      icon: Wand2,
      badge: hasRewriteResult ? "Generated" : "LaTeX / PDF",
      badgeVariant: "ai",
    },
    { id: "history" as const, label: "Resume History", icon: History },
  ];

  return (
    <div className="w-full overflow-x-auto pb-1 no-scrollbar" role="tablist" aria-label="Resume Studio Tabs">
      <div className="inline-flex min-w-full sm:min-w-0 items-center gap-1.5 rounded-2xl border border-border/70 bg-secondary/30 p-1.5 backdrop-blur-xl">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition-all duration-200 select-none whitespace-nowrap",
                isActive
                  ? "text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="resumeStudioActiveTab"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-accent shadow-md shadow-primary/20"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <tab.icon className={cn("relative z-10 h-3.5 w-3.5", isActive ? "text-white" : "text-muted-foreground")} />
              <span className="relative z-10">{tab.label}</span>
              {tab.badge && (
                <span
                  className={cn(
                    "relative z-10 rounded-full px-1.5 py-0.2 text-[9px] font-bold tracking-wider",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
