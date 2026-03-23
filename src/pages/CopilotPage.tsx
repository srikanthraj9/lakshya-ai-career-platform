import { useState, useRef, useEffect, useCallback } from "react";
import { copilotService } from "@/services/copilot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Bot, User, Sparkles } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { PageTransition } from "@/components/PageTransition";
import type { CopilotMessage } from "@/types";

const promptSuggestions = [
  "How can I improve my resume?",
  "What skills should I learn for AI Engineer?",
  "Suggest projects for ML career growth",
  "How to prepare for a system design interview?",
];

export default function CopilotPage() {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: CopilotMessage = { id: crypto.randomUUID(), role: "user", content: text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await copilotService.chat(text);
      const assistantMsg: CopilotMessage = { id: crypto.randomUUID(), role: "assistant", content: res.reply, timestamp: new Date() };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      toast.error("Failed to get response from AI Copilot.");
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  }, [input, sendMessage]);

  return (
    <PageTransition>
      <div className="flex h-[calc(100vh-4rem)] flex-col">
        <div className="mb-4">
          <h1 className="font-display text-3xl font-bold">AI Career Copilot</h1>
          <p className="text-muted-foreground">Your personal AI career advisor.</p>
        </div>

        <div className="flex-1 overflow-hidden rounded-2xl glass-card" role="log" aria-label="Chat messages" aria-live="polite">
          <ScrollArea className="h-full p-4">
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex h-full flex-col items-center justify-center gap-6 py-16"
              >
                <div className="rounded-full bg-primary/10 p-4">
                  <Sparkles className="h-10 w-10 text-primary" aria-hidden="true" />
                </div>
                <p className="text-lg text-muted-foreground">Start a conversation with your AI Career Copilot</p>
                <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Suggested prompts">
                  {promptSuggestions.map((p) => (
                    <button
                      key={p}
                      onClick={() => sendMessage(p)}
                      className="rounded-full border border-border bg-secondary/50 px-4 py-2 text-sm text-foreground transition-all duration-200 hover:bg-primary/10 hover:border-primary/30 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Ask: ${p}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`mb-4 flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20" aria-hidden="true">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-foreground"}`}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20" aria-hidden="true">
                      <User className="h-4 w-4 text-accent" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 flex gap-3" role="status" aria-label="AI is typing">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20" aria-hidden="true">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl bg-secondary/60 px-4 py-3">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
                </div>
              </motion.div>
            )}
            <div ref={scrollRef} />
          </ScrollArea>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask your AI Career Copilot..." className="flex-1 bg-secondary/30" disabled={loading} aria-label="Type your message" />
          <Button type="submit" variant="gradient" disabled={loading || !input.trim()} aria-label="Send message">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </PageTransition>
  );
}
