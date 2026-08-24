import { memo, useCallback, useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Target,
  MessageSquare,
  Briefcase,
  User,
  LogOut,
  Compass,
  Menu,
  Bot,
  Map,
  Pencil,
  Zap,
  Kanban,
  Shield,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCareerReadiness } from "@/hooks/useCareerReadiness";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface NavItemConfig {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeVariant?: "default" | "success" | "ai" | "accent";
}

interface NavSection {
  title: string;
  items: NavItemConfig[];
}

const NavItem = memo(function NavItem({
  item,
  isActive,
  collapsed,
}: {
  item: NavItemConfig;
  isActive: boolean;
  collapsed: boolean;
}) {
  const badgeColors = {
    default: "bg-secondary text-muted-foreground border-border/50",
    success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    ai: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    accent: "bg-primary/15 text-primary border-primary/30",
  };

  const badgeStyle = item.badgeVariant ? badgeColors[item.badgeVariant] : badgeColors.default;

  return (
    <Link
      to={item.href}
      className={cn(
        "group relative flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive
          ? "bg-primary/15 text-primary font-semibold shadow-[inset_3px_0_0_hsl(var(--primary))]"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-0.5"
      )}
      aria-current={isActive ? "page" : undefined}
      title={collapsed ? item.title : undefined}
    >
      <div className="flex items-center gap-3">
        <item.icon
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200",
            isActive
              ? "text-primary scale-110"
              : "text-muted-foreground group-hover:text-foreground group-hover:scale-110"
          )}
          aria-hidden="true"
        />
        {!collapsed && <span className="truncate">{item.title}</span>}
      </div>

      {!collapsed && item.badge && (
        <span
          className={cn(
            "rounded-full border px-1.5 py-0.2 text-[10px] font-bold tracking-wider",
            badgeStyle
          )}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
});

export const AppSidebar = memo(function AppSidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const { breakdown, targetRole } = useCareerReadiness();

  const handleToggle = useCallback(() => setCollapsed((c) => !c), []);

  const userName =
    user?.full_name || (user?.email ? user.email.split("@")[0] : "Candidate");
  const userRole = targetRole.title;
  const readiness = breakdown.overallScore;

  const navSections: NavSection[] = useMemo(
    () => [
      {
        title: "COMMAND CENTER",
        items: [
          { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
          {
            title: "Career Intelligence",
            href: "/intelligence",
            icon: Zap,
            badge: "AI",
            badgeVariant: "ai",
          },
        ],
      },
      {
        title: "GROWTH ECOSYSTEM",
        items: [
          { title: "Resume Studio", href: "/resume", icon: FileText },
          { title: "Role Alignment", href: "/roles/analyze", icon: Target },
          { title: "Career Roadmap", href: "/roadmap", icon: Map },
        ],
      },
      {
        title: "EXECUTION & OUTCOMES",
        items: [
          { title: "Application Tracker", href: "/applications", icon: Kanban },
          { title: "Job Matches", href: "/jobs", icon: Briefcase },
        ],
      },
      {
        title: "PRACTICE",
        items: [
          {
            title: "Interview Studio",
            href: "/interview",
            icon: MessageSquare,
            badge: "LIVE",
            badgeVariant: "ai",
          },
        ],
      },
      {
        title: "AI ASSISTANT",
        items: [
          {
            title: "Career Copilot",
            href: "/copilot",
            icon: Bot,
            badge: "⌘ K",
            badgeVariant: "ai",
          },
        ],
      },
    ],
    []
  );

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-border/70 bg-sidebar transition-all duration-300 select-none z-20",
        collapsed ? "w-16" : "w-64"
      )}
      role="navigation"
      aria-label="Sidebar navigation"
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-border/70 px-4">
        {!collapsed && (
          <Link to="/dashboard" className="flex items-center gap-2.5" aria-label="Go to dashboard">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 border border-primary/25 shadow-sm">
              <Compass className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight gradient-text">
              LakshyaAI
            </span>
          </Link>
        )}

        <button
          onClick={handleToggle}
          className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg p-1.5 hover:bg-secondary"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Target Goal Widget (Only when expanded) */}
      {!collapsed && (
        <div className="p-3 border-b border-border/50">
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/10 to-primary/5 p-3 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-primary font-semibold">
                <Target className="h-3.5 w-3.5" />
                <span className="uppercase tracking-wider text-[10px]">Your Career Goal</span>
              </div>
              <Link
                to="/roles/analyze"
                className="text-muted-foreground hover:text-primary transition-colors"
                title="Change Target Role"
              >
                <Pencil className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-1">
              <p className="font-display text-xs font-bold text-foreground truncate">{userRole}</p>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Readiness</span>
                <span className="font-semibold text-emerald-400">
                  {readiness > 0 ? `${readiness}%` : "--"}
                </span>
              </div>
              <Progress value={readiness} className="h-1.5 bg-secondary/80" />
            </div>
          </div>
        </div>
      )}

      {/* Categorized Nav List */}
      <nav className="flex-1 space-y-4 overflow-y-auto p-3" aria-label="Main menu">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!collapsed && (
              <h4 className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-1">
                {section.title}
              </h4>
            )}
            {section.items.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? location.pathname === "/dashboard"
                  : location.pathname.startsWith(item.href);
              return (
                <NavItem
                  key={item.href}
                  item={item}
                  isActive={isActive}
                  collapsed={collapsed}
                />
              );
            })}
          </div>
        ))}

        {/* Admin Governance Link (Visible to Admin / Super Admin) */}
        {(user?.role === "admin" || user?.role === "super_admin") && (
          <div className="space-y-1 pt-2 border-t border-border/40">
            {!collapsed && (
              <h4 className="px-3 text-[10px] font-bold uppercase tracking-wider text-amber-500/90 mb-1 flex items-center gap-1.5">
                <Shield className="h-3 w-3" />
                <span>GOVERNANCE</span>
              </h4>
            )}
            <NavItem
              item={{
                title: "Admin Center",
                href: "/admin",
                icon: Shield,
                badge: user?.role === "super_admin" ? "SUPER" : "ADMIN",
                badgeVariant: "ai",
              }}
              isActive={location.pathname.startsWith("/admin")}
              collapsed={collapsed}
            />
          </div>
        )}
      </nav>

      {/* User Profile Card & Footer */}
      <div className="border-t border-border/70 p-3 space-y-2">
        {!collapsed ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-secondary/30 p-2.5">
            <Link to="/profile" className="flex items-center gap-2.5 min-w-0 flex-1 group">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-xs border border-primary/30">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {userName}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{userRole}</p>
              </div>
            </Link>

            <button
              onClick={logout}
              className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-secondary transition-colors"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Link
              to="/profile"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold"
              title="Profile"
            >
              {userName.charAt(0).toUpperCase()}
            </Link>
            <button
              onClick={logout}
              className="text-muted-foreground hover:text-destructive p-2 rounded-lg hover:bg-secondary transition-colors"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
});
