import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "@/services/adminService";
import { queryKeys } from "@/lib/queryKeys";
import { UserManagementTable } from "@/components/admin/UserManagementTable";
import { UserDetailDrawer } from "@/components/admin/UserDetailDrawer";
import type { AdminUserListItem } from "@/types";

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);

  const filters = {
    page,
    page_size: 15,
    search: searchQuery || undefined,
    role: roleFilter === "all" ? undefined : roleFilter,
    is_suspended: statusFilter === "all" ? undefined : statusFilter === "suspended",
  };

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.admin.users(filters),
    queryFn: () => adminService.getUsers(filters),
  });

  const { data: userDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: queryKeys.admin.user(selectedUser?.id || ""),
    queryFn: () => (selectedUser ? adminService.getUserDetail(selectedUser.id) : null),
    enabled: !!selectedUser,
  });

  const suspendMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      adminService.suspendUser(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (userId: string) => adminService.activateUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard });
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          Candidate & User Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Supervise registered candidates, review readiness scores, manage permissions, and inspect candidate workspaces.
        </p>
      </div>

      <UserManagementTable
        users={data?.users || []}
        isLoading={isLoading}
        page={data?.page || 1}
        totalPages={data?.total_pages || 1}
        onPageChange={setPage}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setPage(1);
        }}
        roleFilter={roleFilter}
        onRoleFilterChange={(r) => {
          setRoleFilter(r);
          setPage(1);
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={(s) => {
          setStatusFilter(s);
          setPage(1);
        }}
        onSelectUser={(u) => setSelectedUser(u)}
        onSuspendUser={async (userId, reason) => {
          await suspendMutation.mutateAsync({ userId, reason });
        }}
        onActivateUser={async (userId) => {
          await activateMutation.mutateAsync(userId);
        }}
      />

      <UserDetailDrawer
        user={userDetail || null}
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        onSuspend={async () => {
          if (selectedUser) {
            await suspendMutation.mutateAsync({ userId: selectedUser.id, reason: "Admin suspension" });
            setSelectedUser(null);
          }
        }}
        onActivate={async () => {
          if (selectedUser) {
            await activateMutation.mutateAsync(selectedUser.id);
            setSelectedUser(null);
          }
        }}
      />
    </div>
  );
}
