import React from "react";
import { Link } from "react-router-dom";
import { Trophy, Award, MessageSquare, Shield, CheckCircle2, AlertTriangle, ArrowRight, RotateCcw, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SectionHeader } from "@/components/shared/SectionHeader";
import type { InterviewReport as InterviewReportType } from "@/types";

interface InterviewReportProps {
  report: InterviewReportType;
  onNewInterview?: () => void;
}

export function InterviewReport({ report, onNewInterview }: InterviewReportProps) {
  const scores = [
    { label: "Overall Score", value: report.overall_score, icon: Trophy, color: "text-amber-400" },
    { label: "Technical Knowledge", value: report.technical_score, icon: Award, color: "text-primary" },
    { label: "Communication Clarity", value: report.communication_score, icon: MessageSquare, color: "text-accent" },
    { label: "Answer Confidence", value: report.confidence_score, icon: Shield, color: "text-emerald-400" },
  ];

  const isStrong = report.overall_score >= 80;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="glass-card gradient-border rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">{report.role}</span>
              <StatusBadge variant={isStrong ? "success" : "warning"} dot>
                {isStrong ? "Job Ready Performance" : "Good Progress · Needs Polish"}
              </StatusBadge>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Interview Evaluation Scorecard
            </h2>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              {report.summary || "AI analysis of your technical depth, structured communication, and conceptual clarity."}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onNewInterview && (
              <Button
                variant="gradient"
                size="sm"
                onClick={onNewInterview}
                className="gap-1.5 text-xs font-semibold text-white shadow-md"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Practice Again</span>
              </Button>
            )}
          </div>
        </div>

        {/* 4 KPI Score Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-2">
          {scores.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-border/70 bg-secondary/30 p-4 text-center space-y-1.5"
            >
              <s.icon className={`h-6 w-6 mx-auto ${s.color}`} />
              <div className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                <AnimatedCounter value={s.value} suffix="%" />
              </div>
              <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths & Weaknesses 2-Column Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Strengths */}
        <div className="glass-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
            <h3 className="font-display text-base font-semibold text-foreground">Identified Strengths</h3>
          </div>

          <ul className="space-y-2.5 text-xs">
            {report.strengths.map((st, i) => (
              <li key={i} className="flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-muted-foreground leading-relaxed">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span className="text-foreground">{st}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Areas for Improvement */}
        <div className="glass-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-display text-base font-semibold text-foreground">Areas for Improvement</h3>
          </div>

          <ul className="space-y-2.5 text-xs">
            {report.weaknesses.map((wk, i) => (
              <li key={i} className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-muted-foreground leading-relaxed">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <span className="text-foreground">{wk}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Next Best Practice Action */}
      <div className="glass-card gradient-border rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-accent">Next Best Action</span>
          <h4 className="font-display text-lg font-bold text-foreground">
            Strengthen your interview gaps in the Career Roadmap
          </h4>
          <p className="text-xs text-muted-foreground">
            Bridge your identified conceptual weaknesses with targeted milestone projects.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/roadmap">
            <Button variant="gradient" className="gap-2 text-xs font-semibold text-white shadow-lg">
              <Map className="h-4 w-4" />
              <span>Go to Career Roadmap</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
