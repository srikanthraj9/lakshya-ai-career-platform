import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Briefcase,
  Bot,
  Kanban,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  { title: "Home", href: "/dashboard", icon: LayoutDashboard },
  { title: "Resume", href: "/resume", icon: FileText },
  { title: "Pipeline", href: "/applications", icon: Kanban },
  { title: "Jobs", href: "/jobs", icon: Briefcase },
  { title: "Copilot", href: "/copilot", icon: Bot },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex h-16 w-full items-center justify-around border-t border-border/80 bg-background/95 px-2 backdrop-blur-2xl md:hidden"
      role="navigation"
      aria-label="Mobile bottom navigation"
    >
      {mobileNavItems.map((item) => {
        const isActive = location.pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-medium transition-all",
              isActive
                ? "text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="relative">
              <item.icon className={cn("h-5 w-5", isActive && "scale-110 text-primary")} />
              {isActive && (
                <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
              )}
            </div>
            <span>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
