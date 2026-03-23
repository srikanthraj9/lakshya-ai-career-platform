import { memo, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FileText, Target, MessageSquare, BarChart3,
  Briefcase, User, LogOut, Compass, Menu, Bot, Map, Wand2, Mic, Globe
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Resume", href: "/resume/upload", icon: FileText },
  { title: "Resume Rewriter", href: "/resume/rewrite", icon: Wand2 },
  { title: "Role Alignment", href: "/roles/analyze", icon: Target },
  { title: "Skill Roadmap", href: "/roadmap", icon: Map },
  { title: "Interview", href: "/interview/setup", icon: MessageSquare },
  { title: "Voice Interview", href: "/interview/voice-ai", icon: Mic },
  { title: "Jobs", href: "/jobs", icon: Briefcase },
  { title: "Live Jobs", href: "/jobs/live", icon: Globe },
  { title: "Analytics", href: "/analytics", icon: BarChart3 },
  { title: "Career Copilot", href: "/copilot", icon: Bot },
  { title: "Profile", href: "/profile", icon: User },
];

const NavItem = memo(function NavItem({ item, isActive, collapsed }: { item: typeof navItems[0]; isActive: boolean; collapsed: boolean }) {
  return (
    <Link
      to={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive
          ? "bg-primary/10 text-primary shadow-[inset_3px_0_0_hsl(var(--primary))]"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-0.5"
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <item.icon className={cn("h-5 w-5 shrink-0 transition-transform duration-200", !isActive && "group-hover:scale-110")} aria-hidden="true" />
      {!collapsed && <span>{item.title}</span>}
    </Link>
  );
});

export const AppSidebar = memo(function AppSidebar() {
  const location = useLocation();
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const handleToggle = useCallback(() => setCollapsed((c) => !c), []);

  return (
    <aside className={cn("flex flex-col border-r border-border bg-sidebar transition-all duration-300", collapsed ? "w-16" : "w-64")} role="navigation" aria-label="Sidebar navigation">
      <div className="flex h-16 items-center gap-2 border-b border-border px-4">
        <button onClick={handleToggle} className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        {!collapsed && (
          <Link to="/dashboard" className="flex items-center gap-2" aria-label="Go to dashboard">
            <Compass className="h-6 w-6 text-primary" aria-hidden="true" />
            <span className="font-display text-lg font-bold gradient-text">LakshyaAI</span>
          </Link>
        )}
        {!collapsed && (
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell />
            <ThemeToggle />
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Main menu">
        {navItems.map((item) => (
          <NavItem key={item.href} item={item} isActive={location.pathname.startsWith(item.href)} collapsed={collapsed} />
        ))}
      </nav>

      <div className="border-t border-border p-3">
        {collapsed && (
          <div className="mb-2 flex flex-col items-center gap-2">
            <NotificationBell />
            <ThemeToggle />
          </div>
        )}
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Log out">
          <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
});
