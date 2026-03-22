import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { interviewService } from "@/services/interview";
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
  const navigate = useNavigate();

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const session = await interviewService.start(role, difficulty, mode);
      navigate("/interview/session", { state: { sessionId: session.session_id } });
    } catch {
      toast.error("Failed to start interview.");
    } finally {
      setLoading(false);
    }
  };

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
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <h2 className="font-display text-lg font-semibold">Interview Setup</h2>
          </div>
          <div className="space-y-2">
            <Label>Target Role</Label>
            <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Backend Engineer" required />
          </div>
          <div className="space-y-2">
            <Label>Difficulty</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Mode</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="voice">Voice</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="gradient" type="submit" className="w-full" disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting...</> : "Start Interview"}
          </Button>
        </motion.form>
      </div>
    </PageTransition>
  );
}
