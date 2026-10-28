import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "@/services/adminService";
import { queryKeys } from "@/lib/queryKeys";
import { AnnouncementManager } from "@/components/admin/AnnouncementManager";

export function AdminAnnouncementsPage() {
  const queryClient = useQueryClient();

  const { data: announcements, isLoading } = useQuery({
    queryKey: queryKeys.admin.announcements,
    queryFn: () => adminService.getAnnouncements(),
  });

  const createMutation = useMutation({
    mutationFn: (payload: {
      title: string;
      message: string;
      type: string;
      target_audience: string;
      is_active?: boolean;
      expires_at?: string | null;
    }) => adminService.createAnnouncement(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.announcements });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: {
        title?: string;
        message?: string;
        type?: string;
        target_audience?: string;
        is_active?: boolean;
        expires_at?: string | null;
      };
    }) => adminService.updateAnnouncement(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.announcements });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminService.deleteAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.announcements });
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <AnnouncementManager
        announcements={announcements || []}
        isLoading={isLoading}
        onCreateAnnouncement={async (payload) => {
          await createMutation.mutateAsync(payload);
        }}
        onUpdateAnnouncement={async (id, payload) => {
          await updateMutation.mutateAsync({ id, payload });
        }}
        onDeleteAnnouncement={async (id) => {
          await deleteMutation.mutateAsync(id);
        }}
      />
    </div>
  );
}
