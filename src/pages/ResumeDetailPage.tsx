import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { resumeService } from "@/services/resume";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Award, AlertTriangle, CheckCircle } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { AnimatedCounter } from "@/components/AnimatedCounter";

export default function ResumeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: resume, isLoading, error } = useQuery({
    queryKey: ["resume", id],
    queryFn: () => resumeService.getResume(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>;
  if (error) return <p className="text-destructive">Failed to load resume analysis.</p>;
  if (!resume) return null;

  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Resume Analysis</h1>
          <p className="text-muted-foreground">{resume.filename}</p>
        </div>

        {/* ATS Score */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card glass-card-hover flex items-center gap-6 rounded-2xl p-8">
          <motion.div
            className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            <span className="font-display text-4xl font-bold text-primary">
              <AnimatedCounter value={resume.ats_score} />
            </span>
          </motion.div>
          <div>
            <h2 className="font-display text-xl font-semibold">ATS Score</h2>
            <p className="text-muted-foreground">Overall compatibility score</p>
          </div>
        </motion.div>

        {/* Score Breakdown */}
        {resume.score_breakdown && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card glass-card-hover rounded-2xl p-6">
            <h3 className="mb-4 font-display text-lg font-semibold flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" /> Score Breakdown
            </h3>
            <div className="space-y-3">
              {Object.entries(resume.score_breakdown).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm capitalize text-muted-foreground">{key.replace(/_/g, " ")}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                        initial={{ width: 0 }}
                        animate={{ width: `${value}%` }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                      />
                    </div>
                    <span className="text-sm font-medium text-foreground">{value}%</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Skills */}
        {resume.skills?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card glass-card-hover rounded-2xl p-6">
            <h3 className="mb-4 font-display text-lg font-semibold flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-chart-4" /> Detected Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {resume.skills.map((skill, i) => (
                <motion.div key={skill} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 + i * 0.03 }}>
                  <Badge variant="secondary">{skill}</Badge>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Issues */}
        {resume.issues?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card glass-card-hover rounded-2xl p-6">
            <h3 className="mb-4 font-display text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-chart-5" /> Issues Found
            </h3>
            <ul className="space-y-2">
              {resume.issues.map((issue, i) => (
                <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.05 }} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-chart-5" />
                  {issue}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}
