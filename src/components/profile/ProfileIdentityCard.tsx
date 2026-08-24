import React from "react";
import { User, Mail, Target, Award, Calendar, Sparkles, ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { useAuth } from "@/context/AuthContext";
import { useCareerContext } from "@/hooks/useCareerContext";
import { formatChartDate } from "@/lib/careerMetrics";

export function ProfileIdentityCard() {
  const { user } = useAuth();
  const { targetRole, readiness, activeResume } = useCareerContext();

  const getInitials = (name?: string, email?: string) => {
    const source = (name || email || "User").trim();
    const parts = source.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return source.slice(0, 2).toUpperCase();
  };

  return (
    <div className="glass-card gradient-border relative overflow-hidden rounded-3xl p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        {/* Left: Avatar & Identity Details */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-accent text-white font-display text-xl sm:text-2xl font-bold shadow-lg shadow-primary/25 border border-white/20">
            {getInitials(user?.full_name, user?.email)}
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground truncate">
                {user?.full_name || "Engineering Candidate"}
              </h2>
              <StatusBadge variant="success" dot className="text-[10px]">
                Verified Account
              </StatusBadge>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {user?.email || "user@example.com"}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Target className="h-3.5 w-3.5 text-primary" />
                {targetRole}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Master Career Readiness Score Gauge */}
        <div className="flex items-center gap-4 self-start sm:self-auto shrink-0 bg-secondary/30 border border-border/60 rounded-2xl p-3.5">
          <div className="space-y-0.5 text-left">
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
              Career Readiness
            </span>
            <p className="text-xs font-semibold text-foreground">Role Benchmark</p>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/30">
            <span className="font-display text-lg font-bold gradient-text">
              <AnimatedCounter value={readiness.overallScore} suffix="%" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
