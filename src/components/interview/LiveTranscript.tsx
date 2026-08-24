import React, { useRef, useEffect } from "react";
import { Bot, User, Volume2, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { VoiceChatMessage } from "@/types";

interface LiveTranscriptProps {
  messages: VoiceChatMessage[];
  interimTranscript?: string;
  isListening?: boolean;
}

export function LiveTranscript({
  messages,
  interimTranscript,
  isListening = false,
}: LiveTranscriptProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, interimTranscript]);

  return (
    <div className="glass-card rounded-3xl p-6 space-y-4 flex flex-col h-full min-h-[380px]">
      <div className="flex items-center justify-between pb-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h4 className="font-display text-sm font-semibold text-foreground">Live Spoken Transcript</h4>
        </div>
        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
          Real-time Dialogue
        </span>
      </div>

      <ScrollArea className="flex-1 pr-3 max-h-[360px]">
        <div className="space-y-4 text-xs">
          {messages.length === 0 && !interimTranscript && (
            <div className="p-8 text-center text-muted-foreground text-xs">
              Spoken conversation and AI responses will appear here as you speak.
            </div>
          )}

          {messages.map((msg, idx) => {
            const isAI = msg.role === "assistant";
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
                  className={`max-w-[82%] rounded-2xl p-3.5 leading-relaxed ${
                    isAI
                      ? "bg-secondary/40 border border-border/60 text-foreground"
                      : "bg-gradient-to-r from-primary to-accent text-white"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold ${isAI ? "text-primary" : "text-white/80"}`}>
                      {isAI ? "AI Interviewer" : "You"}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            );
          })}

          {/* Interim speech recognition bubble */}
          {interimTranscript && (
            <div className="flex gap-3 items-start flex-row-reverse">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 animate-pulse">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="max-w-[82%] rounded-2xl p-3.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 italic leading-relaxed">
                <span className="text-[10px] font-bold block mb-1 text-cyan-400">Listening...</span>
                <p>{interimTranscript}</p>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
