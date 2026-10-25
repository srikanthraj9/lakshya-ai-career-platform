import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCircle2,
  CheckCheck,
  Trash2,
  RefreshCw,
  Sparkles,
  Briefcase,
  FileText,
  Mic,
  Map,
  Shield,
  Award,
  ExternalLink,
  Filter,
  Check,
  Undo2,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useNotifications } from "@/context/NotificationContext";
import { formatChartDate } from "@/lib/careerMetrics";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { NotificationType, CareerNotification } from "@/services/notificationService";

type CategoryFilter =
  | "all"
  | "job_search"
  | "interview"
  | "roadmap"
  | "resume"
  | "intelligence"
  | "skills"
  | "account";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAsUnread,
    deleteNotification,
    markAllAsRead,
    clearAll,
    refreshNotifications,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshNotifications();
      toast.success("Notifications refreshed");
    } catch {
      toast.error("Failed to refresh notifications");
    } finally {
      setIsRefreshing(false);
    }
  };

  const mapTypeToCategory = (type: NotificationType): CategoryFilter => {
    switch (type) {
      case "job_match":
      case "application_update":
        return "job_search";
      case "interview_practice":
      case "interview_completed":
        return "interview";
      case "roadmap_reminder":
      case "roadmap_milestone":
        return "roadmap";
      case "ats_score":
      case "resume_analyzed":
        return "resume";
      case "career_insight":
      case "skill_gap":
        return "intelligence";
      case "skill_added":
      case "credential_verified":
      case "profile_milestone":
        return "skills";
      case "account_security":
      case "email_verified":
      case "system":
      default:
        return "account";
    }
  };

  const getCategoryLabel = (cat: CategoryFilter): string => {
    switch (cat) {
      case "job_search":
        return "Job Search";
      case "interview":
        return "Interview Studio";
      case "roadmap":
        return "Career Roadmap";
      case "resume":
        return "Resume Studio";
      case "intelligence":
        return "Career Intelligence";
      case "skills":
        return "Skill Passport";
      case "account":
        return "Account & System";
      default:
        return "All Categories";
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "job_match":
      case "application_update":
        return <Briefcase className="h-4 w-4 text-emerald-400" />;
      case "interview_practice":
      case "interview_completed":
        return <Mic className="h-4 w-4 text-purple-400" />;
      case "roadmap_reminder":
      case "roadmap_milestone":
        return <Map className="h-4 w-4 text-cyan-400" />;
      case "ats_score":
      case "resume_analyzed":
        return <FileText className="h-4 w-4 text-blue-400" />;
      case "career_insight":
      case "skill_gap":
        return <Sparkles className="h-4 w-4 text-amber-400" />;
      case "skill_added":
      case "credential_verified":
      case "profile_milestone":
        return <Award className="h-4 w-4 text-emerald-400" />;
      case "account_security":
      case "email_verified":
      case "system":
      default:
        return <Shield className="h-4 w-4 text-primary" />;
    }
  };

  // Filter list by read status and category
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      if (activeTab === "unread" && notif.isRead) return false;
      if (selectedCategory !== "all" && mapTypeToCategory(notif.type) !== selectedCategory) {
        return false;
      }
      return true;
    });
  }, [notifications, activeTab, selectedCategory]);

  // Date grouping: Today, Yesterday, Earlier
  const groupedNotifications = useMemo(() => {
    const today: CareerNotification[] = [];
    const yesterday: CareerNotification[] = [];
    const earlier: CareerNotification[] = [];

    const now = new Date();
    const todayDate = now.toDateString();
    const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString();

    filteredNotifications.forEach((n) => {
      const d = new Date(n.timestamp);
      const notifDate = d.toDateString();
      if (notifDate === todayDate) {
        today.push(n);
      } else if (notifDate === yesterdayDate) {
        yesterday.push(n);
      } else {
        earlier.push(n);
      }
    });

    return { today, yesterday, earlier };
  }, [filteredNotifications]);

  const handleCardClick = (notification: CareerNotification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    if (notification.actionHref) {
      navigate(notification.actionHref);
    }
  };

  const categoriesList: CategoryFilter[] = [
    "all",
    "job_search",
    "interview",
    "roadmap",
    "resume",
    "intelligence",
    "skills",
    "account",
  ];

  return (
    <PageTransition>
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 border border-primary/25 text-primary shadow-sm">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                  Notifications & Activity
                </h1>
                <p className="text-xs text-muted-foreground">
                  Stay on top of your career progress, applications, and skill milestones
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={isRefreshing || isLoading}
              className="h-8 rounded-xl text-xs gap-1.5 border-border/80"
              aria-label="Refresh notifications"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
              <span>Refresh</span>
            </Button>

            {unreadCount > 0 && (
              <Button
                onClick={() => {
                  markAllAsRead();
                  toast.success("All notifications marked as read");
                }}
                variant="outline"
                size="sm"
                className="h-8 rounded-xl text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark All Read</span>
              </Button>
            )}

            {notifications.length > 0 && (
              <Button
                onClick={() => {
                  clearAll();
                  toast.success("Cleared notifications history");
                }}
                variant="outline"
                size="sm"
                className="h-8 rounded-xl text-xs gap-1.5 border-border/80 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear All</span>
              </Button>
            )}
          </div>
        </div>

        {/* Filter Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Read / Unread Tabs */}
          <div className="inline-flex items-center gap-1 rounded-2xl border border-border/70 bg-secondary/30 p-1 backdrop-blur-xl">
            <button
              onClick={() => setActiveTab("all")}
              className={cn(
                "rounded-xl px-4 py-1.5 text-xs font-semibold transition-all",
                activeTab === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              )}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab("unread")}
              className={cn(
                "rounded-xl px-4 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5",
                activeTab === "unread"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              )}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            {categoriesList.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-all whitespace-nowrap border",
                  selectedCategory === cat
                    ? "border-primary/50 bg-primary/15 text-primary font-semibold"
                    : "border-border/60 bg-secondary/20 text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                {getCategoryLabel(cat)}
              </button>
            ))}
          </div>
        </div>

        {/* Notification List by Date Groups */}
        {filteredNotifications.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center space-y-4 border border-dashed border-border/80">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/50 border border-border text-muted-foreground">
              <Bell className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-base font-bold text-foreground">
                No notifications found
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {activeTab === "unread"
                  ? "You have caught up with all your career updates! Check back as you make progress."
                  : "No career activity alerts yet. Complete an interview practice session or analyze a resume to receive real-time updates."}
              </p>
            </div>
            {activeTab === "unread" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("all")}
                className="rounded-xl text-xs"
              >
                View All Notifications
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Today Group */}
            {groupedNotifications.today.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  <span>Today</span>
                </div>
                <div className="space-y-2.5">
                  {groupedNotifications.today.map((notif) => (
                    <NotificationItemCard
                      key={notif.id}
                      notification={notif}
                      onCardClick={() => handleCardClick(notif)}
                      onMarkRead={() => markAsRead(notif.id)}
                      onMarkUnread={() => markAsUnread(notif.id)}
                      onDelete={() => deleteNotification(notif.id)}
                      getIcon={getNotificationIcon}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Yesterday Group */}
            {groupedNotifications.yesterday.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  <span>Yesterday</span>
                </div>
                <div className="space-y-2.5">
                  {groupedNotifications.yesterday.map((notif) => (
                    <NotificationItemCard
                      key={notif.id}
                      notification={notif}
                      onCardClick={() => handleCardClick(notif)}
                      onMarkRead={() => markAsRead(notif.id)}
                      onMarkUnread={() => markAsUnread(notif.id)}
                      onDelete={() => deleteNotification(notif.id)}
                      getIcon={getNotificationIcon}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Earlier Group */}
            {groupedNotifications.earlier.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  <span>Earlier</span>
                </div>
                <div className="space-y-2.5">
                  {groupedNotifications.earlier.map((notif) => (
                    <NotificationItemCard
                      key={notif.id}
                      notification={notif}
                      onCardClick={() => handleCardClick(notif)}
                      onMarkRead={() => markAsRead(notif.id)}
                      onMarkUnread={() => markAsUnread(notif.id)}
                      onDelete={() => deleteNotification(notif.id)}
                      getIcon={getNotificationIcon}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageTransition>
  );
}

interface NotificationItemCardProps {
  notification: CareerNotification;
  onCardClick: () => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onDelete: () => void;
  getIcon: (type: NotificationType) => React.ReactNode;
}

function NotificationItemCard({
  notification,
  onCardClick,
  onMarkRead,
  onMarkUnread,
  onDelete,
  getIcon,
}: NotificationItemCardProps) {
  return (
    <div
      onClick={onCardClick}
      className={cn(
        "group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all duration-200 cursor-pointer",
        notification.isRead
          ? "border-border/60 bg-card/60 hover:bg-secondary/40 text-muted-foreground"
          : "border-primary/40 bg-primary/[0.04] hover:bg-primary/[0.08] shadow-sm text-foreground"
      )}
    >
      <div className="flex items-start gap-3.5 min-w-0 flex-1">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all",
            notification.isRead
              ? "bg-secondary/60 border-border/80"
              : "bg-primary/15 border-primary/30"
          )}
        >
          {getIcon(notification.type)}
        </div>

        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4
              className={cn(
                "text-sm font-semibold truncate",
                notification.isRead ? "text-foreground/90 font-medium" : "text-foreground font-bold"
              )}
            >
              {notification.title}
            </h4>
            {!notification.isRead && (
              <span className="flex h-2 w-2 rounded-full bg-primary shrink-0" title="Unread" />
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {notification.message}
          </p>
          <div className="flex items-center gap-3 pt-0.5 text-[11px] text-muted-foreground/80">
            <span>{formatChartDate(notification.timestamp)}</span>
            {notification.actionText && (
              <>
                <span>•</span>
                <span className="text-primary font-semibold flex items-center gap-1 group-hover:underline">
                  {notification.actionText}
                  <ExternalLink className="h-3 w-3" />
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div
        className="flex items-center gap-1.5 self-end sm:self-center shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {notification.isRead ? (
          <Button
            onClick={onMarkUnread}
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            title="Mark as unread"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            onClick={onMarkRead}
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-primary hover:bg-primary/10"
            title="Mark as read"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}

        <Button
          onClick={onDelete}
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          title="Delete notification"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
