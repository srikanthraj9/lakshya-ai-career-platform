import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FileText, Target, MessageSquare, BarChart3,
  Briefcase, User, LogOut, Compass, Menu, Bot, Map, Wand2, Mic, Globe
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { useState } from "react";

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

export function AppSidebar() {
  const location = useLocation();
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn("flex flex-col border-r border-border bg-sidebar transition-all duration-300", collapsed ? "w-16" : "w-64")}>
      <div className="flex h-16 items-center gap-2 border-b border-border px-4">
        <button onClick={() => setCollapsed(!collapsed)} className="text-muted-foreground hover:text-foreground">
          <Menu className="h-5 w-5" />
        </button>
        {!collapsed && (
          <Link to="/dashboard" className="flex items-center gap-2">
            <Compass className="h-6 w-6 text-primary" />
            <span className="font-display text-lg font-bold gradient-text">LakshyaAI</span>
          </Link>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          return (
            <Link key={item.href} to={item.href} className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-primary/10 text-primary shadow-[inset_3px_0_0_hsl(var(--primary))]"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-0.5"
            )}>
              <item.icon className={cn("h-5 w-5 shrink-0 transition-transform duration-200", !isActive && "group-hover:scale-110")} />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-destructive transition-colors">
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
