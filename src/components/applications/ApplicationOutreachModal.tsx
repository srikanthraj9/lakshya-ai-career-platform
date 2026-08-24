import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Copy, CheckCircle2, Send, Bot } from "lucide-react";
import { toast } from "sonner";
import type { JobApplication } from "@/services/applicationTrackerService";

interface ApplicationOutreachModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: JobApplication | null;
}

export function ApplicationOutreachModal({
  isOpen,
  onClose,
  application,
}: ApplicationOutreachModalProps) {
  const [outreachType, setOutreachType] = useState<"cold_email" | "linkedin_recruiter" | "follow_up">("cold_email");
  const [copied, setCopied] = useState(false);

  if (!application) return null;

  const getGeneratedMessage = () => {
    switch (outreachType) {
      case "linkedin_recruiter":
        return `Hi [Recruiter Name],\n\nI noticed the ${application.job_title} opening at ${application.company_name} and wanted to connect. With deep hands-on expertise in React, TypeScript, Node.js, and high-scale APIs, my background strongly aligns with your engineering benchmarks.\n\nI've submitted my application and would love to share how I can contribute to the team's roadmap. Looking forward to connecting!\n\nBest,\nSrikanth`;
      case "follow_up":
        return `Subject: Following up on ${application.job_title} Application — Srikanth\n\nHi [Hiring Team],\n\nI hope you're having a productive week. I'm following up on my application for the ${application.job_title} role at ${application.company_name}.\n\nI remain very enthusiastic about your team's mission and technical architecture. Please let me know if there are any additional project details or technical artifacts I can provide to support the evaluation process.\n\nBest regards,\nSrikanth`;
      default:
        return `Subject: Application & Introduction: ${application.job_title} — Srikanth\n\nHi [Hiring Manager / Team],\n\nI recently applied for the ${application.job_title} position at ${application.company_name}. With verified experience architecting resilient microservices, high-throughput APIs in FastAPI/Node, and high-performance React frontends, I was particularly drawn to your team's scalable infrastructure.\n\nI've attached my resume and would welcome the opportunity for a brief conversation about how my background can accelerate your immediate technical deliverables.\n\nThank you for your time and consideration,\nSrikanth`;
    }
  };

  const message = getGeneratedMessage();

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success("Outreach note copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-6 border-border/80 bg-popover/95 backdrop-blur-2xl shadow-2xl rounded-3xl space-y-4">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs">
            <Bot className="h-4 w-4" />
            <span>COPILOT OUTREACH ENGINE</span>
          </div>
          <DialogTitle className="font-display text-lg font-bold text-foreground">
            Generate Outreach Note for {application.company_name}
          </DialogTitle>
        </DialogHeader>

        {/* Outreach Type Pills */}
        <div className="flex items-center gap-1.5 bg-secondary/40 p-1 rounded-xl border border-border/50 text-xs">
          <button
            onClick={() => setOutreachType("cold_email")}
            className={`flex-1 rounded-lg py-1.5 font-semibold text-xs transition-all ${
              outreachType === "cold_email" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Cold Email
          </button>
          <button
            onClick={() => setOutreachType("linkedin_recruiter")}
            className={`flex-1 rounded-lg py-1.5 font-semibold text-xs transition-all ${
              outreachType === "linkedin_recruiter" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            LinkedIn Message
          </button>
          <button
            onClick={() => setOutreachType("follow_up")}
            className={`flex-1 rounded-lg py-1.5 font-semibold text-xs transition-all ${
              outreachType === "follow_up" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Follow-Up Note
          </button>
        </div>

        {/* Message Preview */}
        <div className="space-y-1.5">
          <Textarea
            value={message}
            readOnly
            rows={10}
            className="rounded-2xl border-border/60 bg-secondary/30 text-xs leading-relaxed font-mono"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-primary" /> Personalized from verified skills
          </span>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs">
              Close
            </Button>
            <Button
              size="sm"
              onClick={handleCopy}
              className="gradient-primary rounded-xl text-xs text-white gap-1.5 shadow-md shadow-primary/25"
            >
              {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy Note"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
