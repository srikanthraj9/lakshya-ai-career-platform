import { useState } from "react";
import { roleService } from "@/services/role";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Target, CheckCircle, XCircle, BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { PageTransition } from "@/components/PageTransition";
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
    <PageTransition>
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
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</> : "Analyze Alignment"}
          </Button>
        </form>

        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="glass-card glass-card-hover flex items-center gap-6 rounded-2xl p-8">
              <motion.div
                className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <span className="font-display text-4xl font-bold text-primary">
                  <AnimatedCounter value={result.match_percentage} suffix="%" />
                </span>
              </motion.div>
              <div>
                <h2 className="font-display text-xl font-semibold">Role Match</h2>
                <p className="text-muted-foreground">Alignment with target role</p>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="glass-card glass-card-hover rounded-2xl p-6">
                <h3 className="mb-3 flex items-center gap-2 font-semibold"><CheckCircle className="h-5 w-5 text-chart-4" /> Matched Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {result.matched_skills.map((s, i) => (
                    <motion.div key={s} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.05 }}>
                      <Badge variant="secondary">{s}</Badge>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="glass-card glass-card-hover rounded-2xl p-6">
                <h3 className="mb-3 flex items-center gap-2 font-semibold"><XCircle className="h-5 w-5 text-destructive" /> Missing Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {result.missing_skills.map((s, i) => (
                    <motion.div key={s} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 + i * 0.05 }}>
                      <Badge variant="outline">{s}</Badge>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>

            {result.learning_path?.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card glass-card-hover rounded-2xl p-6">
                <h3 className="mb-3 flex items-center gap-2 font-semibold"><BookOpen className="h-5 w-5 text-accent" /> Learning Path</h3>
                <ol className="space-y-2">
                  {result.learning_path.map((step, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.08 }}
                      className="flex items-start gap-3 text-sm text-muted-foreground"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">{i + 1}</span>
                      {step}
                    </motion.li>
                  ))}
                </ol>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}
