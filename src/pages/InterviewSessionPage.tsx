import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { interviewService } from "@/services/interview";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Send, Loader2 } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { ErrorFallback } from "@/components/ErrorFallback";
import type { InterviewQuestion } from "@/types";

export default function InterviewSessionPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const sessionId = (location.state as { sessionId?: string })?.sessionId;

  const [question, setQuestion] = useState<InterviewQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);

  const fetchQuestion = useCallback(async () => {
    setFetchError(false);
    try {
      const q = await interviewService.getQuestion();
      setQuestion(q);
      setQuestionCount((c) => c + 1);
      setAnswer("");
    } catch {
      if (questionCount > 0) {
        toast.info("Interview complete!");
        if (sessionId) navigate(`/interview/report/${sessionId}`);
      } else {
        setFetchError(true);
      }
    }
  }, [sessionId, navigate, questionCount]);

  useEffect(() => {
    fetchQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!question || !answer.trim()) return;
    setLoading(true);
    try {
      await interviewService.submitAnswer(question.question_id, answer);
      toast.success("Answer submitted!");
      fetchQuestion();
    } catch {
      toast.error("Failed to submit answer.");
    } finally {
      setLoading(false);
    }
  }, [question, answer, fetchQuestion]);

  const handleEnd = useCallback(() => {
    if (sessionId) navigate(`/interview/report/${sessionId}`);
  }, [sessionId, navigate]);

  if (fetchError) {
    return (
      <PageTransition>
        <ErrorFallback title="Failed to Load Question" message="We couldn't load the interview question." onRetry={fetchQuestion} />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Interview Session</h1>
            <p className="text-muted-foreground">Question {questionCount}</p>
          </div>
          <Button variant="outline" onClick={handleEnd} aria-label="End interview session">End Interview</Button>
        </div>

        {question && (
          <motion.div key={question.question_id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="glass-card glass-card-hover rounded-2xl p-6">
              <p className="text-lg font-medium text-foreground">{question.question}</p>
            </div>
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer..."
              className="min-h-[150px] bg-secondary/30"
              aria-label="Your answer"
            />
            <Button variant="gradient" className="w-full" onClick={handleSubmit} disabled={loading || !answer.trim()} aria-label="Submit answer">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Submit Answer
            </Button>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}
