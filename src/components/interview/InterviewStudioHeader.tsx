import React from "react";
import { MessageSquare, Mic, History, Plus, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";

export type InterviewMode = "text" | "voice";
export type InterviewStage = "setup" | "active" | "report";

interface InterviewStudioHeaderProps {
  mode: InterviewMode;
  stage: InterviewStage;
  onModeChange?: (mode: InterviewMode) => void;
  onNewSession?: () => void;
  onViewHistory?: () => void;
  isHistoryOpen?: boolean;
}

export function InterviewStudioHeader({
  mode,
  stage,
  onModeChange,
  onNewSession,
  onViewHistory,
  isHistoryOpen = false,
}: InterviewStudioHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border/50">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Interview Intelligence Studio
          </h1>
          <StatusBadge variant="ai" dot>
            {mode === "voice" ? "Voice AI Live" : "Interactive Simulator"}
          </StatusBadge>
        </div>
        <p className="text-sm text-muted-foreground">
          Simulate realistic technical and behavioral interviews with real-time AI scoring and STAR feedback.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* Mode Switcher Buttons when in setup or report stage */}
        {stage === "setup" && onModeChange && (
          <div className="flex rounded-2xl border border-border/70 bg-secondary/30 p-1 backdrop-blur-xl">
            <button
              onClick={() => onModeChange("text")}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                mode === "text"
                  ? "bg-gradient-to-r from-primary to-accent text-white shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Text Simulator</span>
            </button>

            <button
              onClick={() => onModeChange("voice")}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                mode === "voice"
                  ? "bg-gradient-to-r from-primary to-accent text-white shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mic className="h-3.5 w-3.5" />
              <span>Voice AI</span>
            </button>
          </div>
        )}

        {/* History Toggle */}
        {onViewHistory && (
          <Button
            variant="outline"
            size="sm"
            onClick={onViewHistory}
            className={`h-9 gap-1.5 rounded-xl text-xs font-medium border-border/80 ${
              isHistoryOpen ? "bg-primary/10 border-primary text-primary" : "bg-secondary/30 text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>History</span>
          </Button>
        )}

        {/* New Session Action */}
        {stage !== "setup" && onNewSession && (
          <Button
            variant="gradient"
            size="sm"
            onClick={onNewSession}
            className="h-9 gap-1.5 rounded-xl text-xs font-semibold text-white shadow-md"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Session</span>
          </Button>
        )}
      </div>
    </div>
  );
}
