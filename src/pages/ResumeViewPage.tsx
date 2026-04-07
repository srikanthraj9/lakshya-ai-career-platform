import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertTriangle, Award, CheckCircle } from "lucide-react";

import { AnimatedCounter } from "@/components/AnimatedCounter";
import { ErrorFallback } from "@/components/ErrorFallback";
import { PageTransition } from "@/components/PageTransition";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { resumeService } from "@/services/resume";

export default function ResumeViewPage() {
  const { id } = useParams<{ id: string }>();

  const { data: resume, isLoading, isError, refetch } = useQuery({
    queryKey: ["resume", id],
    queryFn: () => resumeService.getResume(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading resume">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorFallback
        title="Resume Load Failed"
        message="We couldn't load this resume analysis."
        onRetry={() => refetch()}
      />
    );
  }

  if (!resume) {
    return null;
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Resume Analysis</h1>
          <p className="text-muted-foreground">{resume.file_name}</p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card glass-card-hover flex items-center gap-6 rounded-2xl p-8"
        >
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card glass-card-hover rounded-2xl p-6"
        >
          <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
            <Award className="h-5 w-5 text-primary" aria-hidden="true" />
            Score Breakdown
          </h3>
          <div className="space-y-3">
            {Object.entries(resume.breakdown).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <span className="text-sm capitalize text-muted-foreground">{key.replace(/_/g, " ")}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-36 overflow-hidden rounded-full bg-secondary">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                      initial={{ width: 0 }}
                      animate={{ width: `${value}%` }}
                      transition={{ duration: 0.7 }}
                    />
                  </div>
                  <span className="w-12 text-right text-sm font-medium text-foreground">{value}%</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card glass-card-hover rounded-2xl p-6"
        >
          <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
            <CheckCircle className="h-5 w-5 text-chart-4" aria-hidden="true" />
            Skills
          </h3>
          <div className="flex flex-wrap gap-2">
            {resume.skills.map((skill) => (
              <Badge key={skill} variant="secondary">
                {skill}
              </Badge>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card glass-card-hover rounded-2xl p-6"
        >
          <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
            <AlertTriangle className="h-5 w-5 text-chart-5" aria-hidden="true" />
            Feedback
          </h3>

          <div className="space-y-5">
            {resume.feedback.missing_skills.length > 0 ? (
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Missing Skills</p>
                <div className="flex flex-wrap gap-2">
                  {resume.feedback.missing_skills.map((skill) => (
                    <Badge key={skill} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            {resume.feedback.summary.length > 0 ? (
              <>
                <Separator />
                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">Summary</p>
                  <ul className="space-y-2">
                    {resume.feedback.summary.map((item, index) => (
                      <li key={`summary-${index}`} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-chart-5" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : null}

            {resume.feedback.weak_points.length > 0 ? (
              <>
                <Separator />
                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">Weak Points</p>
                  <ul className="space-y-2">
                    {resume.feedback.weak_points.map((item, index) => (
                      <li key={`weak-${index}`} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-chart-5" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : null}

            {resume.feedback.formatting.length > 0 ? (
              <>
                <Separator />
                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">Formatting</p>
                  <ul className="space-y-2">
                    {resume.feedback.formatting.map((item, index) => (
                      <li key={`format-${index}`} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-chart-5" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : null}
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
