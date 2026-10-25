import React, { useState, useEffect } from "react";
import { MessageSquare, Mic, Sparkles, Loader2, ArrowRight, ShieldCheck, Zap, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SectionHeader } from "@/components/shared/SectionHeader";
import type { InterviewMode } from "./InterviewStudioHeader";

interface InterviewSetupProps {
  initialRole?: string;
  initialMode?: InterviewMode;
  onStartSession: (role: string, difficulty: string, mode: InterviewMode) => void;
  isLoading?: boolean;
}

export function InterviewSetup({
  initialRole = "",
  initialMode = "text",
  onStartSession,
  isLoading = false,
}: InterviewSetupProps) {
  const [role, setRole] = useState(initialRole);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [mode, setMode] = useState<InterviewMode>(initialMode);

  useEffect(() => {
    if (initialRole) {
      setRole(initialRole);
    }
  }, [initialRole]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!role.trim()) return;
    onStartSession(role.trim(), difficulty, mode);
  };

  const difficulties = [
    { id: "easy" as const, label: "Foundational", level: "Easy", desc: "Core concepts & syntax fundamentals" },
    { id: "medium" as const, label: "Intermediate", level: "Medium", desc: "Real-world engineering & trade-offs" },
    { id: "hard" as const, label: "Senior", level: "Hard", desc: "Scalability, edge cases & system architecture" },
  ];

  return (
    <div className="glass-card gradient-border relative overflow-hidden rounded-3xl p-6 sm:p-10 max-w-3xl mx-auto space-y-8">
      <div className="space-y-2">
        <StatusBadge variant="ai" dot>
          AI Practice Engine
        </StatusBadge>
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Configure Your Mock Interview
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Customize your target role and difficulty level. Lakshya AI will dynamically generate real-world questions and evaluate your responses.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Target Role Input */}
        <div className="space-y-2">
          <Label htmlFor="interview-role" className="text-xs font-semibold text-foreground">
            Target Job Role
          </Label>
          <Input
            id="interview-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Senior Full Stack Engineer, React Developer"
            className="h-11 rounded-xl border-border/80 bg-secondary/30 text-xs font-medium focus:border-primary/50"
            required
          />
          {/* Quick-select Popular Role Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-medium text-muted-foreground mr-1">Popular roles:</span>
            {[
              "Full Stack Engineer",
              "Frontend Developer",
              "Backend Engineer",
              "Data Scientist",
              "DevOps Engineer",
            ].map((popularRole) => (
              <button
                key={popularRole}
                type="button"
                onClick={() => setRole(popularRole)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                  role === popularRole
                    ? "border-primary/50 bg-primary/10 text-primary font-semibold shadow-sm"
                    : "border-border/60 bg-secondary/20 text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                }`}
              >
                {popularRole}
              </button>
            ))}
          </div>
        </div>

        {/* Mode Selector Segment */}
        <div className="space-y-2.5">
          <Label className="text-xs font-semibold text-foreground">Interview Mode</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode("text")}
              className={`flex flex-col items-start p-4 rounded-2xl border transition-all text-left ${
                mode === "text"
                  ? "border-primary/40 bg-primary/10 shadow-[0_0_20px_-5px_rgba(124,92,252,0.2)]"
                  : "border-border/70 bg-secondary/20 hover:border-primary/30"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`p-2 rounded-xl ${mode === "text" ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}`}>
                  <MessageSquare className="h-4 w-4" />
                </div>
                <span className="font-semibold text-xs text-foreground">Text Simulator</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Type your responses with timer & real-time STAR evaluation.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setMode("voice")}
              className={`flex flex-col items-start p-4 rounded-2xl border transition-all text-left ${
                mode === "voice"
                  ? "border-primary/40 bg-primary/10 shadow-[0_0_20px_-5px_rgba(124,92,252,0.2)]"
                  : "border-border/70 bg-secondary/20 hover:border-primary/30"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`p-2 rounded-xl ${mode === "voice" ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}`}>
                  <Mic className="h-4 w-4" />
                </div>
                <span className="font-semibold text-xs text-foreground">Voice AI Assistant</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Live spoken dialogue with audio waveform & speech transcription.
              </p>
            </button>
          </div>
        </div>

        {/* Difficulty Selection */}
        <div className="space-y-2.5">
          <Label className="text-xs font-semibold text-foreground">Difficulty Level</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {difficulties.map((diff) => {
              const isSelected = difficulty === diff.id;
              return (
                <button
                  key={diff.id}
                  type="button"
                  onClick={() => setDifficulty(diff.id)}
                  className={`p-3.5 rounded-2xl border transition-all text-left space-y-1 ${
                    isSelected
                      ? "border-primary/40 bg-primary/10 shadow-sm"
                      : "border-border/70 bg-secondary/20 hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">{diff.label}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        diff.id === "easy"
                          ? "text-emerald-400 bg-emerald-500/10"
                          : diff.id === "medium"
                          ? "text-amber-400 bg-amber-500/10"
                          : "text-rose-400 bg-rose-500/10"
                      }`}
                    >
                      {diff.level}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">{diff.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Start Button */}
        <div className="pt-3">
          <Button
            type="submit"
            disabled={isLoading || !role.trim()}
            variant="gradient"
            className="w-full h-12 gap-2 text-xs font-bold text-white shadow-lg hover:shadow-primary/25 hover:scale-[1.01] transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating AI Interview Session...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Launch {mode === "voice" ? "Voice AI" : "Text"} Interview Session</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
