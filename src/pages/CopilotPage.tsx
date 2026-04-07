import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  ExternalLink,
  FileText,
  Loader2,
  MessageSquareMore,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { PageTransition } from "@/components/PageTransition";
import { EmptyState } from "@/components/EmptyState";
import { ErrorFallback } from "@/components/ErrorFallback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/services/api";
import { copilotService } from "@/services/copilot";
import { resumeService } from "@/services/resume";
import type { CopilotMessage, CopilotResource, CopilotSection, ResumeListItem } from "@/types";

const defaultPrompts = [
  "Hi, what direction looks strongest for me right now?",
  "How should I improve my resume for backend roles?",
  "What project should I build next?",
  "What skill gap should I close first?",
];

function normalizeText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return "";
  }
  return trimmed;
}

function normalizeList(value: unknown): string[] {
  if (typeof value === "string") {
    const normalized = normalizeText(value);
    return normalized ? [normalized] : [];
  }
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (typeof item === "string") {
      const normalized = normalizeText(item);
      return normalized ? [normalized] : [];
    }
    if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;
      const candidate = ["title", "text", "body", "reason", "description", "action"]
        .map((key) => normalizeText(record[key]))
        .find(Boolean);
      return candidate ? [candidate] : [];
    }
    return [];
  });
}

function normalizeSections(value: unknown): Record<string, CopilotSection> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>).flatMap(([key, raw]) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return [];
    }
    const section = raw as Record<string, unknown>;
    const title = normalizeText(section.title) || key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
    const body = normalizeText(section.body);
    const items = normalizeList(section.items);
    if (!title || (!body && !items.length)) {
      return [];
    }
    return [[key, { title, body, items }] as const];
  });

  return Object.fromEntries(entries);
}

function normalizeResources(value: unknown): CopilotResource[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const resource = item as Record<string, unknown>;
    const title = normalizeText(resource.title);
    if (!title) {
      return [];
    }
    return [{
      title,
      url: normalizeText(resource.url),
      reason: normalizeText(resource.reason),
    }];
  });
}

function ParagraphReply({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph, index) => (
        <p key={`${paragraph}-${index}`} className="text-sm leading-6 text-foreground">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

function SectionCard({ section }: { section: CopilotSection }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-background/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">{section.title}</p>
      {section.body && <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.body}</p>}
      {!!section.items.length && (
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {section.items.map((item, index) => (
            <li key={`${item}-${index}`} className="flex gap-2">
              <span className="text-primary">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CopilotPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    data: resumes,
    isLoading: resumesLoading,
    isError: resumesError,
    refetch: refetchResumes,
  } = useQuery({
    queryKey: ["copilot-resume-selector"],
    queryFn: resumeService.listResumeSelector,
    retry: 2,
  });

  const selectedResume = useMemo(
    () => (resumes ?? []).find((resume) => resume.id === selectedResumeId),
    [resumes, selectedResumeId],
  );

  const suggestedPrompts = useMemo(() => {
    const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant");
    return latestAssistant?.suggestions?.length ? latestAssistant.suggestions : defaultPrompts;
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!selectedResumeId && resumes && resumes.length > 0) {
      setSelectedResumeId(resumes[0].id);
    }
  }, [resumes, selectedResumeId]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading || !selectedResumeId) {
      return;
    }

    const normalizedMessage = text.trim();
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: normalizedMessage, timestamp: new Date() },
    ]);
    setInput("");
    setLoading(true);

    try {
      const response = await copilotService.chat({
        resumeId: selectedResumeId,
        userId: user?.id,
        message: normalizedMessage,
        contextProfile: {
          resume_name: selectedResume?.file_name,
          notes: messages.length === 0 ? "First turn for this session." : "Follow-up question in ongoing conversation.",
        },
      });

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: normalizeText(response.reply),
          timestamp: new Date(),
          intent: normalizeText(response.intent),
          sections: normalizeSections(response.optional_sections),
          resources: normalizeResources(response.resources),
          suggestions: normalizeList(response.suggestions),
          memory_turns: response.memory_turns,
        },
      ]);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [loading, messages.length, selectedResume?.file_name, selectedResumeId, user?.id]);

  const handleSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    sendMessage(input);
  }, [input, sendMessage]);

  return (
    <PageTransition>
      <div className="flex h-[calc(100vh-4rem)] flex-col">
        <div className="mb-4">
          <h1 className="font-display text-3xl font-bold">AI Career Copilot</h1>
          <p className="text-muted-foreground">Conversational career coaching grounded in your resume and role intelligence.</p>
        </div>

        <div className="mb-4 rounded-2xl border border-white/10 bg-secondary/20 p-4">
          <div className="space-y-2">
            <Label htmlFor="copilot-resume-selector" className="inline-flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Choose Resume Context
            </Label>
            <Select value={selectedResumeId} onValueChange={setSelectedResumeId} disabled={resumesLoading || !resumes?.length}>
              <SelectTrigger id="copilot-resume-selector" className="rounded-xl bg-secondary/40">
                <SelectValue placeholder={resumesLoading ? "Loading resumes..." : "Select a resume"} />
              </SelectTrigger>
              <SelectContent>
                {(resumes ?? []).map((resume: ResumeListItem) => (
                  <SelectItem key={resume.id} value={resume.id}>
                    {resume.file_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {resumesError && (
          <ErrorFallback
            title="Resume Context Unavailable"
            message="The Copilot could not load your resumes. Retry and select a resume before chatting."
            onRetry={() => refetchResumes()}
          />
        )}

        {!resumesLoading && !resumesError && !resumes?.length && (
          <EmptyState
            icon={FileText}
            title="Upload a Resume First"
            description="The Copilot needs a real resume context before it can give personalized advice."
            actionLabel="Upload Resume"
            actionHref="/resume/upload"
          />
        )}

        <div className="flex-1 overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(39,196,255,0.12),transparent_42%),linear-gradient(180deg,rgba(16,19,30,0.98),rgba(10,12,20,0.96))] shadow-[0_24px_80px_-40px_rgba(0,0,0,0.9)]">
          <ScrollArea className="h-full p-5">
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex h-full flex-col items-center justify-center gap-6 py-16"
              >
                <div className="rounded-full bg-primary/10 p-4">
                  <Sparkles className="h-10 w-10 text-primary" aria-hidden="true" />
                </div>
                <p className="max-w-2xl text-center text-lg text-muted-foreground">
                  Ask a specific follow-up and the Copilot will answer like a mentor, not a static report.
                </p>
                <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Suggested prompts">
                  {suggestedPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => sendMessage(prompt)}
                      disabled={!selectedResumeId || loading}
                      className="rounded-full border border-border bg-secondary/50 px-4 py-2 text-sm text-foreground transition hover:border-primary/30 hover:bg-primary/10 disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            <AnimatePresence>
              {messages.map((message) => {
                const sectionEntries = Object.values(message.sections ?? {});
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`mb-5 flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {message.role === "assistant" && (
                      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}

                    <div className={`max-w-[78%] space-y-3 rounded-[24px] px-4 py-4 ${message.role === "user" ? "bg-primary text-primary-foreground" : "border border-white/10 bg-secondary/55 text-foreground"}`}>
                      {message.role === "assistant" ? (
                        <>
                          {message.intent && (
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                                {message.intent.replace(/_/g, " ")}
                              </Badge>
                              {typeof message.memory_turns === "number" && message.memory_turns > 0 && (
                                <Badge variant="secondary" className="bg-white/10 text-muted-foreground">
                                  {message.memory_turns} turn memory
                                </Badge>
                              )}
                            </div>
                          )}

                          <ParagraphReply text={message.content} />

                          {!!sectionEntries.length && (
                            <div className="grid gap-3 md:grid-cols-2">
                              {sectionEntries.map((section) => (
                                <SectionCard key={section.title} section={section} />
                              ))}
                            </div>
                          )}

                          {!!message.resources?.length && (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">Resources</p>
                              <div className="space-y-2">
                                {message.resources.map((resource) => (
                                  <div key={`${resource.title}-${resource.url}`} className="rounded-2xl border border-white/10 bg-background/30 p-4">
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="space-y-1">
                                        <p className="text-sm font-medium text-foreground">{resource.title}</p>
                                        {resource.reason && <p className="text-xs text-muted-foreground">{resource.reason}</p>}
                                      </div>
                                      {resource.url && (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="shrink-0"
                                          onClick={() => window.open(resource.url, "_blank", "noopener,noreferrer")}
                                        >
                                          <ExternalLink className="mr-1 h-3 w-3" />
                                          Open
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {!!message.suggestions?.length && (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">Follow-Up</p>
                              <div className="flex flex-wrap gap-2">
                                {message.suggestions.map((suggestion) => (
                                  <button
                                    key={suggestion}
                                    type="button"
                                    onClick={() => sendMessage(suggestion)}
                                    className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs text-foreground transition hover:bg-primary/15"
                                  >
                                    {suggestion}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm leading-6">{message.content}</p>
                      )}
                    </div>

                    {message.role === "user" && (
                      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/20">
                        <User className="h-4 w-4 text-accent" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 flex gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="rounded-[20px] border border-white/10 bg-secondary/55 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Thinking through your profile and last few turns...
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={scrollRef} />
          </ScrollArea>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-secondary/15 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <MessageSquareMore className="h-4 w-4" />
            Conversational Copilot
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={selectedResumeId ? "Ask a follow-up about skills, resume, projects, or roles..." : "Select a resume to start chatting"}
              className="flex-1 bg-secondary/30"
              disabled={loading || !selectedResumeId}
              aria-label="Type your message"
            />
            <Button type="submit" variant="gradient" disabled={loading || !input.trim() || !selectedResumeId} aria-label="Send message">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </div>
    </PageTransition>
  );
}
