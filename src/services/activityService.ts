import api from "./api";
import { sessionService } from "./sessionService";
import { telemetryService } from "./telemetryService";
import { getUserStorage, setUserStorage, removeUserStorage } from "@/lib/userStorage";

export type CareerActivityType =
  | "resume_uploaded"
  | "resume_analyzed"
  | "ats_improved"
  | "target_role_updated"
  | "roadmap_milestone_completed"
  | "interview_completed"
  | "job_matched"
  | "resume_tailored";

export interface CareerActivityItem {
  id: string;
  client_event_id?: string;
  type: CareerActivityType;
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

const ACTIVITY_KEY = "career-activities";

export const activityService = {
  getLocalActivities(userId?: string): CareerActivityItem[] {
    if (!userId) return [];
    return getUserStorage<CareerActivityItem[]>(userId, ACTIVITY_KEY, []) || [];
  },

  getActivities(userId?: string): CareerActivityItem[] {
    return this.getLocalActivities(userId);
  },

  async fetchActivities(userId?: string, limit: number = 50): Promise<CareerActivityItem[]> {
    if (!sessionService.getToken() || !userId) {
      return this.getLocalActivities(userId);
    }

    try {
      const res = await api.get("/activity", { params: { limit } });
      if (Array.isArray(res.data)) {
        const mapped: CareerActivityItem[] = res.data.map((item: any) => ({
          id: item.id,
          client_event_id: item.client_event_id,
          type: item.activity_type as CareerActivityType,
          title: item.title,
          description: item.description,
          timestamp: item.created_at,
          metadata: item.activity_metadata,
        }));
        // Update user-scoped local cache
        setUserStorage(userId, ACTIVITY_KEY, mapped);
        return mapped;
      }
    } catch (err) {
      telemetryService.log("API_ERROR", "Failed to fetch activities from server, using local cache", {
        error: String(err),
      });
    }

    return this.getLocalActivities(userId);
  },

  recordActivity(
    type: CareerActivityType,
    title: string,
    description: string,
    metadata?: Record<string, any>,
    userId?: string
  ): CareerActivityItem {
    const clientEventId = `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newActivity: CareerActivityItem = {
      id: clientEventId,
      client_event_id: clientEventId,
      type,
      title,
      description,
      timestamp: new Date().toISOString(),
      metadata,
    };

    // 1. Immediately update user-scoped storage for instant UI response
    if (userId) {
      const current = this.getLocalActivities(userId);
      const updated = [newActivity, ...current].slice(0, 50);
      setUserStorage(userId, ACTIVITY_KEY, updated);
    }

    // 2. Asynchronously persist to backend if authenticated
    if (sessionService.getToken()) {
      api
        .post("/activity", {
          client_event_id: clientEventId,
          activity_type: type,
          title,
          description,
          activity_metadata: metadata || {},
        })
        .catch((err) => {
          telemetryService.log("API_ERROR", "Failed to sync activity to server", {
            error: String(err),
            clientEventId,
          });
        });
    }

    return newActivity;
  },

  clearActivities(userId?: string): void {
    if (userId) {
      removeUserStorage(userId, ACTIVITY_KEY);
    }

    if (sessionService.getToken()) {
      api.delete("/activity").catch(() => {});
    }
  },
};
