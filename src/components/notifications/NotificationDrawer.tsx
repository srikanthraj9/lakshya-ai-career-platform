import React from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  X,
  Check,
  Trash2,
  Sparkles,
  Briefcase,
  FileText,
  Mic,
  Map,
  ArrowRight,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useNotifications } from "@/context/NotificationContext";
import { formatChartDate } from "@/lib/careerMetrics";

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case "job_match":
        return <Briefcase className="h-4 w-4 text-emerald-400" />;
      case "ats_score":
        return <FileText className="h-4 w-4 text-primary" />;
      case "interview_practice":
        return <Mic className="h-4 w-4 text-accent" />;
      case "roadmap_reminder":
        return <Map className="h-4 w-4 text-cyan-400" />;
      default:
        return <Sparkles className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-200">
      <div className="w-full max-w-md bg-card border-l border-border h-full flex flex-col justify-between p-6 shadow-2xl overflow-y-auto space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-display text-sm font-bold text-foreground">Career Notifications</h3>
                <p className="text-[11px] text-muted-foreground">{unreadCount} Unread Alerts</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Actions Bar */}
          {notifications.length > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <button
                onClick={markAllAsRead}
                className="hover:text-primary transition-colors flex items-center gap-1 font-medium"
              >
                <Check className="h-3 w-3" /> Mark all read
              </button>
              <button
                onClick={clearAll}
                className="hover:text-destructive transition-colors flex items-center gap-1 font-medium"
              >
                <Trash2 className="h-3 w-3" /> Clear all
              </button>
            </div>
          )}

          {/* Notification Items List */}
          <div className="space-y-3 pt-2">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
                <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                <p>No new notifications at this time.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                    n.isRead
                      ? "border-border/50 bg-secondary/20 opacity-80"
                      : "border-primary/40 bg-secondary/40 shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-secondary/80 border border-border/60">
                        {getIcon(n.type)}
                      </div>
                      <h4 className="font-display text-xs font-bold text-foreground">{n.title}</h4>
                    </div>

                    {!n.isRead && (
                      <span className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0 mt-1" />
                    )}
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed pl-7">{n.message}</p>

                  <div className="flex items-center justify-between pl-7 pt-1 text-[10px]">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" /> {formatChartDate(n.timestamp)}
                    </span>

                    {n.actionHref && (
                      <Link
                        to={n.actionHref}
                        onClick={onClose}
                        className="text-primary hover:underline font-semibold flex items-center gap-0.5"
                      >
                        <span>{n.actionText || "View"}</span>
                        <ArrowRight className="h-2.5 w-2.5" />
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-border/50 text-center">
          <p className="text-[10px] text-muted-foreground">
            Lakshya AI autonomously evaluates your career roadmap and opportunities
          </p>
        </div>
      </div>
    </div>
  );
}
