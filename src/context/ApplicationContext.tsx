import React, { createContext, useContext, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import {
  applicationTrackerService,
  type JobApplication,
  type JobApplicationStats,
  type CompanyIntelligence,
  type InterviewDebrief,
  type OutcomeLearningInsight,
} from "@/services/applicationTrackerService";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";

interface ApplicationContextValue {
  applications: JobApplication[];
  stats: JobApplicationStats;
  outcomeInsights: OutcomeLearningInsight[];
  isLoading: boolean;
  isError: boolean;
  createApplication: (payload: Partial<JobApplication>) => Promise<JobApplication>;
  transitionStage: (id: string, stage: string, note?: string) => Promise<void>;
  updateApplication: (id: string, payload: Partial<JobApplication>) => Promise<void>;
  deleteApplication: (id: string) => Promise<void>;
  logDebrief: (applicationId: string, payload: Partial<InterviewDebrief>) => Promise<InterviewDebrief>;
  fetchCompanyIntelligence: (companyName: string) => Promise<CompanyIntelligence>;
}

const EMPTY_STATS: JobApplicationStats = {
  total_active: 0,
  wishlist_count: 0,
  applied_count: 0,
  screening_count: 0,
  interviewing_count: 0,
  offer_count: 0,
  closed_count: 0,
  conversion_rate: 0,
  average_response_days: 0,
  stage_breakdown: { wishlist: 0, applied: 0, screening: 0, interviewing: 0, offer: 0, closed: 0 },
};

const ApplicationContext = createContext<ApplicationContextValue | undefined>(undefined);

export function ApplicationProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  // 1. Fetch Applications — strictly scoped to authenticated userId
  const {
    data: rawApplications = [],
    isLoading: isAppsLoading,
    isError: isAppsError,
  } = useQuery({
    queryKey: queryKeys.applications.list(userId || ""),
    queryFn: () => applicationTrackerService.getApplications(),
    enabled: Boolean(userId),
    retry: 1,
    staleTime: 2 * 60 * 1000,
  });

  // 2. Fetch Stats
  const { data: stats = EMPTY_STATS } = useQuery({
    queryKey: queryKeys.applications.stats(userId || ""),
    queryFn: () => applicationTrackerService.getStats(),
    enabled: Boolean(userId),
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  // 3. Fetch Outcome Insights
  const { data: outcomeInsights = [] } = useQuery({
    queryKey: queryKeys.applications.outcomeInsights(userId || ""),
    queryFn: () => applicationTrackerService.getOutcomeInsights(),
    enabled: Boolean(userId),
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const applications = useMemo(() => {
    return rawApplications || [];
  }, [rawApplications]);

  // 4. Create Mutation
  const createMutation = useMutation({
    mutationFn: (payload: Partial<JobApplication>) =>
      applicationTrackerService.createApplication(payload),
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.applications.all(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.activity.all(userId) });
      }
      toast.success("Application tracked successfully! 📋");
    },
  });

  // 5. Stage Transition Mutation (with Optimistic Updates)
  const transitionMutation = useMutation({
    mutationFn: ({ id, stage, note }: { id: string; stage: string; note?: string }) =>
      applicationTrackerService.transitionStage(id, stage, note),
    onMutate: async ({ id, stage }) => {
      if (!userId) return { previousApps: applications };

      const listKey = queryKeys.applications.list(userId);
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousApps = queryClient.getQueryData<JobApplication[]>(listKey) || applications;

      // Optimistically update
      const updated = previousApps.map((app) =>
        app.id === id ? { ...app, stage, last_status_change: new Date().toISOString() } : app
      );
      queryClient.setQueryData(listKey, updated);

      return { previousApps };
    },
    onError: (_err, _variables, context) => {
      if (userId && context?.previousApps) {
        queryClient.setQueryData(queryKeys.applications.list(userId), context.previousApps);
      }
      toast.error("Failed to update application stage");
    },
    onSettled: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.applications.all(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.activity.all(userId) });
      }
    },
  });

  // 6. Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<JobApplication> }) =>
      applicationTrackerService.updateApplication(id, payload),
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.applications.all(userId) });
      }
      toast.success("Application updated");
    },
  });

  // 7. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => applicationTrackerService.deleteApplication(id),
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.applications.all(userId) });
      }
      toast.info("Application deleted");
    },
  });

  // 8. Debrief Mutation
  const debriefMutation = useMutation({
    mutationFn: ({ applicationId, payload }: { applicationId: string; payload: Partial<InterviewDebrief> }) =>
      applicationTrackerService.createDebrief(applicationId, payload),
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.applications.all(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.intelligence.all(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.activity.all(userId) });
      }
      toast.success("Interview debrief saved & outcome patterns updated! 🧠");
    },
  });

  const createApplication = useCallback(
    async (payload: Partial<JobApplication>) => {
      return await createMutation.mutateAsync(payload);
    },
    [createMutation]
  );

  const transitionStage = useCallback(
    async (id: string, stage: string, note?: string) => {
      await transitionMutation.mutateAsync({ id, stage, note });
    },
    [transitionMutation]
  );

  const updateApplication = useCallback(
    async (id: string, payload: Partial<JobApplication>) => {
      await updateMutation.mutateAsync({ id, payload });
    },
    [updateMutation]
  );

  const deleteApplication = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  const logDebrief = useCallback(
    async (applicationId: string, payload: Partial<InterviewDebrief>) => {
      return await debriefMutation.mutateAsync({ applicationId, payload });
    },
    [debriefMutation]
  );

  const fetchCompanyIntelligence = useCallback(
    async (companyName: string) => {
      return await applicationTrackerService.getCompanyIntelligence(companyName);
    },
    []
  );

  return (
    <ApplicationContext.Provider
      value={{
        applications,
        stats,
        outcomeInsights,
        isLoading: isAppsLoading,
        isError: isAppsError,
        createApplication,
        transitionStage,
        updateApplication,
        deleteApplication,
        logDebrief,
        fetchCompanyIntelligence,
      }}
    >
      {children}
    </ApplicationContext.Provider>
  );
}

export function useApplications() {
  const context = useContext(ApplicationContext);
  if (!context) {
    throw new Error("useApplications must be used within an ApplicationProvider");
  }
  return context;
}
