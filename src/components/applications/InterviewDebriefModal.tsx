import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Sparkles, Star, Brain } from "lucide-react";
import type { JobApplication, InterviewDebrief } from "@/services/applicationTrackerService";

interface InterviewDebriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: JobApplication | null;
  onSaveDebrief: (applicationId: string, payload: Partial<InterviewDebrief>) => Promise<InterviewDebrief>;
}

export function InterviewDebriefModal({
  isOpen,
  onClose,
  application,
  onSaveDebrief,
}: InterviewDebriefModalProps) {
  const [roundType, setRoundType] = useState("Technical System Design & Coding");
  const [difficulty, setDifficulty] = useState(3);
  const [techScore, setTechScore] = useState(7);
  const [commScore, setCommScore] = useState(8);
  const [sysScore, setSysScore] = useState(6);
  const [questions, setQuestions] = useState("Design an asynchronous task queue with retry logic; Rate limiting algorithm");
  const [reflection, setReflection] = useState("Felt strong on core API design, but struggled to quantify distributed failover guarantees under network partitions.");
  const [weaknesses, setWeaknesses] = useState("Distributed Consensus, Redis Failover");
  const [outcome, setOutcome] = useState<"passed" | "rejected" | "pending">("pending");
  const [isSaving, setIsSaving] = useState(false);

  if (!application) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const qList = questions.split(";").map((s) => s.trim()).filter(Boolean);
      const wList = weaknesses.split(",").map((s) => s.trim()).filter(Boolean);

      await onSaveDebrief(application.id, {
        company_name: application.company_name,
        round_type: roundType,
        difficulty_rating: Number(difficulty),
        technical_score: Number(techScore),
        communication_score: Number(commScore),
        system_design_score: Number(sysScore),
        questions_asked: qList,
        candidate_reflection: reflection,
        identified_weaknesses: wList,
        outcome,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-6 border-border/80 bg-popover/95 backdrop-blur-2xl shadow-2xl rounded-3xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-accent font-semibold text-xs">
            <Brain className="h-4 w-4" />
            <span>OUTCOME LEARNING SYSTEM</span>
          </div>
          <DialogTitle className="font-display text-lg font-bold text-foreground">
            Log Interview Debrief for {application.company_name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Round Type</Label>
              <Input
                value={roundType}
                onChange={(e) => setRoundType(e.target.value)}
                placeholder="e.g. System Design, Coding"
                className="rounded-xl border-border/60 bg-secondary/30 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Outcome</Label>
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as any)}
                className="w-full h-10 rounded-xl border border-border/60 bg-secondary/30 px-3 text-xs text-foreground"
              >
                <option value="pending">Pending Result</option>
                <option value="passed">Passed Round 🎉</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Structured Rating Sliders */}
          <div className="space-y-2 rounded-2xl border border-border/50 bg-secondary/20 p-3">
            <span className="text-[11px] font-bold text-foreground uppercase tracking-wider block">
              Structured Self-Scoring (1–10)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Technical: {techScore}/10</Label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={techScore}
                  onChange={(e) => setTechScore(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Communication: {commScore}/10</Label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={commScore}
                  onChange={(e) => setCommScore(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Architecture: {sysScore}/10</Label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={sysScore}
                  onChange={(e) => setSysScore(Number(e.target.value))}
                  className="w-full accent-accent"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Questions Asked (separate with semicolon)</Label>
            <Textarea
              value={questions}
              onChange={(e) => setQuestions(e.target.value)}
              placeholder="e.g. Design Twitter search; Reverse a linked list"
              rows={2}
              className="rounded-xl border-border/60 bg-secondary/30 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Personal Reflection & What Went Well</Label>
            <Textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="What answers landed well? Where did the interviewer probe?"
              rows={3}
              className="rounded-xl border-border/60 bg-secondary/30 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Identified Skill Weaknesses (comma-separated)</Label>
            <Input
              value={weaknesses}
              onChange={(e) => setWeaknesses(e.target.value)}
              placeholder="e.g. Redis, Kafka, Concurrency"
              className="rounded-xl border-border/60 bg-secondary/30 text-xs"
            />
            <p className="text-[10px] text-muted-foreground italic">
              These skill tags automatically feed Phase 10's Career Intelligence Engine to generate targeted Roadmap actions.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSaving}
              className="gradient-primary rounded-xl text-xs text-white shadow-md shadow-primary/25"
            >
              {isSaving ? "Saving..." : "Save Debrief"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
