import React, { useState, useEffect } from "react";
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
import { Target, Sparkles } from "lucide-react";
import type { CareerGoal } from "@/services/intelligenceService";

interface CareerGoalEditorProps {
  isOpen: boolean;
  onClose: () => void;
  currentGoal: CareerGoal | null;
  onSave: (payload: Partial<CareerGoal>) => Promise<void>;
}

export function CareerGoalEditor({
  isOpen,
  onClose,
  currentGoal,
  onSave,
}: CareerGoalEditorProps) {
  const [role, setRole] = useState(currentGoal?.target_role || "Senior Full Stack Engineer");
  const [company, setCompany] = useState(currentGoal?.target_company || "Tier 1 Tech Companies");
  const [salary, setSalary] = useState(currentGoal?.target_salary || "$150,000 - $190,000");
  const [readinessScore, setReadinessScore] = useState(currentGoal?.target_readiness_score || 90);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentGoal) {
      setRole(currentGoal.target_role);
      setCompany(currentGoal.target_company || "");
      setSalary(currentGoal.target_salary || "");
      setReadinessScore(currentGoal.target_readiness_score || 90);
    }
  }, [currentGoal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role.trim()) return;

    setIsSaving(true);
    try {
      await onSave({
        id: currentGoal?.id,
        target_role: role.trim(),
        target_company: company.trim() || undefined,
        target_salary: salary.trim() || undefined,
        target_readiness_score: Number(readinessScore),
        is_active: true,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-6 border-border/80 bg-popover/95 backdrop-blur-2xl shadow-2xl rounded-3xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs">
            <Target className="h-4 w-4" />
            <span>CAREER STRATEGY</span>
          </div>
          <DialogTitle className="font-display text-lg font-bold text-foreground">
            Configure Target Career Goal
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Target Role Title</Label>
            <Input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Senior Full Stack Engineer"
              className="rounded-xl border-border/60 bg-secondary/30 text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Target Company / Tier</Label>
            <Input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Google, Stripe, High-Growth Series B"
              className="rounded-xl border-border/60 bg-secondary/30 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Target Salary</Label>
              <Input
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="e.g. $160,000"
                className="rounded-xl border-border/60 bg-secondary/30 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Readiness Target (%)</Label>
              <Input
                type="number"
                min={50}
                max={100}
                value={readinessScore}
                onChange={(e) => setReadinessScore(Number(e.target.value))}
                className="rounded-xl border-border/60 bg-secondary/30 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSaving}
              className="gradient-primary rounded-xl text-xs text-white shadow-md shadow-primary/25"
            >
              {isSaving ? "Saving..." : "Save Goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
