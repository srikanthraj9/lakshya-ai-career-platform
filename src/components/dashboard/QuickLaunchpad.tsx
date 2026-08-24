import React from "react";
import { Link } from "react-router-dom";
import { MessageSquare, Wand2, Map, ArrowRight, Rocket, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/shared/SectionHeader";

export function QuickLaunchpad() {
  const launchers = [
    {
      title: "Voice AI Mock Interview",
      subtitle: "5-min real-time practice session",
      href: "/interview/voice-ai",
      icon: MessageSquare,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10 border-cyan-500/20 hover:border-cyan-500/40",
      cta: "Start Interview",
    },
    {
      title: "AI Resume Rewriter",
      subtitle: "Compile tailored LaTeX & PDF",
      href: "/resume/rewrite",
      icon: Wand2,
      color: "text-primary",
      bg: "bg-primary/10 border-primary/20 hover:border-primary/40",
      cta: "Polish Resume",
    },
    {
      title: "Target Skill Roadmap",
      subtitle: "Follow your learning milestones",
      href: "/roadmap",
      icon: Map,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40",
      cta: "Continue Path",
    },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Quick Start"
        subtitle="Direct shortcuts to Lakshya AI core career studios"
        icon={Rocket}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {launchers.map((item) => (
          <Link
            key={item.title}
            to={item.href}
            className={`glass-card glass-card-hover group flex flex-col justify-between rounded-2xl border p-5 transition-all ${item.bg}`}
          >
            <div className="space-y-2.5">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-background/80 ${item.color}`}>
                <item.icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
              </div>
              <div>
                <h4 className="font-display text-sm font-semibold text-foreground tracking-tight group-hover:text-primary transition-colors">
                  {item.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between pt-2 border-t border-border/40 text-xs font-semibold text-foreground">
              <span>{item.cta}</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1 text-primary" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
