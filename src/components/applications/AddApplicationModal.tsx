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
import { Briefcase, Building, Plus } from "lucide-react";
import { APPLICATION_STAGES, type JobApplication } from "@/services/applicationTrackerService";

interface AddApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: Partial<JobApplication>) => Promise<JobApplication>;
}

export function AddApplicationModal({
  isOpen,
  onClose,
  onCreate,
}: AddApplicationModalProps) {
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("Remote");
  const [salary, setSalary] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [stage, setStage] = useState("wishlist");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !title.trim()) {
      setValidationError("Company Name and Job Title are required.");
      return;
    }
    setValidationError(null);

    setIsSaving(true);
    try {
      await onCreate({
        company_name: company.trim(),
        job_title: title.trim(),
        location: location.trim() || undefined,
        salary_range: salary.trim() || undefined,
        job_url: jobUrl.trim() || undefined,
        stage,
        notes: notes.trim() || undefined,
        match_score_at_application: 85.0,
      });
      onClose();
      setCompany("");
      setTitle("");
      setSalary("");
      setJobUrl("");
      setNotes("");
      setValidationError(null);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-6 border-border/80 bg-popover/95 backdrop-blur-2xl shadow-2xl rounded-3xl space-y-4">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs">
            <Briefcase className="h-4 w-4" />
            <span>APPLICATION PIPELINE</span>
          </div>
          <DialogTitle className="font-display text-lg font-bold text-foreground">
            Track New Job Application
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Company Name</Label>
            <Input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Netflix, Stripe, Datadog"
              className="rounded-xl border-border/60 bg-secondary/30 text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Job Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Full Stack Engineer"
              className="rounded-xl border-border/60 bg-secondary/30 text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Location</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Remote, San Francisco"
                className="rounded-xl border-border/60 bg-secondary/30 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Salary Range</Label>
              <Input
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="e.g. $170k - $210k"
                className="rounded-xl border-border/60 bg-secondary/30 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Pipeline Stage</Label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="w-full h-10 rounded-xl border border-border/60 bg-secondary/30 px-3 text-xs text-foreground"
            >
              {APPLICATION_STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Job Listing URL (Optional)</Label>
            <Input
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="https://..."
              className="rounded-xl border-border/60 bg-secondary/30 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Notes / Referral Contact</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Referred by engineer on LinkedIn..."
              rows={2}
              className="rounded-xl border-border/60 bg-secondary/30 text-xs"
            />
          </div>

          {validationError && (
            <p className="text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-1.5">
              {validationError}
            </p>
          )}

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
              {isSaving ? "Adding..." : "Track Application"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
