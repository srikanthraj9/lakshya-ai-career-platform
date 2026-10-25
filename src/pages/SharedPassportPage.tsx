import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Award,
  ShieldCheck,
  Target,
  Code,
  Mic,
  FileText,
  Compass,
  ArrowRight,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { profileService, type SharedPassportData } from "@/services/profileService";
import { PageLoader } from "@/components/PageLoader";

export default function SharedPassportPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedPassportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Prevent search engines from indexing public skill passport links
    let meta = document.querySelector('meta[name="robots"]');
    let created = false;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      document.head.appendChild(meta);
      created = true;
    }
    const prevContent = meta.getAttribute("content");
    meta.setAttribute("content", "noindex, nofollow");

    return () => {
      if (created && meta?.parentNode) {
        meta.parentNode.removeChild(meta);
      } else if (meta && prevContent) {
        meta.setAttribute("content", prevContent);
      } else if (meta) {
        meta.removeAttribute("content");
      }
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setError("Invalid share token");
      setLoading(false);
      return;
    }

    profileService
      .getSharedPassport(token)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.detail || "Skill Passport is private or has expired.");
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return <PageLoader />;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="glass-card max-w-md w-full rounded-3xl p-8 text-center space-y-4 border border-border">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
            <Lock className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="font-display text-lg font-bold text-foreground">
              Passport Unavailable
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {error || "This Skill Passport is private, revoked, or no longer accessible."}
            </p>
          </div>
          <Link to="/">
            <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5 border-border">
              <Compass className="h-4 w-4" />
              <span>Explore Lakshya AI</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const getSourceBadge = (source: string) => {
    const s = source.toLowerCase();
    switch (s) {
      case "verified":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
            <ShieldCheck className="h-3 w-3" />
            Verified Credential
          </span>
        );
      case "interview":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[10px] font-semibold text-purple-400">
            <Mic className="h-3 w-3" />
            Interview Assessed
          </span>
        );
      case "project":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-semibold text-cyan-400">
            <Code className="h-3 w-3" />
            Project Evidence
          </span>
        );
      case "resume":
      case "onboarding":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
            <FileText className="h-3 w-3" />
            Resume Inferred
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-secondary border border-border/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Self-Reported
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      {/* Brand Top Bar */}
      <header className="border-b border-border/60 bg-card/60 backdrop-blur-xl px-6 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 border border-primary/25 shadow-sm text-primary">
              <Compass className="h-4 w-4" />
            </div>
            <span className="font-display font-bold gradient-text text-base">Lakshya AI</span>
            <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
              Verified Candidate Portfolio
            </span>
          </Link>
          <Link to="/register">
            <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1 border-primary/30 text-primary">
              <span>Create Your Passport</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Shared Content */}
      <main className="max-w-5xl mx-auto w-full p-6 sm:p-8 space-y-6 flex-1">
        {/* Candidate Summary Card */}
        <div className="glass-card gradient-border rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-accent text-white font-display text-xl sm:text-2xl font-bold shadow-lg shadow-primary/25 border border-white/20">
                {data.full_name.slice(0, 2).toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                    {data.full_name}
                  </h1>
                  <StatusBadge variant="success" dot className="text-[10px]">
                    Verified Skill Passport
                  </StatusBadge>
                </div>
                {data.headline && (
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
                    {data.headline}
                  </p>
                )}
                {data.target_role && (
                  <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                    <Target className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium text-foreground">Target Role: {data.target_role}</span>
                    {data.experience_level && <span>• {data.experience_level} Level</span>}
                  </div>
                )}
              </div>
            </div>

            {data.alignment_score && (
              <div className="flex items-center gap-3 bg-secondary/30 border border-border/60 rounded-2xl p-4 self-start sm:self-auto">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                    Readiness Score
                  </span>
                  <p className="text-xs font-semibold text-foreground">Role Benchmark</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/30">
                  <span className="font-display text-base font-bold gradient-text">
                    {Math.round(data.alignment_score)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Skills Inventory */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              <h2 className="font-display text-base font-bold text-foreground">
                Demonstrated Competencies ({data.skills.length})
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">Shared securely via Lakshya AI</span>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2 md:grid-cols-3">
            {data.skills.map((skill, index) => (
              <div
                key={`${skill.skill_name}-${index}`}
                className="glass-card rounded-2xl p-4 border border-border/60 space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-1">
                  <h3 className="font-display text-sm font-bold text-foreground">
                    {skill.skill_name}
                  </h3>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                    {skill.skill_category}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border/40">
                  {getSourceBadge(skill.source)}
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {Math.round(skill.confidence * 100)}% Confidence
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground bg-card/40">
        <p>Lakshya AI Verified Candidate Profile • Private details protected</p>
      </footer>
    </div>
  );
}
