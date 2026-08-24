import api from "./api";
import { sessionService } from "./sessionService";
import { telemetryService } from "./telemetryService";
import { getUserStorage, setUserStorage, removeUserStorage } from "@/lib/userStorage";

export type NotificationType =
  | "ats_score"
  | "job_match"
  | "roadmap_reminder"
  | "interview_practice"
  | "career_insight"
  | "system";

export interface CareerNotification {
  id: string;
  client_event_id?: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionHref?: string;
  actionText?: string;
}

const NOTIFICATION_KEY = "career-notifications";

export const notificationService = {
  getLocalNotifications(userId?: string): CareerNotification[] {
    if (!userId) return [];
    return getUserStorage<CareerNotification[]>(userId, NOTIFICATION_KEY, []) || [];
  },

  getNotifications(userId?: string): CareerNotification[] {
    return this.getLocalNotifications(userId);
  },

  async fetchNotifications(userId?: string, limit: number = 30): Promise<CareerNotification[]> {
    if (!sessionService.getToken() || !userId) {
      return this.getLocalNotifications(userId);
    }

    try {
      const res = await api.get("/notifications", { params: { limit } });
      if (Array.isArray(res.data)) {
        const mapped: CareerNotification[] = res.data.map((item: any) => ({
          id: item.id,
          client_event_id: item.client_event_id,
          type: item.type as NotificationType,
          title: item.title,
          message: item.message,
          timestamp: item.created_at,
          isRead: Boolean(item.is_read),
          actionHref: item.action_url || undefined,
          actionText: item.action_text || undefined,
        }));
        setUserStorage(userId, NOTIFICATION_KEY, mapped);
        return mapped;
      }
    } catch (err) {
      telemetryService.log("API_ERROR", "Failed to fetch notifications from server", {
        error: String(err),
      });
    }

    return this.getLocalNotifications(userId);
  },

  addNotification(
    type: NotificationType,
    title: string,
    message: string,
    actionHref?: string,
    actionText?: string,
    userId?: string
  ): CareerNotification {
    const clientEventId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newNotif: CareerNotification = {
      id: clientEventId,
      client_event_id: clientEventId,
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      isRead: false,
      actionHref,
      actionText,
    };

    if (userId) {
      const current = this.getLocalNotifications(userId);
      const updated = [newNotif, ...current].slice(0, 30);
      setUserStorage(userId, NOTIFICATION_KEY, updated);
    }

    if (sessionService.getToken()) {
      api
        .post("/notifications", {
          client_event_id: clientEventId,
          type,
          title,
          message,
          action_url: actionHref,
          action_text: actionText,
        })
        .catch(() => {});
    }

    return newNotif;
  },

  markAsRead(id: string, userId?: string): void {
    if (userId) {
      const current = this.getLocalNotifications(userId);
      const updated = current.map((n) => (n.id === id ? { ...n, isRead: true } : n));
      setUserStorage(userId, NOTIFICATION_KEY, updated);
    }

    if (sessionService.getToken()) {
      api.patch(`/notifications/${id}/read`).catch(() => {});
    }
  },

  markAllAsRead(userId?: string): void {
    if (userId) {
      const current = this.getLocalNotifications(userId);
      const updated = current.map((n) => ({ ...n, isRead: true }));
      setUserStorage(userId, NOTIFICATION_KEY, updated);
    }

    if (sessionService.getToken()) {
      api.patch("/notifications/read-all").catch(() => {});
    }
  },

  clearAll(userId?: string): void {
    if (userId) {
      removeUserStorage(userId, NOTIFICATION_KEY);
    }

    if (sessionService.getToken()) {
      api.delete("/notifications").catch(() => {});
    }
  },
};
