import React from "react";
import { motion } from "framer-motion";
import { Mic, Volume2, Loader2, Bot, Sparkles } from "lucide-react";

export type VoiceState = "idle" | "speaking" | "listening" | "processing";

interface VoiceVisualizerProps {
  state: VoiceState;
  statusMessage?: string | null;
}

export function VoiceVisualizer({ state, statusMessage }: VoiceVisualizerProps) {
  const bars = [16, 28, 44, 60, 48, 70, 52, 38, 22, 14];

  const getStatusInfo = () => {
    switch (state) {
      case "listening":
        return {
          label: "Listening to your response...",
          icon: Mic,
          color: "text-cyan-400",
          badgeBg: "bg-cyan-500/10 border-cyan-500/30 text-cyan-300",
          glow: "shadow-[0_0_40px_-5px_rgba(34,211,238,0.3)]",
        };
      case "speaking":
        return {
          label: "AI Interviewer Speaking...",
          icon: Volume2,
          color: "text-purple-400",
          badgeBg: "bg-primary/10 border-primary/30 text-primary",
          glow: "shadow-[0_0_40px_-5px_rgba(124,92,252,0.35)]",
        };
      case "processing":
        return {
          label: "AI Analyzing Speech & Generating...",
          icon: Loader2,
          color: "text-amber-400",
          badgeBg: "bg-amber-500/10 border-amber-500/30 text-amber-300",
          glow: "shadow-[0_0_40px_-5px_rgba(245,158,11,0.25)]",
        };
      default:
        return {
          label: "Press microphone to speak",
          icon: Sparkles,
          color: "text-muted-foreground",
          badgeBg: "bg-secondary/40 border-border/60 text-muted-foreground",
          glow: "",
        };
    }
  };

  const info = getStatusInfo();
  const Icon = info.icon;

  return (
    <div className={`relative flex flex-col items-center justify-center rounded-3xl border border-border/70 bg-gradient-to-b from-secondary/30 to-background/50 p-8 sm:p-12 transition-all duration-500 ${info.glow}`}>
      {/* Central Pulsing Sphere */}
      <div className="relative mb-6 flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center">
        {state === "listening" && (
          <motion.div
            className="absolute inset-0 rounded-full bg-cyan-500/20"
            animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0.1, 0.6] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          />
        )}

        {state === "speaking" && (
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/25"
            animate={{ scale: [1, 1.4, 1], opacity: [0.7, 0.15, 0.7] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          />
        )}

        <div className={`relative z-10 flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl border ${info.badgeBg} backdrop-blur-xl transition-all shadow-inner`}>
          <Icon className={`h-8 w-8 sm:h-10 sm:w-10 ${info.color} ${state === "processing" ? "animate-spin" : ""}`} />
        </div>
      </div>

      {/* Animated Audio Waveform Bars */}
      <div className="flex items-center gap-1.5 h-16 mb-4">
        {bars.map((height, i) => {
          const isAnimated = state === "listening" || state === "speaking";
          return (
            <motion.div
              key={i}
              className={`w-1.5 rounded-full ${
                state === "listening"
                  ? "bg-cyan-400"
                  : state === "speaking"
                  ? "bg-primary"
                  : "bg-muted-foreground/30"
              }`}
              animate={
                isAnimated
                  ? {
                      height: [
                        `${Math.max(height * 0.3, 8)}px`,
                        `${Math.min(height * 1.2, 56)}px`,
                        `${Math.max(height * 0.4, 8)}px`,
                      ],
                    }
                  : { height: "8px" }
              }
              transition={
                isAnimated
                  ? {
                      repeat: Infinity,
                      duration: 0.6 + (i % 3) * 0.2,
                      ease: "easeInOut",
                      delay: i * 0.05,
                    }
                  : { duration: 0.2 }
              }
            />
          );
        })}
      </div>

      {/* Status Label */}
      <div className="text-center space-y-1">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${info.badgeBg}`}>
          {info.label}
        </span>
        {statusMessage && (
          <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
            {statusMessage}
          </p>
        )}
      </div>
    </div>
  );
}
