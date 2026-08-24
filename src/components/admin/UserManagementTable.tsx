import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Filter,
  Eye,
  Shield,
  UserCheck,
  UserX,
  MoreVertical,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { AdminUserListItem } from "@/types";

interface UserManagementTableProps {
  users: AdminUserListItem[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  roleFilter: string;
  onRoleFilterChange: (role: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onSelectUser: (user: AdminUserListItem) => void;
  onSuspendUser: (userId: string, reason: string) => Promise<void>;
  onActivateUser: (userId: string) => Promise<void>;
}

export function UserManagementTable({
  users,
  isLoading,
  page,
  totalPages,
  onPageChange,
  searchQuery,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  onSelectUser,
  onSuspendUser,
  onActivateUser,
}: UserManagementTableProps) {
  const [suspendTargetUser, setSuspendTargetUser] = useState<AdminUserListItem | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirmSuspend = async () => {
    if (!suspendTargetUser || !suspendReason.trim()) return;
    setIsSubmitting(true);
    try {
      await onSuspendUser(suspendTargetUser.id, suspendReason.trim());
      setSuspendTargetUser(null);
      setSuspendReason("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates by name or email..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-10 bg-card/60 border-border/60 rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value)}
            className="h-10 rounded-xl border border-border/60 bg-card/60 px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Roles</option>
            <option value="user">Candidate (user)</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="h-10 rounded-xl border border-border/60 bg-card/60 px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border/50 bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              <tr>
                <th className="px-5 py-3.5">Candidate / User</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Target Role</th>
                <th className="px-4 py-3.5">Readiness</th>
                <th className="px-4 py-3.5">Activity</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-normal">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span className="text-xs">Loading platform users...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    <p className="text-sm font-medium">No users matched your criteria.</p>
                    <p className="text-xs mt-1">Try resetting the filters or search keywords.</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-accent/40 transition-colors group cursor-pointer"
                      onClick={() => onSelectUser(u)}
                    >
                      {/* Name & Email */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xs uppercase shrink-0">
                            {u.full_name?.charAt(0) || u.email.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground text-sm leading-snug">
                              {u.full_name || "Unnamed Candidate"}
                            </span>
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="px-4 py-3.5">
                        <Badge
                          variant="outline"
                          className={
                            u.role === "super_admin"
                              ? "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold"
                              : u.role === "admin"
                              ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold"
                              : "border-border text-muted-foreground font-normal"
                          }
                        >
                          {u.role.toUpperCase()}
                        </Badge>
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3.5">
                        {u.is_suspended ? (
                          <Badge variant="destructive" className="font-semibold text-[10px]">
                            Suspended
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-500/10 text-emerald-500 border-none font-semibold text-[10px]"
                          >
                            Active
                          </Badge>
                        )}
                      </td>

                      {/* Target Role */}
                      <td className="px-4 py-3.5 text-xs text-foreground">
                        {u.target_role || <span className="text-muted-foreground italic">Exploring</span>}
                      </td>

                      {/* Readiness Score */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 rounded-full bg-secondary overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${Math.min(100, u.readiness_score || 50)}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-foreground">
                            {u.readiness_score ? `${Math.round(u.readiness_score)}%` : "--"}
                          </span>
                        </div>
                      </td>

                      {/* Metrics Count */}
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">
                        <span>{u.applications_count} apps</span> · <span>{u.interviews_count} mock</span>
                      </td>

                      {/* Actions */}
                      <td
                        className="px-5 py-3.5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1-Click Inspect Workspace */}
                          <Link to={`/admin/users/${u.id}/workspace`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Inspect</span>
                            </Button>
                          </Link>

                          {/* More Options Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl">
                              <DropdownMenuItem onClick={() => onSelectUser(u)}>
                                <Shield className="mr-2 h-4 w-4 text-muted-foreground" />
                                <span>View User Details</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/admin/users/${u.id}/workspace`}>
                                  <ExternalLink className="mr-2 h-4 w-4 text-primary" />
                                  <span>Open User Workspace</span>
                                </Link>
                              </DropdownMenuItem>
                              {u.is_suspended ? (
                                <DropdownMenuItem onClick={() => onActivateUser(u.id)}>
                                  <UserCheck className="mr-2 h-4 w-4 text-emerald-500" />
                                  <span>Reactivate Account</span>
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setSuspendTargetUser(u)}
                                >
                                  <UserX className="mr-2 h-4 w-4" />
                                  <span>Suspend Account</span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-border/50 px-5 py-3.5 text-xs text-muted-foreground">
          <span>
            Page <span className="font-semibold text-foreground">{page}</span> of{" "}
            <span className="font-semibold text-foreground">{totalPages}</span>
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 rounded-lg px-2.5"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 rounded-lg px-2.5"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Suspend Confirmation Dialog */}
      <Dialog
        open={!!suspendTargetUser}
        onOpenChange={(open) => {
          if (!open) {
            setSuspendTargetUser(null);
            setSuspendReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Suspend Candidate Account
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to suspend{" "}
              <strong className="text-foreground">{suspendTargetUser?.email}</strong>? The user will be blocked from accessing platform features until reactivated.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 py-2">
            <label className="text-xs font-semibold text-foreground">
              Reason for Suspension <span className="text-destructive">*</span>
            </label>
            <Textarea
              placeholder="e.g., Suspicious automated activity or violation of platform policies..."
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              className="min-h-[80px] rounded-xl text-sm"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setSuspendTargetUser(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!suspendReason.trim() || isSubmitting}
              onClick={handleConfirmSuspend}
            >
              {isSubmitting ? "Suspending..." : "Confirm Suspension"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
