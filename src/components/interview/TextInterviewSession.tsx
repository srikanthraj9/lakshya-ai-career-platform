import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Send, Sparkles, Trophy, ArrowRight, Loader2, AlertCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { interviewService } from "@/services/interview";
import { getApiErrorMessage } from "@/services/api";
import { toast } from "sonner";
import type { InterviewSession } from "@/types";

interface TextInterviewSessionProps {
  session: InterviewSession;
  onComplete: (sessionId: string) => void;
  onExit: () => void;
}

export function TextInterviewSession({
  session,
  onComplete,
  onExit,
}: TextInterviewSessionProps) {
  const [question, setQuestion] = useState(session.question || "");
  const [questionIndex, setQuestionIndex] = useState(session.question_index || 1);
  const [totalQuestions, setTotalQuestions] = useState(session.total_questions || 5);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(session.remaining_seconds || 45);
  const [loading, setLoading] = useState(false);

  // Load question if initially empty
  useEffect(() => {
    if (!question && session.session_id) {
      interviewService.getSession(session.session_id).then((detail) => {
        const curIdx = detail.current_index;
        if (detail.status === "completed" || curIdx >= detail.questions.length) {
          onComplete(detail.id);
          return;
        }
        setQuestion(detail.questions[curIdx] || "");
        setQuestionIndex(curIdx + 1);
        setTotalQuestions(detail.total_questions);
      }).catch((err) => {
        toast.error(getApiErrorMessage(err));
      });
    }
  }, [question, session.session_id, onComplete]);

  // Timer countdown
  useEffect(() => {
    if (remainingSeconds <= 0 || loading || feedback !== null) {
      return;
    }

    const timer = window.setTimeout(() => {
      setRemainingSeconds((c) => Math.max(c - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [remainingSeconds, loading, feedback]);

  const handleSubmit = useCallback(async () => {
    if (!session.session_id || !answer.trim()) return;

    setLoading(true);
    try {
      const result = await interviewService.next(session.session_id, answer);
      setFeedback(result.feedback);
      setScore(result.score);

      if (result.completed) {
        toast.success("Interview session completed!");
        setTimeout(() => onComplete(session.session_id), 1200);
        return;
      }

      setQuestion(result.question);
      setQuestionIndex(result.question_index);
      setTotalQuestions(result.total_questions);
      setAnswer("");
      setRemainingSeconds(45);
      toast.success("Answer evaluated");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [session.session_id, answer, onComplete]);

  const progressPercent = totalQuestions > 0 ? Math.round(((questionIndex - 1) / totalQuestions) * 100) : 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Session Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">{session.role}</span>
              <StatusBadge variant="ai" className="text-[10px] py-0 px-1.5 capitalize">
                {session.difficulty}
              </StatusBadge>
            </div>
            <p className="text-xs text-muted-foreground">
              Question {questionIndex} of {totalQuestions}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
            remainingSeconds <= 10
              ? "border-rose-500/40 bg-rose-500/10 text-rose-400 animate-pulse"
              : "border-border/70 bg-secondary/30 text-foreground"
          }`}>
            <Clock className="h-3.5 w-3.5" />
            <span>{remainingSeconds}s</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onExit}
            className="h-8 text-xs rounded-xl border-border/80 text-muted-foreground hover:text-foreground"
          >
            End Session
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Interview Progress</span>
          <span className="font-semibold text-foreground">{progressPercent}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/80">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary">
          <Sparkles className="h-4 w-4" />
          <span>AI Technical Question</span>
        </div>

        <h3 className="font-display text-lg sm:text-xl font-bold text-foreground leading-relaxed">
          {question || "Generating technical question..."}
        </h3>
      </div>

      {/* Answer Workspace */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">Your Response</label>
          <p className="text-[11px] text-muted-foreground">
            Structure your answer clearly with relevant technical concepts, trade-offs, and examples.
          </p>
        </div>

        <Textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your structured answer here..."
          className="min-h-[180px] bg-secondary/30 border-border/80 text-xs rounded-2xl leading-relaxed resize-none font-sans"
        />

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSubmit}
            disabled={loading || !answer.trim()}
            variant="gradient"
            className="h-11 px-6 gap-2 text-xs font-bold text-white shadow-lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Evaluating Answer...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Submit Answer</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Live AI Feedback Banner */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-card gradient-border rounded-3xl p-6 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-accent" />
                <h4 className="font-display text-sm font-semibold text-foreground">AI Response Evaluation</h4>
              </div>
              {score !== null && (
                <StatusBadge variant="success" className="text-xs">
                  Score: {score}/100
                </StatusBadge>
              )}
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed bg-secondary/30 p-4 rounded-2xl border border-border/40">
              {feedback}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
