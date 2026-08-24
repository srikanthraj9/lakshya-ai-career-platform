import React from "react";
import { Compass, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface PageLoaderProps {
  title?: string;
}

export function PageLoader({ title = "Loading Lakshya AI Workspace..." }: PageLoaderProps) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
      <div className="relative flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
          className="h-16 w-16 rounded-full border-2 border-primary/20 border-t-primary"
        />
        <Compass className="absolute h-7 w-7 text-primary animate-pulse" />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>{title}</span>
        </div>
        <p className="text-[11px] text-muted-foreground">Preparing career intelligence telemetry</p>
      </div>
    </div>
  );
}
