import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "./AuthContext";
import {
  activityService,
  type CareerActivityItem,
  type CareerActivityType,
} from "@/services/activityService";

interface ActivityContextType {
  activities: CareerActivityItem[];
  recordActivity: (
    type: CareerActivityType,
    title: string,
    description: string,
    metadata?: Record<string, any>
  ) => void;
  clearActivities: () => void;
}

const ActivityContext = createContext<ActivityContextType | null>(null);

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;

  const [activities, setActivities] = useState<CareerActivityItem[]>(() =>
    activityService.getActivities(userId)
  );

  useEffect(() => {
    if (userId) {
      activityService.fetchActivities(userId).then(setActivities);
    } else {
      setActivities([]);
    }
  }, [userId]);

  const recordActivity = useCallback(
    (
      type: CareerActivityType,
      title: string,
      description: string,
      metadata?: Record<string, any>
    ) => {
      const item = activityService.recordActivity(type, title, description, metadata, userId);
      setActivities((prev) => [item, ...prev].slice(0, 50));
    },
    [userId]
  );

  const clearActivities = useCallback(() => {
    activityService.clearActivities(userId);
    setActivities([]);
  }, [userId]);

  const value = useMemo(
    () => ({
      activities,
      recordActivity,
      clearActivities,
    }),
    [activities, recordActivity, clearActivities]
  );

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>;
}

export function useActivity(): ActivityContextType {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error("useActivity must be used within an ActivityProvider");
  }
  return context;
}
