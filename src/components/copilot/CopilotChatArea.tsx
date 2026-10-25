import React, { useRef, useEffect, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Copy,
  Check,
  Loader2,
  ArrowRight,
  ArrowDown,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { toast } from "sonner";
import type { CopilotMessage } from "@/types";

interface CopilotChatAreaProps {
  messages: CopilotMessage[];
  onSendMessage: (content: string) => Promise<boolean>;
  isLoading?: boolean;
  activeConversationId?: string | null;
  errorState?: { message: string; retryContent?: string } | null;
  onRetry?: () => void;
  onClearError?: () => void;
}

const STARTER_PROMPTS = [
  "How do I close my Docker and Redis skill gaps for Senior Full Stack roles?",
  "Review my resume bullets and suggest quantifiable STAR improvements.",
  "What are the top 5 system design concepts I should practice for mock interviews?",
  "Which high-demand technologies should I add to my career roadmap next?",
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
    <div className="prose prose-invert max-w-none text-xs leading-relaxed space-y-2.5 prose-pre:p-0 prose-pre:bg-transparent">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="font-display text-base font-bold text-foreground mt-4 mb-2 pb-1.5 border-b border-border/40">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="font-display text-sm font-bold text-foreground mt-3 mb-1.5 flex items-center gap-1.5">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-display text-xs font-bold text-primary mt-2.5 mb-1">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="leading-relaxed mb-2 last:mb-0 text-foreground/90">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-4 space-y-1 my-2 text-foreground/90">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-4 space-y-1 my-2 text-foreground/90">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/70 bg-primary/5 pl-3 py-1.5 my-2.5 rounded-r-lg italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-border/70 bg-secondary/20 shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-secondary/60 border-b border-border/70 text-muted-foreground font-semibold">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="p-2.5 font-bold text-foreground uppercase text-[10px] tracking-wider">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="p-2.5 border-t border-border/40 text-foreground/90 align-top">
              {children}
            </td>
          ),
          hr: () => <hr className="my-3.5 border-border/50" />,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:text-accent transition-colors font-medium inline-flex items-center gap-0.5"
            >
              <span>{children}</span>
              <ExternalLink className="h-2.5 w-2.5 inline-block opacity-70" />
            </a>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">
              {children}
            </strong>
          ),
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");
            if (match) {
              return (
                <div className="my-2.5 rounded-xl border border-border/70 bg-background/90 overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-3.5 py-1.5 bg-secondary/50 border-b border-border/50 text-[10px] text-muted-foreground font-mono">
                    <span className="font-semibold text-primary">{match[1]}</span>
                    <button
                      onClick={() => handleCopy(codeString)}
                      className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors py-0.5 px-1.5 rounded hover:bg-secondary/70"
                    >
                      {copiedCode === codeString ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" />
                          <span className="text-emerald-400 font-sans">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span className="font-sans">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3.5 overflow-x-auto text-[11px] font-mono leading-relaxed text-foreground/95 bg-secondary/10">
                    <code>{children}</code>
                  </pre>
                </div>
              );
            }
            return (
              <code className="rounded bg-secondary/80 border border-border/40 px-1.5 py-0.5 font-mono text-[11px] text-cyan-300 font-medium" {...props}>
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
  activeConversationId = null,
  errorState = null,
  onRetry,
  onClearError,
}: CopilotChatAreaProps) {
  const [input, setInput] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isNearBottomRef = useRef(true);
  const threadScrollPositions = useRef<Record<string, number>>({});

  // Monitor scroll position
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    const isNear = distanceToBottom < 80;
    isNearBottomRef.current = isNear;
    setShowScrollBottom(!isNear && scrollHeight > clientHeight + 100);

    if (activeConversationId) {
      threadScrollPositions.current[activeConversationId] = scrollTop;
    }
  }, [activeConversationId]);

  // Scroll to latest message
  const scrollToBottom = useCallback((smooth = true) => {
    const container = messagesContainerRef.current;
    if (!container) return;
    if (typeof container.scrollTo === "function") {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    } else {
      container.scrollTop = container.scrollHeight;
    }
    isNearBottomRef.current = true;
    setShowScrollBottom(false);
  }, []);

  // When messages or loading state changes, auto-scroll if near bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    if (isNearBottomRef.current) {
      scrollToBottom(true);
    } else {
      setShowScrollBottom(true);
    }
  }, [messages, isLoading, scrollToBottom]);

  // When active conversation switches, restore saved scroll position or scroll to bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const savedPos = activeConversationId
      ? threadScrollPositions.current[activeConversationId]
      : undefined;

    if (typeof savedPos === "number") {
      if (typeof container.scrollTo === "function") {
        container.scrollTo({ top: savedPos, behavior: "auto" });
      } else {
        container.scrollTop = savedPos;
      }
      const distanceToBottom = container.scrollHeight - savedPos - container.clientHeight;
      const isNear = distanceToBottom < 80;
      isNearBottomRef.current = isNear;
      setShowScrollBottom(!isNear);
    } else {
      scrollToBottom(false);
    }
  }, [activeConversationId, scrollToBottom]);

  // Handle Send
  const handleSend = async (contentToSend?: string) => {
    const text = (contentToSend ?? input).trim();
    if (!text || isLoading) return;

    if (onClearError) onClearError();

    const succeeded = await onSendMessage(text);
    if (succeeded) {
      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const target = e.target;
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 140)}px`;
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    toast.success("Message copied to clipboard");
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  return (
    <div className="glass-card rounded-3xl p-4 sm:p-6 flex flex-col h-full overflow-hidden border border-border/60 shadow-xl">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-border/50 shrink-0">
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

      {/* Message Stream (Independently Scrollable Container) */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0 pr-1.5 space-y-4 relative scroll-smooth focus:outline-none"
        tabIndex={0}
        aria-label="Conversation message stream"
      >
        {messages.length === 0 && (
          <div className="py-10 text-center space-y-4 max-w-md mx-auto">
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
                  onClick={() => void handleSend(prompt)}
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
              key={msg.id || `${msg.role}-${idx}`}
              className={`flex gap-3 ${isAI ? "items-start" : "items-start flex-row-reverse"}`}
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border mt-0.5 ${
                  isAI
                    ? "bg-primary/10 border-primary/25 text-primary"
                    : "bg-cyan-500/10 border-cyan-500/25 text-cyan-400"
                }`}
              >
                {isAI ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
              </div>

              <div
                className={`group relative max-w-[85%] rounded-2xl p-4 transition-all ${
                  isAI
                    ? "bg-secondary/40 border border-border/60 text-foreground shadow-sm"
                    : "bg-gradient-to-r from-primary to-accent text-white"
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-1">
                  <span className={`text-[10px] font-bold block ${isAI ? "text-primary" : "text-white/80"}`}>
                    {isAI ? "Career Copilot" : "You"}
                  </span>

                  {isAI && (
                    <button
                      onClick={() => handleCopyMessage(msg.id || String(idx), msg.content)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground text-[10px] flex items-center gap-1"
                      title="Copy response"
                    >
                      {copiedMessageId === (msg.id || String(idx)) ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {isAI ? (
                  <MessageContent content={msg.content} />
                ) : (
                  <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 items-start animate-in fade-in">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/25 text-primary animate-pulse">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="rounded-2xl p-3.5 bg-secondary/40 border border-border/60 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>Copilot is formulating structured guidance...</span>
            </div>
          </div>
        )}

        {/* Error State with Retry Button */}
        {errorState && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-3.5 text-xs text-destructive flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorState.message}</span>
            </div>
            {onRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="h-7 border-destructive/40 text-xs font-semibold gap-1 text-destructive hover:bg-destructive/20"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Retry</span>
              </Button>
            )}
          </div>
        )}

        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* Floating Scroll to Latest Button */}
      {showScrollBottom && (
        <div className="relative">
          <button
            onClick={() => scrollToBottom(true)}
            className="absolute -top-10 right-4 z-20 flex items-center gap-1.5 rounded-full border border-primary/40 bg-secondary/95 px-3 py-1.5 text-xs font-semibold text-primary shadow-xl backdrop-blur hover:bg-secondary transition-all hover:scale-105"
            aria-label="Scroll to latest message"
          >
            <ArrowDown className="h-3.5 w-3.5 animate-bounce" />
            <span>Scroll to latest</span>
          </button>
        </div>
      )}

      {/* Fixed Bottom Input Area */}
      <div className="pt-3 border-t border-border/50 shrink-0 flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask Copilot anything about your career path, skills, or resume... (Shift+Enter for new line)"
          className="min-h-[44px] max-h-[140px] bg-secondary/30 border-border/80 text-xs rounded-2xl leading-relaxed resize-none py-3 px-3.5 focus-visible:ring-1 focus-visible:ring-primary/60"
          rows={1}
          disabled={isLoading}
        />
        <Button
          onClick={() => void handleSend()}
          disabled={isLoading || !input.trim()}
          variant="gradient"
          className="h-11 w-11 shrink-0 rounded-2xl p-0 shadow-md text-white transition-all hover:scale-105 active:scale-95"
          aria-label="Send Message"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
