import React, { useRef, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Bot, User, Sparkles, Copy, Check, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { toast } from "sonner";
import type { CopilotMessage } from "@/types";

interface CopilotChatAreaProps {
  messages: CopilotMessage[];
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
}

const STARTER_PROMPTS = [
  "How do I close my Docker and Redis skill gaps for Senior Full Stack roles?",
  "Review my resume experience bullets and suggest quantifiable STAR improvements.",
  "What are the top 5 system design concepts I should practice for mock interviews?",
  "Which high-demand technologies should I add to my roadmap next?",
];

function MessageContent({ content }: { content: string }) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="prose prose-invert max-w-none text-xs leading-relaxed space-y-2 prose-pre:p-0 prose-pre:bg-transparent">
      <ReactMarkdown
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");
            if (match) {
              return (
                <div className="my-2 rounded-xl border border-border/70 bg-background/80 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-secondary/50 border-b border-border/50 text-[10px] text-muted-foreground font-mono">
                    <span>{match[1]}</span>
                    <button
                      onClick={() => handleCopy(codeString)}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      {copiedCode === codeString ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      <span>{copiedCode === codeString ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <pre className="p-3 overflow-x-auto text-[11px] font-mono leading-relaxed text-foreground">
                    <code>{children}</code>
                  </pre>
                </div>
              );
            }
            return (
              <code className="rounded bg-secondary/60 px-1 py-0.5 font-mono text-[11px] text-primary" {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function CopilotChatArea({
  messages,
  onSendMessage,
  isLoading = false,
}: CopilotChatAreaProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="glass-card rounded-3xl p-4 sm:p-6 flex flex-col h-full min-h-[600px] justify-between space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-primary to-accent text-white shadow-md shadow-primary/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold text-foreground">Lakshya Career Copilot</h3>
            <p className="text-[11px] text-muted-foreground">Strategic Career Advisor & Technical Mentor</p>
          </div>
        </div>

        <StatusBadge variant="ai" dot>
          Deep Context Active
        </StatusBadge>
      </div>

      {/* Message Stream */}
      <ScrollArea className="flex-1 pr-3 max-h-[480px]">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="py-8 text-center space-y-4 max-w-md mx-auto">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 mx-auto">
                <Bot className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display text-base font-bold text-foreground">
                  How can I help you grow today?
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  I have full context on your resume, target role, skill roadmap, and recent mock interview evaluations.
                </p>
              </div>

              {/* Starter Prompt Chips */}
              <div className="grid gap-2 pt-2 text-left">
                {STARTER_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => onSendMessage(prompt)}
                    className="flex items-center justify-between rounded-xl border border-border/70 bg-secondary/30 p-2.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-secondary/60 transition-all text-left group"
                  >
                    <span>{prompt}</span>
                    <ArrowRight className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 shrink-0 ml-2 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => {
            const isAI = msg.role === "assistant" || msg.role === "system";
            return (
              <div
                key={idx}
                className={`flex gap-3 ${isAI ? "items-start" : "items-start flex-row-reverse"}`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border ${
                    isAI
                      ? "bg-primary/10 border-primary/25 text-primary"
                      : "bg-cyan-500/10 border-cyan-500/25 text-cyan-400"
                  }`}
                >
                  {isAI ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl p-4 ${
                    isAI
                      ? "bg-secondary/40 border border-border/60 text-foreground shadow-sm"
                      : "bg-gradient-to-r from-primary to-accent text-white"
                  }`}
                >
                  <span className={`text-[10px] font-bold block mb-1 ${isAI ? "text-primary" : "text-white/80"}`}>
                    {isAI ? "Career Copilot" : "You"}
                  </span>
                  <MessageContent content={msg.content} />
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 items-start">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/25 text-primary animate-pulse">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="rounded-2xl p-3.5 bg-secondary/40 border border-border/60 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span>Copilot is analyzing and formulating guidance...</span>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="pt-2 border-t border-border/50 flex gap-2 items-end">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Copilot anything about your career path, skills, or resume..."
          className="min-h-[48px] max-h-[120px] bg-secondary/30 border-border/80 text-xs rounded-2xl leading-relaxed resize-none py-3"
          rows={1}
        />
        <Button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          variant="gradient"
          className="h-11 w-11 shrink-0 rounded-2xl p-0 shadow-md"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
