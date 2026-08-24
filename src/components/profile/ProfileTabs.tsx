import React from "react";
import { motion } from "framer-motion";
import { Gauge, Target, Brain, Shield, User } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProfileTab = "overview" | "goals" | "skills" | "account";

interface ProfileTabsProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
}

export function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  const tabs = [
    { id: "overview" as const, label: "Career Overview", icon: Gauge },
    { id: "goals" as const, label: "Role & Goals", icon: Target },
    { id: "skills" as const, label: "Verified Skills", icon: Brain },
    { id: "account" as const, label: "Account & Security", icon: Shield },
  ];

  return (
    <div className="w-full overflow-x-auto pb-1 no-scrollbar">
      <div className="inline-flex min-w-full sm:min-w-0 items-center gap-1.5 rounded-2xl border border-border/70 bg-secondary/30 p-1.5 backdrop-blur-xl">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition-all select-none whitespace-nowrap",
                isActive
                  ? "text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="profileActiveTab"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-accent shadow-md shadow-primary/20"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <tab.icon className={cn("relative z-10 h-3.5 w-3.5", isActive ? "text-white" : "text-muted-foreground")} />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
