import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { interviewService } from "@/services/interview";
import { getApiErrorMessage } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MessageSquare, Loader2 } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { motion } from "framer-motion";

export default function InterviewSetupPage() {
  const [role, setRole] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [mode, setMode] = useState("text");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleStart = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    try {
      const session = await interviewService.start(role, difficulty, mode);
      navigate("/interview/session", { state: { session } });
    } catch (error) {
      const message = getApiErrorMessage(error);
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [role, difficulty, mode, navigate]);

  return (
    <PageTransition>
      <div className="mx-auto max-w-lg space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Mock Interview</h1>
          <p className="text-muted-foreground">Configure and start your AI interview session.</p>
        </div>

        <motion.form
          onSubmit={handleStart}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card glass-card-hover space-y-5 rounded-2xl p-6"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <MessageSquare className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <h2 className="font-display text-lg font-semibold">Interview Setup</h2>
          </div>
          <div className="space-y-2">
            <Label htmlFor="interview-role">Target Role</Label>
            <Input id="interview-role" value={role} onChange={(e) => { setRole(e.target.value); setErrorMessage(null); }} placeholder="e.g. Backend Engineer" required aria-required="true" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="interview-difficulty">Difficulty</Label>
            <Select value={difficulty} onValueChange={(value) => { setDifficulty(value); setErrorMessage(null); }}>
              <SelectTrigger id="interview-difficulty" aria-label="Select difficulty"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="interview-mode">Mode</Label>
            <Select value={mode} onValueChange={(value) => { setMode(value); setErrorMessage(null); }}>
              <SelectTrigger id="interview-mode" aria-label="Select mode"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="voice">Voice</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {errorMessage ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}
          <Button variant="gradient" type="submit" className="w-full" disabled={loading || !role} aria-label="Start interview">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting...</> : "Start Interview"}
          </Button>
        </motion.form>
      </div>
    </PageTransition>
  );
}
