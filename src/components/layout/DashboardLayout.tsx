import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { MobileNav } from "./MobileNav";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Target,
  MessageSquare,
  Briefcase,
  Bot,
  Map,
  User,
  Compass,
  Zap,
  Kanban,
  BarChart3,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

import { FeedbackWidget } from "@/components/feedback/FeedbackWidget";

export function DashboardLayout() {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  const allDrawerLinks = [
    { title: "Command Center", href: "/dashboard", icon: LayoutDashboard },
    { title: "Career Intelligence", href: "/intelligence", icon: Zap },
    { title: "Application Tracker", href: "/applications", icon: Kanban },
    { title: "Resume Studio", href: "/resume", icon: FileText },
    { title: "Role Alignment", href: "/roles/analyze", icon: Target },
    { title: "Career Roadmap", href: "/roadmap", icon: Map },
    { title: "Interview Studio", href: "/interview", icon: MessageSquare },
    { title: "Job Matches", href: "/jobs", icon: Briefcase },
    { title: "Career Analytics", href: "/analytics", icon: BarChart3 },
    { title: "Career Copilot", href: "/copilot", icon: Bot },
    { title: "Profile & Identity", href: "/profile", icon: User },
  ];

  return (
    <div className="flex min-h-[100dvh] w-full bg-background text-foreground">
      {/* Desktop Persistent Sidebar */}
      <AppSidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <AppHeader onToggleMobileMenu={() => setMobileDrawerOpen(true)} />

        {/* Email Verification Warning Banner (Only for unverified users) */}
        {user && !user.is_email_verified && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-500 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="truncate">
                <strong>Email verification required:</strong> Please verify your email (
                {user.email}) to unlock full AI career intelligence.
              </span>
            </div>
            <Link to="/verify-email" className="shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="h-6 border-amber-500/40 bg-amber-500/10 text-[11px] font-semibold text-amber-500 hover:bg-amber-500/20"
              >
                Verify Email
              </Button>
            </Link>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Beta Feedback Widget */}
      <FeedbackWidget />

      {/* Mobile Fixed Bottom Navigation */}
      <MobileNav />

      {/* Mobile Slide-Out Drawer for Extended Navigation */}
      <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
        <SheetContent side="left" className="w-72 p-0 border-border bg-popover/95 backdrop-blur-2xl">
          <SheetHeader className="p-4 border-b border-border/70 text-left">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 border border-primary/25">
                <Compass className="h-5 w-5 text-primary" />
              </div>
              <SheetTitle className="font-display text-lg font-bold gradient-text">
                LakshyaAI
              </SheetTitle>
            </div>
          </SheetHeader>

          <div className="flex flex-col justify-between h-[calc(100vh-5rem)] p-4">
            <nav className="space-y-1.5" aria-label="Mobile Drawer Navigation">
              {allDrawerLinks.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? location.pathname === "/dashboard"
                    : location.pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileDrawerOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/15 text-primary font-semibold"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
