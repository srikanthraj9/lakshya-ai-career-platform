import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  Bot,
  Loader2,
  MessageSquareMore,
  Send,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/services/api";
import { copilotService } from "@/services/copilot";
import type { CopilotChatMessage, CopilotMessage } from "@/types";

const starterPrompts = [
  "Explain React Server Components in simple terms.",
  "How should I prepare for a backend engineering interview?",
  "Help me debug a TypeScript type error.",
  "What are good project ideas for learning system design?",
];

function AssistantReply({ content }: { content: string }) {
  return (
    <div className="prose prose-invert max-w-none prose-p:my-3 prose-pre:overflow-x-auto prose-pre:rounded-2xl prose-pre:border prose-pre:border-white/10 prose-pre:bg-background/60 prose-pre:p-4 prose-code:rounded prose-code:bg-background/50 prose-code:px-1 prose-code:py-0.5 prose-code:text-foreground">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

function createMessage(role: CopilotChatMessage["role"], content: string): CopilotMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    timestamp: new Date(),
  };
}

export default function CopilotPage() {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<CopilotMessage[]>([]);
  const loadingRef = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  const sendMessage = useCallback(async (rawText: string) => {
    const normalizedMessage = rawText.trim();
    if (!normalizedMessage || loadingRef.current) {
      return;
    }

    const userMessage = createMessage("user", normalizedMessage);
    const nextConversation: CopilotChatMessage[] = [
      ...messagesRef.current.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      {
        role: userMessage.role,
        content: userMessage.content,
      },
    ];

    console.log("[Copilot Request]", nextConversation);
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    loadingRef.current = true;

    try {
      const response = await copilotService.chat(nextConversation);
      console.log("[Copilot Response]", response);
      setMessages((prev) => [...prev, createMessage("assistant", response.reply)]);
    } catch (error) {
      console.error("[Copilot Error]", error);
      toast.error(getApiErrorMessage(error));
      setMessages((prev) => [
        ...prev,
        createMessage("assistant", `AI request failed.\n\n${getApiErrorMessage(error)}`),
      ]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  const handleSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    void sendMessage(input);
  }, [input, sendMessage]);

  const handleComposerKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  }, [input, sendMessage]);

  const clearChat = useCallback(() => {
    if (loading) {
      return;
    }
    setMessages([]);
    setInput("");
  }, [loading]);

  return (
    <PageTransition>
      <div className="flex h-[calc(100vh-4rem)] flex-col">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">AI Career Copilot</h1>
            <p className="text-muted-foreground">Ask anything. The assistant keeps the full conversation and responds naturally.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={clearChat}
            disabled={loading || messages.length === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Chat
          </Button>
        </div>

        <div className="mb-4 rounded-2xl border border-white/10 bg-secondary/20 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">ChatGPT-style assistant</p>
              <p className="text-sm text-muted-foreground">General knowledge, coding help, career strategy, or anything else supported by the model.</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(39,196,255,0.12),transparent_42%),linear-gradient(180deg,rgba(16,19,30,0.98),rgba(10,12,20,0.96))] shadow-[0_24px_80px_-40px_rgba(0,0,0,0.9)]">
          <ScrollArea className="h-full p-5">
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex h-full flex-col items-center justify-center gap-6 py-16"
              >
                <div className="rounded-full bg-primary/10 p-4">
                  <Sparkles className="h-10 w-10 text-primary" aria-hidden="true" />
                </div>
                <p className="max-w-2xl text-center text-lg text-muted-foreground">
                  Start a conversation. Ask about code, interviews, architecture, learning strategy, or anything else you need.
                </p>
                <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Suggested prompts">
                  {starterPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void sendMessage(prompt)}
                      disabled={loading}
                      className="rounded-full border border-border bg-secondary/50 px-4 py-2 text-sm text-foreground transition hover:border-primary/30 hover:bg-primary/10 disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : null}

            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`mb-5 flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" ? (
                    <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  ) : null}

                  <div className={`max-w-[82%] rounded-[24px] px-4 py-4 ${message.role === "user" ? "bg-primary text-primary-foreground" : "border border-white/10 bg-secondary/55 text-foreground"}`}>
                    {message.role === "assistant" ? (
                      <AssistantReply content={message.content} />
                    ) : (
                      <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                    )}
                  </div>

                  {message.role === "user" ? (
                    <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/20">
                      <User className="h-4 w-4 text-accent" />
                    </div>
                  ) : null}
                </motion.div>
              ))}
            </AnimatePresence>

            {loading ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 flex gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="rounded-[20px] border border-white/10 bg-secondary/55 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI is thinking...
                  </div>
                </div>
              </motion.div>
            ) : null}

            <div ref={scrollRef} />
          </ScrollArea>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-secondary/15 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <MessageSquareMore className="h-4 w-4" />
            Conversational Copilot
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder="Ask anything..."
              className="min-h-[64px] flex-1 resize-none border-white/10 bg-secondary/30"
              disabled={loading}
              aria-label="Type your message"
            />
            <Button
              type="submit"
              variant="gradient"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="self-end"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </div>
    </PageTransition>
  );
}
