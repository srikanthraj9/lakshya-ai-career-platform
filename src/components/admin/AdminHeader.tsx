import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Menu, Shield, ArrowUpRight, Activity, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { adminService } from "@/services/adminService";
import { queryKeys } from "@/lib/queryKeys";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AdminHeaderProps {
  onOpenMobileMenu: () => void;
}

export function AdminHeader({ onOpenMobileMenu }: AdminHeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/login");
    }
  };

  const { data: health, isLoading: healthLoading, isError: healthError } = useQuery({
    queryKey: queryKeys.admin.systemHealth,
    queryFn: () => adminService.getSystemHealth(),
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const isDegraded = health?.status === "degraded";
  const isUnhealthy = healthError || health?.status === "unhealthy";
  const pingColor = isUnhealthy
    ? "bg-rose-400"
    : isDegraded
    ? "bg-amber-400"
    : "bg-emerald-400";
  const dotColor = isUnhealthy
    ? "bg-rose-500"
    : isDegraded
    ? "bg-amber-500"
    : "bg-emerald-500";
  const textColor = isUnhealthy
    ? "text-rose-500"
    : isDegraded
    ? "text-amber-500"
    : "text-emerald-500";
  const statusLabel = healthLoading
    ? "Checking..."
    : isUnhealthy
    ? "System Alert"
    : isDegraded
    ? "Degraded"
    : "Operational";

  const roleLabel = user?.role === "super_admin" ? "SUPER ADMIN" : "ADMIN";

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/50 bg-background/80 px-4 sm:px-6 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-9 w-9 text-muted-foreground"
          onClick={onOpenMobileMenu}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open navigation drawer</span>
        </Button>

        {/* Live Platform Status Indicator */}
        <Link to="/admin/system" className="hover:opacity-85 transition-opacity">
          <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${pingColor} opacity-75`} />
              <span className={`relative inline-flex h-2 w-2 rounded-full ${dotColor}`} />
            </span>
            <span className="font-semibold text-foreground hidden sm:inline">Platform Status:</span>
            <span className={`font-medium text-xs ${textColor}`}>{statusLabel}</span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {/* Switch to Candidate Workspace */}
        <Link to="/dashboard">
          <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2 h-9 text-xs">
            <span>Candidate Workspace</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </Link>

        {/* Admin Profile Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2.5 rounded-full border border-border/60 bg-card/60 p-1 pr-2.5 text-left transition-all hover:border-primary/40 hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              aria-label="Super Admin account menu"
              title="Super Admin account menu"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                {user?.full_name?.charAt(0) || user?.email?.charAt(0) || "A"}
              </div>
              <div className="flex flex-col text-left hidden md:flex">
                <span className="text-xs font-semibold text-foreground leading-none">
                  {user?.full_name || "Admin"}
                </span>
                <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                  {user?.email}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-0.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-64 rounded-2xl border-border/60 bg-card/95 backdrop-blur-xl p-2 shadow-xl"
          >
            {/* Identity Summary */}
            <DropdownMenuLabel className="font-normal px-2 py-2">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    {user?.full_name || "Platform Admin"}
                  </span>
                  <Badge
                    variant="outline"
                    className="border-primary/30 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider px-1.5 py-0"
                  >
                    {roleLabel}
                  </Badge>
                </div>
                <span className="text-[11px] text-muted-foreground break-all">
                  {user?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/50 my-1" />

            {/* Candidate Workspace Navigation */}
            <DropdownMenuItem asChild className="rounded-xl px-2.5 py-2 cursor-pointer focus:bg-accent">
              <Link to="/dashboard" className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2.5 text-xs text-foreground font-medium">
                  <ArrowUpRight className="h-4 w-4 text-primary" />
                  <span>Candidate Workspace</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Exit Admin</span>
              </Link>
            </DropdownMenuItem>

            {/* System Diagnostics Navigation */}
            <DropdownMenuItem asChild className="rounded-xl px-2.5 py-2 cursor-pointer focus:bg-accent">
              <Link to="/admin/system" className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2.5 text-xs text-foreground font-medium">
                  <Activity className="h-4 w-4 text-emerald-500" />
                  <span>System Diagnostics</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{statusLabel}</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-border/50 my-1" />

            {/* Secure Logout Action */}
            <DropdownMenuItem
              className="rounded-xl px-2.5 py-2 text-xs font-semibold text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer flex items-center gap-2.5"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
