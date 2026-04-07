import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, FileText, Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { resumeService } from "@/services/resume";
import { getApiErrorMessage } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function ResumeList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: resumes, isLoading, isError, refetch } = useQuery({
    queryKey: ["resumes"],
    queryFn: resumeService.listResumes,
  });

  const deleteMutation = useMutation({
    mutationFn: resumeService.deleteResume,
    onSuccess: () => {
      toast.success("Resume deleted");
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-summary"] });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });

  const sortedResumes = useMemo(
    () => [...(resumes ?? [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [resumes],
  );

  if (isLoading) {
    return (
      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="glass-card rounded-xl p-6">
        <p className="text-sm text-muted-foreground">Unable to load resumes.</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!sortedResumes.length) {
    return (
      <div className="glass-card rounded-xl p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <FileText className="h-6 w-6 text-primary" aria-hidden="true" />
        </div>
        <h3 className="mt-4 font-display text-xl font-semibold">No resumes uploaded yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">Upload a resume to start tracking your analysis and feedback.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {sortedResumes.map((resume, index) => {
        const isDeleting = deleteMutation.isPending && deleteMutation.variables === resume.id;
        return (
          <motion.div
            key={resume.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="glass-card glass-card-hover rounded-xl p-5 shadow-[0_12px_40px_-24px_rgba(0,0,0,0.65)]"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <p className="font-display text-lg font-semibold text-foreground">{resume.file_name}</p>
                  {index === 0 ? <Badge className="bg-gradient-to-r from-primary to-accent text-primary-foreground">Latest</Badge> : null}
                </div>
                <p className="text-sm text-muted-foreground">ID: {resume.id}</p>
                <p className="text-sm text-muted-foreground">Uploaded: {formatDate(resume.created_at)}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button variant="outline" className="rounded-xl" onClick={() => navigate(`/resume/${resume.id}`)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </Button>
                <Button variant="gradient" className="rounded-xl" onClick={() => navigate(`/resume/${resume.id}`)}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analyze
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
                  disabled={isDeleting}
                  onClick={() => deleteMutation.mutate(resume.id)}
                >
                  {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Delete
                </Button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
