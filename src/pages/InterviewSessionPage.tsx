import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock3, Loader2, Send, Sparkles, Trophy } from "lucide-react";
import { toast } from "sonner";

import { ErrorFallback } from "@/components/ErrorFallback";
import { PageTransition } from "@/components/PageTransition";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/services/api";
import { interviewService } from "@/services/interview";
import type { InterviewSession } from "@/types";

export default function InterviewSessionPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const session = (location.state as { session?: InterviewSession } | null)?.session ?? null;

  const [question, setQuestion] = useState(session?.question ?? "");
  const [questionIndex, setQuestionIndex] = useState(session?.question_index ?? 1);
  const [totalQuestions, setTotalQuestions] = useState(session?.total_questions ?? 0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(session?.remaining_seconds ?? 30);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session?.session_id) {
      return;
    }

    if (remainingSeconds <= 0 || loading) {
      return;
    }

    const timer = window.setTimeout(() => {
      setRemainingSeconds((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [loading, remainingSeconds, session?.session_id]);

  const handleSubmit = useCallback(async () => {
    if (!session?.session_id || !answer.trim()) {
      return;
    }

    setLoading(true);
    try {
      const result = await interviewService.next(session.session_id, answer);
      setFeedback(result.feedback);
      setScore(result.score);

      if (result.completed) {
        toast.success("Interview complete");
        navigate(`/interview/report/${session.session_id}`);
        return;
      }

      setQuestion(result.question);
      setQuestionIndex(result.question_index);
      setTotalQuestions(result.total_questions);
      setAnswer("");
      setRemainingSeconds(30);
      toast.success("Answer submitted");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [answer, navigate, session?.session_id]);

  const handleEnd = useCallback(() => {
    if (!session?.session_id) {
      navigate("/interview/setup");
      return;
    }
    navigate(`/interview/report/${session.session_id}`);
  }, [navigate, session?.session_id]);

  const progressPercent = useMemo(() => {
    if (!totalQuestions) {
      return 0;
    }
    return Math.min(100, Math.round(((questionIndex - 1) / totalQuestions) * 100));
  }, [questionIndex, totalQuestions]);

  if (!session?.session_id) {
    return (
      <PageTransition>
        <ErrorFallback
          title="Session Missing"
          message="Start a new interview session from the setup page."
          onRetry={() => navigate("/interview/setup")}
        />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Interview Session</h1>
            <p className="text-muted-foreground">
              {session.role} • {session.difficulty} • {session.mode}
            </p>
          </div>
          <div className="flex gap-3">
            <Badge variant="outline" className="border-white/10 bg-white/5 px-3 py-2">
              <Clock3 className="mr-2 h-4 w-4" />
              {remainingSeconds}s
            </Badge>
            <Button variant="outline" onClick={handleEnd} aria-label="End interview session">
              End Interview
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span>Question {questionIndex} of {totalQuestions || 1}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <motion.div
          key={`${session.session_id}-${questionIndex}`}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="glass-card glass-card-hover rounded-2xl p-6">
            <div className="mb-3 flex items-center gap-2 text-sm text-primary">
              <Sparkles className="h-4 w-4" />
              AI Interviewer
            </div>
            <p className="text-lg font-medium text-foreground">{question}</p>
          </div>

          <Textarea
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Type your answer..."
            className="min-h-[170px] bg-secondary/30"
            aria-label="Your answer"
          />

          <Button
            variant="gradient"
            className="w-full"
            onClick={handleSubmit}
            disabled={loading || !answer.trim()}
            aria-label="Submit answer"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Submit Answer
          </Button>

          {feedback ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 md:grid-cols-[1fr_auto]"
            >
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
                  <Trophy className="h-4 w-4" />
                  AI Feedback
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{feedback}</p>
              </div>
              {score !== null ? (
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Score</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{score}</p>
                </div>
              ) : null}
            </motion.div>
          ) : null}
        </motion.div>
      </div>
    </PageTransition>
  );
}
