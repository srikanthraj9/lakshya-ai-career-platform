import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Check, Code2, Copy, Download, Eye, Loader2, Sparkles, Wand2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getApiErrorMessage } from "@/services/api";
import { resumeRewriteService } from "@/services/resumeRewrite";
import type { ResumeRewriteResponse } from "@/types";

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadBlobFile(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function sectionTitle(title: string) {
  return title.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

export default function ResumeRewritePage() {
  const location = useLocation();
  const [original, setOriginal] = useState("");
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<ResumeRewriteResponse | null>(null);
  const roleContext = location.state?.roleContext as
    | {
        roleName?: string;
        description?: string;
        missingSkills?: string[];
        recommendation?: string;
        resumeId?: string;
        resumeFileName?: string;
        resumeText?: string;
      }
    | undefined;

  const roleJobDescription = useMemo(() => {
    if (!roleContext) {
      return undefined;
    }
    return [
      roleContext.roleName ? `Target role: ${roleContext.roleName}` : "",
      roleContext.description ? `Role description: ${roleContext.description}` : "",
      roleContext.missingSkills?.length ? `Focus skills: ${roleContext.missingSkills.join(", ")}` : "",
      roleContext.recommendation ? `Recommendation: ${roleContext.recommendation}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }, [roleContext]);

  useEffect(() => {
    if (!original.trim() && roleContext?.resumeText) {
      setOriginal(roleContext.resumeText);
    }
  }, [original, roleContext?.resumeText]);

  const mutation = useMutation({
    mutationFn: () => resumeRewriteService.rewrite(original, roleJobDescription),
    onSuccess: (data) => {
      setResult(data);
      toast.success("Resume generated successfully");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const contactItems = useMemo(() => {
    if (!result) {
      return [];
    }
    return [
      result.structured.phone,
      result.structured.email,
      result.structured.linkedin,
      result.structured.github,
      result.structured.portfolio,
    ].filter(Boolean);
  }, [result]);

  const handleCopyLatex = useCallback(() => {
    if (!result?.latex) return;
    navigator.clipboard.writeText(result.latex);
    setCopied(true);
    toast.success("LaTeX copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  const handleDownloadTex = useCallback(() => {
    if (!result) return;
    downloadTextFile("ai_resume.tex", result.latex, "application/x-tex");
  }, [result]);

  const handleDownloadPdf = useCallback(async () => {
    if (!result?.pdf_url) return;
    try {
      const blob = await resumeRewriteService.downloadPdf(result.pdf_url);
      downloadBlobFile("ai_resume.pdf", blob);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }, [result]);

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">AI Resume Rewriter</h1>
          <p className="text-muted-foreground">Convert raw resume text into structured content, LaTeX, and a downloadable PDF.</p>
        </div>

        {roleContext ? (
          <div className="glass-card rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="font-medium text-foreground">Resume improvement target</p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {roleContext.roleName ? `Optimizing for ${roleContext.roleName}` : "Optimizing for selected role insights"}
              {roleContext.resumeFileName ? ` using ${roleContext.resumeFileName}` : ""}.
            </p>
            {roleContext.missingSkills?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {roleContext.missingSkills.map((skill) => (
                  <Badge key={skill} variant="outline">
                    {skill}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <h3 className="font-display text-lg font-semibold text-foreground">Raw Resume Input</h3>
            <Textarea
              value={original}
              onChange={(e) => setOriginal(e.target.value)}
              placeholder="Paste your raw resume text here..."
              className="min-h-[420px] rounded-2xl bg-secondary/30 font-mono text-sm"
              aria-label="Raw resume text"
            />
            <Button
              variant="gradient"
              className="w-full rounded-xl"
              onClick={() => mutation.mutate()}
              disabled={!original.trim() || mutation.isPending}
              aria-label="Rewrite resume with AI"
            >
              {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Rewrite with AI
            </Button>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-display text-lg font-semibold text-foreground">Generated Output</h3>
              {result ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={handleDownloadPdf}>
                    <Download className="mr-1 h-4 w-4" />
                    Download PDF
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={handleDownloadTex}>
                    <Download className="mr-1 h-4 w-4" />
                    Download LaTeX
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={handleCopyLatex}>
                    {copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
                    {copied ? "Copied" : "Copy LaTeX"}
                  </Button>
                </div>
              ) : null}
            </div>

            {mutation.isPending ? (
              <Skeleton className="min-h-[420px] w-full rounded-2xl" />
            ) : result ? (
              <Tabs defaultValue="preview" className="glass-card glass-card-hover rounded-2xl p-4">
                <TabsList className="grid w-full grid-cols-2 rounded-xl">
                  <TabsTrigger value="preview" className="rounded-lg">
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </TabsTrigger>
                  <TabsTrigger value="latex" className="rounded-lg">
                    <Code2 className="mr-2 h-4 w-4" />
                    LaTeX Code
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="space-y-5 rounded-xl p-2">
                  <div className="rounded-xl border border-border/60 bg-background/40 p-5">
                    <h2 className="font-display text-2xl font-bold">{result.structured.name || "Candidate"}</h2>
                    {contactItems.length > 0 ? <p className="mt-2 text-sm text-muted-foreground">{contactItems.join(" | ")}</p> : null}
                  </div>

                  {result.structured.summary ? (
                    <div className="rounded-xl border border-border/60 bg-background/40 p-5">
                      <h3 className="font-display text-lg font-semibold">Summary</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{result.structured.summary}</p>
                    </div>
                  ) : null}

                  {result.structured.education.length > 0 ? (
                    <div className="rounded-xl border border-border/60 bg-background/40 p-5">
                      <h3 className="font-display text-lg font-semibold">Education</h3>
                      <div className="mt-3 space-y-3">
                        {result.structured.education.map((entry, index) => (
                          <div key={`${entry.college}-${index}`}>
                            <p className="font-medium">{entry.college}</p>
                            <p className="text-sm text-muted-foreground">
                              {[entry.degree, entry.year, entry.cgpa ? `CGPA: ${entry.cgpa}` : ""].filter(Boolean).join(" | ")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {result.structured.experience.length > 0 ? (
                    <div className="rounded-xl border border-border/60 bg-background/40 p-5">
                      <h3 className="font-display text-lg font-semibold">Experience</h3>
                      <div className="mt-3 space-y-4">
                        {result.structured.experience.map((entry, index) => (
                          <div key={`${entry.role}-${index}`}>
                            <p className="font-medium">{[entry.role, entry.company].filter(Boolean).join(" | ")}</p>
                            {entry.duration ? <p className="text-sm text-muted-foreground">{entry.duration}</p> : null}
                            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                              {entry.points.map((point, pointIndex) => (
                                <li key={`${entry.role}-${pointIndex}`} className="flex gap-2">
                                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {result.structured.projects.length > 0 ? (
                    <div className="rounded-xl border border-border/60 bg-background/40 p-5">
                      <h3 className="font-display text-lg font-semibold">Projects</h3>
                      <div className="mt-3 space-y-4">
                        {result.structured.projects.map((entry, index) => (
                          <div key={`${entry.title}-${index}`}>
                            <p className="font-medium">{entry.title}</p>
                            {entry.duration ? <p className="text-sm text-muted-foreground">{entry.duration}</p> : null}
                            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                              {entry.points.map((point, pointIndex) => (
                                <li key={`${entry.title}-${pointIndex}`} className="flex gap-2">
                                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {Object.values(result.structured.skills).some((values) => values.length > 0) ? (
                    <div className="rounded-xl border border-border/60 bg-background/40 p-5">
                      <h3 className="font-display text-lg font-semibold">Skills</h3>
                      <div className="mt-3 flex flex-wrap gap-3">
                        {Object.entries(result.structured.skills).map(([key, values]) =>
                          values.length > 0 ? (
                            <div key={key} className="min-w-[180px]">
                              <p className="mb-2 text-sm font-medium text-foreground">{sectionTitle(key)}</p>
                              <div className="flex flex-wrap gap-2">
                                {values.map((value) => (
                                  <Badge key={`${key}-${value}`} variant="secondary">
                                    {value}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ) : null,
                        )}
                      </div>
                    </div>
                  ) : null}

                  {result.structured.certifications.length > 0 ? (
                    <div className="rounded-xl border border-border/60 bg-background/40 p-5">
                      <h3 className="font-display text-lg font-semibold">Certifications</h3>
                      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                        {result.structured.certifications.map((certification) => (
                          <li key={certification} className="flex gap-2">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-chart-4" />
                            <span>{certification}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </TabsContent>

                <TabsContent value="latex">
                  <div className="rounded-xl border border-border/60 bg-background/40 p-5">
                    <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap font-mono text-xs text-foreground">{result.latex}</pre>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-border">
                <div className="text-center">
                  <Wand2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">Generated preview and LaTeX will appear here</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
