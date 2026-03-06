import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { resumeService } from "@/services/resume";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Award, AlertTriangle, CheckCircle } from "lucide-react";

export default function ResumeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: resume, isLoading, error } = useQuery({
    queryKey: ["resume", id],
    queryFn: () => resumeService.getResume(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;
  if (error) return <p className="text-destructive">Failed to load resume analysis.</p>;
  if (!resume) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Resume Analysis</h1>
        <p className="text-muted-foreground">{resume.filename}</p>
      </div>

      {/* ATS Score */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card flex items-center gap-6 rounded-2xl p-8">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
          <span className="font-display text-4xl font-bold text-primary">{resume.ats_score}</span>
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold">ATS Score</h2>
          <p className="text-muted-foreground">Overall compatibility score</p>
        </div>
      </motion.div>

      {/* Score Breakdown */}
      {resume.score_breakdown && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="mb-4 font-display text-lg font-semibold flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" /> Score Breakdown
          </h3>
          <div className="space-y-3">
            {Object.entries(resume.score_breakdown).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm capitalize text-muted-foreground">{key.replace(/_/g, " ")}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-32 rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
                  </div>
                  <span className="text-sm font-medium text-foreground">{value}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {resume.skills?.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="mb-4 font-display text-lg font-semibold flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-chart-4" /> Detected Skills
          </h3>
          <div className="flex flex-wrap gap-2">
            {resume.skills.map((skill) => (
              <Badge key={skill} variant="secondary">{skill}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Issues */}
      {resume.issues?.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="mb-4 font-display text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-chart-5" /> Issues Found
          </h3>
          <ul className="space-y-2">
            {resume.issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-chart-5" />
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
