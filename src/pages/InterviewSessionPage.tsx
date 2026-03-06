import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { interviewService } from "@/services/interview";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Send, Loader2 } from "lucide-react";
import type { InterviewQuestion } from "@/types";

export default function InterviewSessionPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const sessionId = (location.state as { sessionId?: string })?.sessionId;

  const [question, setQuestion] = useState<InterviewQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);

  const fetchQuestion = async () => {
    try {
      const q = await interviewService.getQuestion();
      setQuestion(q);
      setQuestionCount((c) => c + 1);
      setAnswer("");
    } catch {
      toast.info("Interview complete!");
      if (sessionId) navigate(`/interview/report/${sessionId}`);
    }
  };

  useEffect(() => {
    fetchQuestion();
  }, []);

  const handleSubmit = async () => {
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
  };

  const handleEnd = () => {
    if (sessionId) navigate(`/interview/report/${sessionId}`);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Interview Session</h1>
          <p className="text-muted-foreground">Question {questionCount}</p>
        </div>
        <Button variant="outline" onClick={handleEnd}>End Interview</Button>
      </div>

      {question && (
        <motion.div key={question.question_id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
          <div className="glass-card rounded-2xl p-6">
            <p className="text-lg font-medium text-foreground">{question.question}</p>
          </div>
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer..."
            className="min-h-[150px] bg-secondary/30"
          />
          <Button variant="gradient" className="w-full" onClick={handleSubmit} disabled={loading || !answer.trim()}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Submit Answer
          </Button>
        </motion.div>
      )}
    </div>
  );
}
