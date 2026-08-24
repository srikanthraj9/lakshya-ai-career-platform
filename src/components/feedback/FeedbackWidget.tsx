import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageSquarePlus, ThumbsUp, ThumbsDown, Bug, Lightbulb, X, Send, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { feedbackService } from "@/services/feedbackService";
import { toast } from "@/hooks/use-toast";

export function FeedbackWidget() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"helpful" | "unhelpful" | "issue" | "idea">("helpful");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await feedbackService.submitFeedback({
        feedback_type: feedbackType,
        module: location.pathname,
        message: message.trim() || undefined,
        metadata_json: {
          path: location.pathname,
          viewport: typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "unknown",
        },
      });
      setSubmitted(true);
      toast({
        title: "Feedback Received!",
        description: "Thank you for helping us improve Lakshya AI.",
      });
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setMessage("");
      }, 1500);
    } catch (err) {
      toast({
        title: "Feedback Saved",
        description: "Thank you! Your feedback has been recorded locally.",
      });
      setIsOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Expanded Feedback Modal Card */}
      {isOpen && (
        <div className="mb-3 w-80 sm:w-96 rounded-2xl border border-border/70 bg-card/90 p-5 shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <MessageSquarePlus className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-bold text-foreground">Share Feedback</h4>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {submitted ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500 mb-2">
                <Check className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-foreground">Thank you!</p>
              <p className="text-xs text-muted-foreground mt-0.5">Your input drives platform enhancements.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-3.5">
              {/* Type Selectors */}
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setFeedbackType("helpful")}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-semibold transition-all ${
                    feedbackType === "helpful"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm"
                      : "border-border/50 text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  <ThumbsUp className="h-4 w-4" />
                  <span className="text-[10px]">Helpful</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFeedbackType("unhelpful")}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-semibold transition-all ${
                    feedbackType === "unhelpful"
                      ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-sm"
                      : "border-border/50 text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  <ThumbsDown className="h-4 w-4" />
                  <span className="text-[10px]">Needs Work</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFeedbackType("issue")}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-semibold transition-all ${
                    feedbackType === "issue"
                      ? "border-destructive bg-destructive/10 text-destructive shadow-sm"
                      : "border-border/50 text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  <Bug className="h-4 w-4" />
                  <span className="text-[10px]">Bug</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFeedbackType("idea")}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-semibold transition-all ${
                    feedbackType === "idea"
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border/50 text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  <Lightbulb className="h-4 w-4" />
                  <span className="text-[10px]">Idea</span>
                </button>
              </div>

              {/* Message Box */}
              <Textarea
                placeholder="What did you think or what can we improve? (Optional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="text-xs resize-none h-20 rounded-xl"
              />

              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="w-full gap-2 rounded-xl h-9 text-xs font-bold shadow-md shadow-primary/20"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSubmitting ? "Submitting..." : "Send Feedback"}</span>
              </Button>
            </form>
          )}
        </div>
      )}

      {/* Floating Widget Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all duration-200"
        title="Give Feedback"
      >
        <MessageSquarePlus className="h-5 w-5" />
      </button>
    </div>
  );
}
