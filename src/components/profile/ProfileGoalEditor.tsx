import React, { useState } from "react";
import { Target, Sparkles, Check, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCareerContext } from "@/hooks/useCareerContext";
import { toast } from "sonner";

export function ProfileGoalEditor() {
  const { targetRole, setTargetRole } = useCareerContext();
  const [roleInput, setRoleInput] = useState(targetRole);
  const [stage, setStage] = useState("Mid-Level");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleInput.trim()) return;
    setTargetRole(roleInput.trim());
    setSaved(true);
    toast.success("Target career goal updated successfully!");
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="glass-card rounded-3xl p-6 space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Target className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold text-foreground">Target Role & Career Objectives</h3>
            <p className="text-[11px] text-muted-foreground">Adjust your aspirational career direction</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Primary Target Role</Label>
          <Input
            value={roleInput}
            onChange={(e) => setRoleInput(e.target.value)}
            placeholder="e.g. Senior Full Stack Engineer"
            className="h-10 rounded-xl bg-secondary/30 border-border/80 text-xs"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Career Experience Level</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger className="h-10 rounded-xl bg-secondary/30 border-border/80 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border bg-popover">
                <SelectItem value="Entry-Level">Entry-Level (0-2 years)</SelectItem>
                <SelectItem value="Mid-Level">Mid-Level (2-5 years)</SelectItem>
                <SelectItem value="Senior">Senior (5-8+ years)</SelectItem>
                <SelectItem value="Lead / Architect">Lead / Staff Architect</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Target Market Domain</Label>
            <Input
              defaultValue="Cloud Platforms & Web Systems"
              className="h-10 rounded-xl bg-secondary/30 border-border/80 text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="gradient"
            size="sm"
            className="gap-1.5 rounded-xl text-xs font-semibold text-white shadow-md"
          >
            {saved ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Save className="h-3.5 w-3.5" />}
            <span>{saved ? "Saved" : "Save Changes"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
