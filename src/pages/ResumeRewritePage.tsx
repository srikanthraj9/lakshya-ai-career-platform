import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { resumeRewriteService } from "@/services/resumeRewrite";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Wand2, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageTransition } from "@/components/PageTransition";

export default function ResumeRewritePage() {
  const [original, setOriginal] = useState("");
  const [rewritten, setRewritten] = useState("");
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: () => resumeRewriteService.rewrite(original),
    onSuccess: (data) => { setRewritten(data.rewritten_resume); toast.success("Resume rewritten!"); },
    onError: () => toast.error("Failed to rewrite resume."),
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(rewritten);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">AI Resume Rewriter</h1>
          <p className="text-muted-foreground">Paste your resume and get an AI-enhanced version.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <h3 className="font-display text-lg font-semibold text-foreground">Original Resume</h3>
            <Textarea value={original} onChange={(e) => setOriginal(e.target.value)} placeholder="Paste your resume text here..." className="min-h-[400px] bg-secondary/30 font-mono text-sm" />
            <Button variant="gradient" className="w-full" onClick={() => mutation.mutate()} disabled={!original.trim() || mutation.isPending}>
              {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Rewrite with AI
            </Button>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-foreground">AI-Enhanced Version</h3>
              {rewritten && (
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              )}
            </div>
            {mutation.isPending ? (
              <Skeleton className="min-h-[400px] w-full rounded-xl" />
            ) : rewritten ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card glass-card-hover min-h-[400px] rounded-xl p-6">
                <pre className="whitespace-pre-wrap font-mono text-sm text-foreground">{rewritten}</pre>
              </motion.div>
            ) : (
              <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-dashed border-border">
                <div className="text-center">
                  <Wand2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">AI-enhanced resume will appear here</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
