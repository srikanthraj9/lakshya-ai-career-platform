import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, FileText } from "lucide-react";
import { toast } from "sonner";

import { resumeService } from "@/services/resume";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function ResumeReferenceList() {
  const { data: resumes, isLoading } = useQuery({
    queryKey: ["resumes"],
    queryFn: resumeService.listResumes,
  });

  const sortedResumes = useMemo(
    () => [...(resumes ?? [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [resumes],
  );

  const handleCopy = async (resumeId: string) => {
    await navigator.clipboard.writeText(resumeId);
    toast.success("Resume ID copied");
  };

  return (
    <section className="glass-card rounded-xl border border-border/60 p-4 shadow-[0_10px_30px_-24px_rgba(0,0,0,0.7)]">
      <div className="mb-4">
        <h2 className="font-display text-lg font-semibold">Your Previous Resumes</h2>
        <p className="text-sm text-muted-foreground">Copy a resume ID for later reference.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-md" />
          ))}
        </div>
      ) : sortedResumes.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/70 px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">No previous resumes</p>
        </div>
      ) : (
        <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
          {sortedResumes.map((resume, index) => (
            <div
              key={resume.id}
              className="rounded-md border border-border/60 bg-background/30 px-3 py-3 transition-transform duration-200 hover:scale-[1.01]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <p className="truncate text-sm font-medium text-foreground">{resume.file_name}</p>
                    {index === 0 ? <Badge className="h-5 rounded-md bg-gradient-to-r from-primary to-accent px-2 text-[10px] text-primary-foreground">Latest</Badge> : null}
                  </div>
                  <p className="mt-2 break-all font-mono text-xs text-muted-foreground">ID: {resume.id}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Uploaded: {formatDate(resume.created_at)}</p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 rounded-md"
                  onClick={() => void handleCopy(resume.id)}
                  aria-label={`Copy resume ID for ${resume.file_name}`}
                >
                  <Copy className="mr-1 h-3.5 w-3.5" />
                  Copy ID
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
