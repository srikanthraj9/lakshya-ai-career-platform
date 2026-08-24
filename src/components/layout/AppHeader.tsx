import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Menu, Target, Compass, Shield } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { CommandPalette } from "./CommandPalette";
import { getActiveTargetRole } from "@/lib/navigationStatus";
import { useAuth } from "@/context/AuthContext";

interface AppHeaderProps {
  onToggleMobileMenu?: () => void;
}

export function AppHeader({ onToggleMobileMenu }: AppHeaderProps) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { user } = useAuth();
  const targetRole = getActiveTargetRole(user?.id);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/60 bg-background/80 px-4 sm:px-6 backdrop-blur-xl transition-all">
        {/* Left: Mobile Brand & Search Trigger */}
        <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-md">
          <button
            onClick={onToggleMobileMenu}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:bg-secondary hover:text-foreground md:hidden"
            aria-label="Open mobile menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link to="/dashboard" className="flex items-center gap-2 md:hidden">
            <Compass className="h-6 w-6 text-primary" />
            <span className="font-display font-bold gradient-text">LakshyaAI</span>
          </Link>

          {/* Search Bar / Command Palette Launcher */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="hidden sm:flex w-full items-center justify-between gap-3 rounded-xl border border-border/60 bg-secondary/30 px-3.5 py-2 text-xs text-muted-foreground hover:border-primary/40 hover:bg-secondary/50 transition-all group"
            aria-label="Open command palette (Ctrl+K)"
          >
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span>Search skills, jobs, roles, tools...</span>
            </div>
            <kbd className="inline-flex items-center gap-0.5 rounded border border-border/80 bg-secondary/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground group-hover:text-foreground">
              ⌘ K
            </kbd>
          </button>
        </div>

        {/* Right: Goal Pill, Notifications, Theme */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Admin Control Center Pill (Visible to Admin / Super Admin) */}
          {(user?.role === "admin" || user?.role === "super_admin") && (
            <Link
              to="/admin"
              className="hidden md:flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-500 hover:bg-amber-500/20 transition-all shadow-sm"
              title="Admin Control Center"
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Admin Center</span>
            </Link>
          )}

          {/* Target Role Status Pill */}
          <Link
            to="/roles/analyze"
            className="hidden lg:flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/15 transition-all shadow-sm"
          >
            <Target className="h-3.5 w-3.5" />
            <span>Target: {targetRole.title}</span>
            {targetRole.readiness > 0 && (
              <span className="rounded-full bg-primary/20 px-1.5 py-0.2 text-[10px] font-bold">
                {targetRole.readiness}%
              </span>
            )}
          </Link>

          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:bg-secondary hover:text-foreground sm:hidden"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>

          <NotificationBell />
          <ThemeToggle />
        </div>
      </header>

      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
    </>
  );
}
