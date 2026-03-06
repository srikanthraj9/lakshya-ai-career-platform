import { useState } from "react";
import { roleService } from "@/services/role";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Target, CheckCircle, XCircle, BookOpen } from "lucide-react";
import { toast } from "sonner";
import type { RoleAlignment } from "@/types";

export default function RoleAlignmentPage() {
  const [resumeId, setResumeId] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RoleAlignment | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeId || !role) return;
    setLoading(true);
    try {
      const data = await roleService.alignRole(resumeId, role);
      setResult(data);
    } catch {
      toast.error("Analysis failed. Check your resume ID and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Role Alignment</h1>
        <p className="text-muted-foreground">See how well your profile matches a target role.</p>
      </div>

      <form onSubmit={handleAnalyze} className="glass-card rounded-2xl p-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Resume ID</Label>
            <Input value={resumeId} onChange={(e) => setResumeId(e.target.value)} placeholder="Enter resume ID" required />
          </div>
          <div className="space-y-2">
            <Label>Target Role</Label>
            <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Frontend Developer" required />
          </div>
        </div>
        <Button variant="gradient" type="submit" disabled={loading}>
          {loading ? "Analyzing..." : "Analyze Alignment"}
        </Button>
      </form>

      {result && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="glass-card flex items-center gap-6 rounded-2xl p-8">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
              <span className="font-display text-4xl font-bold text-primary">{result.match_percentage}%</span>
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold">Role Match</h2>
              <p className="text-muted-foreground">Alignment with target role</p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="glass-card rounded-2xl p-6">
              <h3 className="mb-3 flex items-center gap-2 font-semibold"><CheckCircle className="h-5 w-5 text-chart-4" /> Matched Skills</h3>
              <div className="flex flex-wrap gap-2">
                {result.matched_skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
              </div>
            </div>
            <div className="glass-card rounded-2xl p-6">
              <h3 className="mb-3 flex items-center gap-2 font-semibold"><XCircle className="h-5 w-5 text-destructive" /> Missing Skills</h3>
              <div className="flex flex-wrap gap-2">
                {result.missing_skills.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
              </div>
            </div>
          </div>

          {result.learning_path?.length > 0 && (
            <div className="glass-card rounded-2xl p-6">
              <h3 className="mb-3 flex items-center gap-2 font-semibold"><BookOpen className="h-5 w-5 text-accent" /> Learning Path</h3>
              <ol className="space-y-2">
                {result.learning_path.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
