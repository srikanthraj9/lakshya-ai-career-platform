import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Cpu,
  Flag,
  Megaphone,
  Activity,
  AlertTriangle,
  ShieldCheck,
  ArrowUpRight,
  LogOut,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { adminService } from "@/services/adminService";
import { queryKeys } from "@/lib/queryKeys";

interface AdminSidebarProps {
  onClose?: () => void;
}

export function AdminSidebar({ onClose }: AdminSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const handleLogout = async () => {
    if (onClose) onClose();
    try {
      await logout();
    } finally {
      navigate("/login");
    }
  };

  const { data: alertSummary } = useQuery({
    queryKey: queryKeys.admin.alertsSummary,
    queryFn: () => adminService.getOperationalAlertsSummary(),
    refetchInterval: 30000,
  });

  const openCount = alertSummary?.open_count ?? 0;

  const navItems = [
    {
      title: "Overview",
      href: "/admin",
      icon: LayoutDashboard,
      badge: "Live",
    },
    {
      title: "Alert Center",
      href: "/admin/alerts",
      icon: AlertTriangle,
      badge: openCount > 0 ? `${openCount}` : undefined,
      badgeVariant: "destructive" as const,
    },
    {
      title: "User Management",
      href: "/admin/users",
      icon: Users,
    },
    {
      title: "Platform Analytics",
      href: "/admin/analytics",
      icon: BarChart3,
    },
    {
      title: "AI Usage & Telemetry",
      href: "/admin/ai",
      icon: Cpu,
    },
    {
      title: "Feature Flags",
      href: "/admin/features",
      icon: Flag,
    },
    {
      title: "Announcements",
      href: "/admin/announcements",
      icon: Megaphone,
    },
    {
      title: "System Health",
      href: "/admin/system",
      icon: Activity,
    },
    {
      title: "Governance & Audit",
      href: "/admin/audit",
      icon: ShieldCheck,
    },
    ...(isSuperAdmin
      ? [
          {
            title: "Database Explorer",
            href: "/admin/database",
            icon: Database,
            badge: "Super",
          },
        ]
      : []),
  ];

  const roleLabel = user?.role === "super_admin" ? "SUPER ADMIN" : "ADMIN";

  return (
    <aside className="flex h-full w-full flex-col justify-between border-r border-border/50 bg-card/60 backdrop-blur-xl px-4 py-5">
      <div className="flex flex-col gap-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2">
          <Link
            to="/admin"
            className="flex items-center gap-3 transition-transform active:scale-95"
            onClick={onClose}
            aria-label="Lakshya Control Platform Admin Overview"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-primary to-purple-600 shadow-md shadow-primary/20">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-foreground text-base">
                Lakshya <span className="text-primary font-black">Control</span>
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                Platform Admin
              </span>
            </div>
          </Link>
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/10 text-primary text-[10px] font-bold tracking-wider uppercase px-2 py-0.5"
          >
            {roleLabel}
          </Badge>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1" aria-label="Platform administration navigation">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? location.pathname === "/admin"
                : location.pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onClose}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 font-semibold"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground active:scale-[0.98]"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-transform",
                      isActive ? "text-primary-foreground" : "text-muted-foreground"
                    )}
                  />
                  <span>{item.title}</span>
                </div>
                {item.badge && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] font-bold px-1.5 py-0 h-4 border-none",
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : (item as any).badgeVariant === "destructive"
                        ? "bg-red-500/15 text-red-500 animate-pulse"
                        : "bg-emerald-500/10 text-emerald-500"
                    )}
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Return to Candidate Workspace & Logout */}
      <div className="flex flex-col gap-2 pt-4 border-t border-border/40">
        <Link
          to="/dashboard"
          onClick={onClose}
          className="flex items-center justify-between rounded-xl border border-border/60 bg-accent/40 px-3.5 py-2.5 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <span className="flex items-center gap-2">
            <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
            Candidate Workspace
          </span>
          <span className="text-[10px] text-muted-foreground">Exit Admin</span>
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center justify-between rounded-xl border border-transparent px-3.5 py-2 text-xs font-medium text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive active:scale-[0.98] cursor-pointer"
          aria-label="Log Out"
          title="Log Out of Admin Control Center"
        >
          <span className="flex items-center gap-2">
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </span>
          <span className="text-[10px] font-mono opacity-60">Session</span>
        </button>
      </div>
    </aside>
  );
}
