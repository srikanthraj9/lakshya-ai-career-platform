import React from "react";
import { Link } from "react-router-dom";
import { Menu, Shield, ArrowUpRight, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";

interface AdminHeaderProps {
  onOpenMobileMenu: () => void;
}

export function AdminHeader({ onOpenMobileMenu }: AdminHeaderProps) {
  const { user } = useAuth();

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

        {/* Platform Status Indicator */}
        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="font-semibold text-foreground hidden sm:inline">Platform Status:</span>
          <span className="text-emerald-500 font-medium text-xs">Operational</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Switch to Candidate Workspace */}
        <Link to="/dashboard">
          <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2 h-9 text-xs">
            <span>Candidate Workspace</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </Link>

        {/* Admin Profile Pill */}
        <div className="flex items-center gap-2.5 rounded-full border border-border/60 bg-card/60 p-1 pr-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
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
        </div>
      </div>
    </header>
  );
}
