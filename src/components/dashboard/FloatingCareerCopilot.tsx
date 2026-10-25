import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Bot,
  X,
  Send,
  Sparkles,
  Maximize2,
  Loader2,
  CornerDownLeft,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { copilotService } from "@/services/copilot";
import { useAuth } from "@/context/AuthContext";
import { useCareerReadiness } from "@/hooks/useCareerReadiness";
import type { CopilotChatMessage } from "@/types";
import { cn } from "@/lib/utils";

interface FloatingCareerCopilotProps {
  className?: string;
}

export function FloatingCareerCopilot({ className }: FloatingCareerCopilotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<CopilotChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello! I am your Lakshya AI Career Copilot. Ask me anything about your ATS score, skill roadmap, or interview strategies.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuth();
  const { targetRole, breakdown } = useCareerReadiness();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend ?? input).trim();
    if (!text || isLoading) return;

    const userMessage: CopilotChatMessage = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await copilotService.sendMessage(
        updatedMessages,
        conversationId
      );

      if (response.conversation_id) {
        setConversationId(response.conversation_id);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.reply,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I encountered a temporary connection issue. Your career metrics are safe; please try asking again or open the full Career Copilot studio.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts = [
    `How can I improve for ${targetRole.title}?`,
    "What are my highest priority skill gaps?",
    "Give me 3 behavioral interview tips",
  ];

  return (
    <div
      className={cn(
        "fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40 select-none",
        className
      )}
    >
      {/* Floating Chat Modal / Drawer */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Lakshya AI Career Copilot Chat"
          className="mb-3 w-[calc(100vw-2rem)] sm:w-96 max-h-[540px] h-[500px] flex flex-col rounded-3xl border border-primary/30 bg-card/95 shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-5 duration-200 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 bg-secondary/40 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-accent text-white shadow-md shadow-primary/25">
                <Bot className="h-4 w-4" />
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-display text-xs font-bold text-foreground">
                    Career Copilot
                  </h4>
                  <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-400">
                    Live
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate max-w-[170px]">
                  {targetRole.title} ({breakdown.overallScore}% Ready)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Link
                to="/copilot"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                title="Expand to Full Studio"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Link>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                aria-label="Close Assistant"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex gap-2 max-w-[88%]",
                  msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                    msg.role === "user"
                      ? "bg-primary text-white"
                      : "bg-secondary border border-border/80 text-primary"
                  )}
                >
                  {msg.role === "user" ? (
                    <UserIcon className="h-3 w-3" />
                  ) : (
                    <Bot className="h-3 w-3" />
                  )}
                </div>

                <div
                  className={cn(
                    "rounded-2xl px-3.5 py-2.5 leading-relaxed text-xs shadow-sm",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-secondary/70 border border-border/60 text-foreground rounded-tl-none"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span>Copilot is formulating advice...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Bar (when fewer than 3 user messages) */}
          {messages.length <= 4 && (
            <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt)}
                  disabled={isLoading}
                  className="shrink-0 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary hover:bg-primary/20 transition-all text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Message Input Footer */}
          <div className="border-t border-border/60 bg-background/80 p-3">
            <div className="flex items-center gap-2 rounded-2xl border border-border/80 bg-secondary/40 px-3 py-1.5 focus-within:border-primary/50 transition-all">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Career Copilot..."
                disabled={isLoading}
                className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="h-7 w-7 p-0 rounded-xl text-primary hover:bg-primary/10 disabled:opacity-40"
                aria-label="Send Message"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Launcher Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "group relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl border border-primary/40 bg-gradient-to-tr from-primary via-primary/90 to-accent text-white shadow-xl shadow-primary/30 transition-all duration-300 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isOpen && "rotate-90"
        )}
        aria-label="Toggle Career Copilot Assistant"
        title="Ask Career Copilot"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <>
            <Bot className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-background" />
            </span>
          </>
        )}
      </button>
    </div>
  );
}
