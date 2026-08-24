import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminService } from "@/services/adminService";
import { queryKeys } from "@/lib/queryKeys";
import { SystemHealthPanel } from "@/components/admin/SystemHealthPanel";

export function AdminSystemPage() {
  const queryClient = useQueryClient();

  const { data: health, isLoading } = useQuery({
    queryKey: queryKeys.admin.systemHealth,
    queryFn: () => adminService.getSystemHealth(),
    refetchInterval: 10000,
  });

  return (
    <div className="flex flex-col gap-6">
      <SystemHealthPanel
        health={health || null}
        isLoading={isLoading}
        onRefresh={() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.admin.systemHealth });
        }}
      />
    </div>
  );
}
