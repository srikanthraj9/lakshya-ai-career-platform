import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminService } from "@/services/adminService";
import { queryKeys } from "@/lib/queryKeys";
import { UserManagementTable } from "@/components/admin/UserManagementTable";
import { UserDetailDrawer } from "@/components/admin/UserDetailDrawer";
import type { AdminUserListItem } from "@/types";

const VALID_ROLES = new Set(["user", "admin", "super_admin"]);
const VALID_STATUSES = new Set(["active", "suspended"]);

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // 1. Read & validate parameters from URL
  const rawRole = searchParams.get("role") || "all";
  const roleFilter = VALID_ROLES.has(rawRole) ? rawRole : "all";

  const rawStatus = searchParams.get("status") || "all";
  const statusFilter = VALID_STATUSES.has(rawStatus) ? rawStatus : "all";

  const urlSearch = searchParams.get("search") || searchParams.get("q") || "";
  const [searchQuery, setSearchQuery] = useState(urlSearch);

  const rawPage = parseInt(searchParams.get("page") || "1", 10);
  const page = !isNaN(rawPage) && rawPage > 0 ? rawPage : 1;

  const sortBy = searchParams.get("sort_by") || "created_at";
  const sortOrder = (searchParams.get("sort_order") === "asc" ? "asc" : "desc") as "asc" | "desc";

  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);

  // 2. Keep local search input synchronized if URL parameter changed externally
  useEffect(() => {
    setSearchQuery(urlSearch);
  }, [urlSearch]);

  // 3. Helper to update search params while preserving existing unrelated params
  const updateUrlParams = useCallback(
    (updates: Record<string, string | number | undefined | null>) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, val]) => {
        if (
          val === undefined ||
          val === null ||
          val === "" ||
          val === "all" ||
          (key === "page" && Number(val) <= 1)
        ) {
          next.delete(key);
        } else {
          next.set(key, String(val));
        }
      });
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  // 4. Debounce local search input typing to URL
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentParam = searchParams.get("search") || searchParams.get("q") || "";
      if (searchQuery.trim() !== currentParam.trim()) {
        updateUrlParams({
          search: searchQuery.trim() || undefined,
          page: 1,
        });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchParams, updateUrlParams]);

  // 5. Reset all filters and remove query parameters
  const handleResetFilters = useCallback(() => {
    setSearchQuery("");
    const next = new URLSearchParams(searchParams);
    next.delete("role");
    next.delete("status");
    next.delete("search");
    next.delete("q");
    next.delete("page");
    next.delete("sort_by");
    next.delete("sort_order");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleSortChange = useCallback((field: string) => {
    if (sortBy === field) {
      updateUrlParams({
        sort_by: field,
        sort_order: sortOrder === "asc" ? "desc" : "asc",
        page: 1,
      });
    } else {
      updateUrlParams({
        sort_by: field,
        sort_order: "asc",
        page: 1,
      });
    }
  }, [sortBy, sortOrder, updateUrlParams]);

  // 6. Build query filters based on validated state
  const filters = useMemo(
    () => ({
      page,
      page_size: 15,
      search: searchQuery.trim() || undefined,
      role: roleFilter === "all" ? undefined : roleFilter,
      is_suspended: statusFilter === "all" ? undefined : statusFilter === "suspended",
      sort_by: sortBy,
      sort_order: sortOrder,
    }),
    [page, searchQuery, roleFilter, statusFilter, sortBy, sortOrder]
  );

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.admin.users(filters),
    queryFn: () => adminService.getUsers(filters),
  });

  const { data: userDetail } = useQuery({
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
      toast.success("User suspended successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to suspend user");
    },
  });

  const activateMutation = useMutation({
    mutationFn: (userId: string) => adminService.activateUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard });
      toast.success("User activated successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to activate user");
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: ({
      userIds,
      action,
      reason,
    }: {
      userIds: string[];
      action: "suspend" | "activate";
      reason?: string;
    }) => adminService.bulkUpdateUserStatus(userIds, action, reason),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard });
      toast.success(
        `Bulk ${res.action} completed: ${res.successful_count} updated, ${res.failed_count} skipped.`
      );
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Bulk status operation failed.");
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      adminService.updateUserRole(userId, { role }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.user(variables.userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard });
      toast.success("User role updated successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to update user role");
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
        page={data?.page || page}
        totalPages={data?.total_pages || 1}
        onPageChange={(newPage) => updateUrlParams({ page: newPage })}
        searchQuery={searchQuery}
        onSearchChange={(q) => setSearchQuery(q)}
        roleFilter={roleFilter}
        onRoleFilterChange={(r) => updateUrlParams({ role: r, page: 1 })}
        statusFilter={statusFilter}
        onStatusFilterChange={(s) => updateUrlParams({ status: s, page: 1 })}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        onResetFilters={handleResetFilters}
        onSelectUser={(u) => setSelectedUser(u)}
        onSuspendUser={async (userId, reason) => {
          await suspendMutation.mutateAsync({ userId, reason });
        }}
        onActivateUser={async (userId) => {
          await activateMutation.mutateAsync(userId);
        }}
        onBulkStatusUpdate={async (userIds, action, reason) => {
          await bulkStatusMutation.mutateAsync({ userIds, action, reason });
        }}
      />

      <UserDetailDrawer
        user={userDetail || null}
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        onUpdateRole={async (newRole: string) => {
          if (selectedUser) {
            await updateRoleMutation.mutateAsync({ userId: selectedUser.id, role: newRole });
          }
        }}
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
