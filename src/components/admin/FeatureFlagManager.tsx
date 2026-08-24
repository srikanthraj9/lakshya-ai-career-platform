import React, { useState } from "react";
import { Flag, Plus, Check, X, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FeatureFlag } from "@/types";

interface FeatureFlagManagerProps {
  flags: FeatureFlag[];
  isLoading: boolean;
  onToggleFlag: (flagId: string, isEnabled: boolean) => Promise<void>;
  onCreateFlag: (payload: { key: string; name: string; description: string; is_enabled: boolean }) => Promise<void>;
}

export function FeatureFlagManager({
  flags,
  isLoading,
  onToggleFlag,
  onCreateFlag,
}: FeatureFlagManagerProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!key.trim() || !name.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreateFlag({
        key: key.trim().toLowerCase().replace(/\s+/g, "_"),
        name: name.trim(),
        description: description.trim(),
        is_enabled: true,
      });
      setIsCreateOpen(false);
      setKey("");
      setName("");
      setDescription("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Dynamic Feature Toggles</h2>
          <p className="text-xs text-muted-foreground">
            Control platform capabilities and experimental beta features with zero deployment downtime.
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="gap-2 rounded-xl text-xs h-9 shadow-md shadow-primary/20"
        >
          <Plus className="h-4 w-4" />
          <span>New Feature Flag</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 py-12 text-center text-xs text-muted-foreground">
            Loading feature flags...
          </div>
        ) : (
          flags.map((flag) => (
            <div
              key={flag.id}
              className="flex flex-col justify-between rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-xl shadow-sm hover:border-primary/30 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                      flag.is_enabled
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Flag className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{flag.name}</span>
                      <code className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                        {flag.key}
                      </code>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {flag.description || "No description provided."}
                    </p>
                  </div>
                </div>

                <Switch
                  checked={flag.is_enabled}
                  onCheckedChange={(checked) => onToggleFlag(flag.id, checked)}
                />
              </div>

              <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">Audience:</span>
                  <div className="flex gap-1">
                    {flag.target_roles?.map((role) => (
                      <Badge key={role} variant="outline" className="text-[9px] px-1.5 py-0">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Badge
                  variant={flag.is_enabled ? "secondary" : "outline"}
                  className={
                    flag.is_enabled
                      ? "bg-emerald-500/10 text-emerald-500 border-none text-[10px]"
                      : "text-muted-foreground text-[10px]"
                  }
                >
                  {flag.is_enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Feature Flag Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Create Feature Flag
            </DialogTitle>
            <DialogDescription className="text-xs">
              Define a new feature flag key to safely gate experimental features.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2 text-xs">
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-foreground">Flag Name</label>
              <Input
                placeholder="e.g., AI Resume STAR Optimizer"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-foreground">Flag Key</label>
              <Input
                placeholder="e.g., resume_ai_optimize"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="h-9 rounded-xl font-mono text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-foreground">Description</label>
              <Textarea
                placeholder="Explain what functionality this feature flag gates..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[70px] rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!key.trim() || !name.trim() || isSubmitting}>
              {isSubmitting ? "Creating..." : "Save Feature Flag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
