import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "@/services/adminService";
import { queryKeys } from "@/lib/queryKeys";
import { FeatureFlagManager } from "@/components/admin/FeatureFlagManager";

export function AdminFeaturesPage() {
  const queryClient = useQueryClient();

  const { data: flags, isLoading } = useQuery({
    queryKey: queryKeys.admin.featureFlags,
    queryFn: () => adminService.getFeatureFlags(),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ flagId, isEnabled }: { flagId: string; isEnabled: boolean }) =>
      adminService.updateFeatureFlag(flagId, { is_enabled: isEnabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.featureFlags });
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: { key: string; name: string; description: string; is_enabled: boolean }) =>
      adminService.createFeatureFlag(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.featureFlags });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (flagId: string) => adminService.deleteFeatureFlag(flagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.featureFlags });
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <FeatureFlagManager
        flags={flags || []}
        isLoading={isLoading}
        onToggleFlag={async (flagId, isEnabled) => {
          await toggleMutation.mutateAsync({ flagId, isEnabled });
        }}
        onCreateFlag={async (payload) => {
          await createMutation.mutateAsync(payload);
        }}
        onDeleteFlag={async (flagId) => {
          await deleteMutation.mutateAsync(flagId);
        }}
      />
    </div>
  );
}
