import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  FileText,
  MessageSquare,
  Briefcase,
  Wand2,
  Map,
  Bot,
  Search,
  ArrowRight,
  Sparkles,
  User,
  LayoutDashboard,
  Target,
  BarChart3,
  Check,
  Zap,
  Kanban,
} from "lucide-react";
import { useCareerContext } from "@/hooks/useCareerContext";
import { toast } from "sonner";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TARGET_ROLE_OPTIONS = [
  "Full Stack Developer",
  "Senior Full Stack Engineer",
  "Frontend Engineer",
  "Backend / API Specialist",
  "DevOps & Cloud Engineer",
  "AI / ML Engineer",
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { targetRole, setTargetRole } = useCareerContext();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const navigationCommands = [
    { title: "Command Center", subtitle: "Career dashboard & readiness metrics", href: "/dashboard", icon: LayoutDashboard },
    { title: "Career Intelligence", subtitle: "Autonomous strategy, ranked actions & goals", href: "/intelligence", icon: Zap },
    { title: "Application Tracker", subtitle: "Kanban pipeline, interview debriefs & outcomes", href: "/applications", icon: Kanban },
    { title: "Resume Studio", subtitle: "ATS scoring, diagnostics & LaTeX rewriter", href: "/resume", icon: FileText },
    { title: "Role Alignment", subtitle: "Target role skill match analysis", href: "/roles/analyze", icon: Target },
    { title: "Career Roadmap", subtitle: "Adaptive milestones & curated resources", href: "/roadmap", icon: Map },
    { title: "Interview Studio", subtitle: "Text & Voice AI technical mock simulation", href: "/interview", icon: MessageSquare },
    { title: "Opportunity Hub", subtitle: "AI-matched jobs & market listings", href: "/jobs", icon: Briefcase },
    { title: "Career Copilot", subtitle: "Contextual AI career advisor & mentor", href: "/copilot", icon: Bot },
    { title: "Career Analytics", subtitle: "Performance radar & skill trajectory", href: "/analytics", icon: BarChart3 },
    { title: "Profile & Identity", subtitle: "Manage career goals & verified skills", href: "/profile", icon: User },
  ];

  const quickActions = [
    { title: "📋 View My Job Application Pipeline", subtitle: "Check Kanban stages & active interviews", href: "/applications", icon: Kanban },
    { title: "⚡ View My Highest-Leverage Next Action", subtitle: "Top AI career recommendation", href: "/intelligence", icon: Zap },
    { title: "✨ Optimize Resume with AI", subtitle: "Tailor resume for target role", href: "/resume/rewrite", icon: Wand2 },
    { title: "🎙 Launch Voice AI Mock Interview", subtitle: "5-minute technical simulation", href: "/interview/voice-ai", icon: MessageSquare },
    { title: "💼 Explore 90%+ Job Matches", subtitle: "Filter high-compatibility openings", href: "/jobs", icon: Briefcase },
    { title: "🤖 Ask Copilot: What to learn next?", subtitle: "Analyze current skill gaps", href: "/copilot", icon: Bot },
  ];

  const handleSelect = (href: string) => {
    onOpenChange(false);
    navigate(href);
  };

  const handleSwitchRole = (role: string) => {
    setTargetRole(role);
    toast.success(`Target role set to ${role}`);
    onOpenChange(false);
  };

  const filteredNav = navigationCommands.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(search.toLowerCase()) ||
      cmd.subtitle.toLowerCase().includes(search.toLowerCase())
  );

  const filteredActions = quickActions.filter(
    (act) =>
      act.title.toLowerCase().includes(search.toLowerCase()) ||
      act.subtitle.toLowerCase().includes(search.toLowerCase())
  );

  const filteredRoles = TARGET_ROLE_OPTIONS.filter((r) =>
    r.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden border-border/80 bg-popover/95 backdrop-blur-2xl shadow-2xl rounded-3xl">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/60">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Lakshya AI workspaces, quick actions, target roles..."
            className="w-full bg-transparent text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            autoFocus
          />
          <kbd className="hidden sm:inline-block rounded border border-border bg-secondary/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div className="max-h-96 overflow-y-auto p-3 space-y-4 text-xs">
          {/* Quick Actions */}
          {filteredActions.length > 0 && (
            <div>
              <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Quick Actions
              </span>
              <div className="mt-1 space-y-1">
                {filteredActions.map((action) => (
                  <button
                    key={action.title}
                    onClick={() => handleSelect(action.href)}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left text-foreground hover:bg-secondary/70 hover:text-primary transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        <action.icon className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold">{action.title}</p>
                        <p className="text-[10px] text-muted-foreground">{action.subtitle}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Target Role Switcher */}
          {filteredRoles.length > 0 && (
            <div>
              <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Set Target Career Goal
              </span>
              <div className="mt-1 grid grid-cols-2 gap-1.5 px-1">
                {filteredRoles.map((roleOption) => {
                  const isCurrent = targetRole === roleOption;
                  return (
                    <button
                      key={roleOption}
                      onClick={() => handleSwitchRole(roleOption)}
                      className={`flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-left transition-all ${
                        isCurrent
                          ? "bg-primary/20 border border-primary/40 text-foreground font-semibold"
                          : "bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/60 border border-transparent"
                      }`}
                    >
                      <span className="truncate">{roleOption}</span>
                      {isCurrent && <Check className="h-3 w-3 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation Workspaces */}
          {filteredNav.length > 0 && (
            <div>
              <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Workspaces
              </span>
              <div className="mt-1 space-y-1">
                {filteredNav.map((cmd) => (
                  <button
                    key={cmd.title}
                    onClick={() => handleSelect(cmd.href)}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left text-foreground hover:bg-secondary/70 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <cmd.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      <div>
                        <p className="text-xs font-semibold">{cmd.title}</p>
                        <p className="text-[10px] text-muted-foreground">{cmd.subtitle}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Open</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
