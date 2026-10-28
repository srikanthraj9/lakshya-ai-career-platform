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
  CheckSquare,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useAuth } from "@/context/AuthContext";
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
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSortChange?: (field: string) => void;
  onResetFilters?: () => void;
  onSelectUser: (user: AdminUserListItem) => void;
  onSuspendUser: (userId: string, reason: string) => Promise<void>;
  onActivateUser: (userId: string) => Promise<void>;
  onBulkStatusUpdate?: (userIds: string[], action: "suspend" | "activate", reason: string) => Promise<void>;
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
  sortBy = "created_at",
  sortOrder = "desc",
  onSortChange,
  onResetFilters,
  onSelectUser,
  onSuspendUser,
  onActivateUser,
  onBulkStatusUpdate,
}: UserManagementTableProps) {
  const { user: currentAdmin } = useAuth();
  const [suspendTargetUser, setSuspendTargetUser] = useState<AdminUserListItem | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const renderSortHeader = (label: string, field: string) => {
    const isSorted = sortBy === field;
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground font-semibold uppercase tracking-wider transition-colors cursor-pointer"
        onClick={() => onSortChange?.(field)}
        title={`Sort by ${label}`}
      >
        <span>{label}</span>
        {isSorted ? (
          sortOrder === "asc" ? (
            <ArrowUp className="h-3 w-3 text-primary shrink-0" />
          ) : (
            <ArrowDown className="h-3 w-3 text-primary shrink-0" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30 hover:opacity-100 shrink-0" />
        )}
      </button>
    );
  };

  // Bulk actions state
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<"suspend" | "activate" | null>(null);
  const [bulkReason, setBulkReason] = useState("");
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  // Non-superadmin users eligible for bulk actions (also excluding caller's own account)
  const eligibleUsers = users.filter(
    (u) => u.role !== "super_admin" && u.id !== currentAdmin?.id
  );
  const allEligibleSelected =
    eligibleUsers.length > 0 && eligibleUsers.every((u) => selectedUserIds.includes(u.id));

  const handleToggleSelectAll = () => {
    if (allEligibleSelected) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(eligibleUsers.map((u) => u.id));
    }
  };

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

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

  const handleConfirmBulkAction = async () => {
    if (!bulkAction || selectedUserIds.length === 0 || !onBulkStatusUpdate) return;
    setIsBulkSubmitting(true);
    try {
      await onBulkStatusUpdate(selectedUserIds, bulkAction, bulkReason.trim() || `Bulk ${bulkAction}`);
      setBulkAction(null);
      setBulkReason("");
      setSelectedUserIds([]);
    } finally {
      setIsBulkSubmitting(false);
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

          {onResetFilters && (roleFilter !== "all" || statusFilter !== "all" || Boolean(searchQuery.trim())) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              className="h-10 text-xs text-muted-foreground hover:text-foreground rounded-xl gap-1.5"
              title="Clear all filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedUserIds.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 px-4 rounded-2xl border border-primary/30 bg-primary/5 backdrop-blur-xl animate-in fade-in-50">
          <div className="flex items-center gap-2.5">
            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-bold text-xs px-2.5 py-0.5">
              {selectedUserIds.length} Selected
            </Badge>
            <span className="text-xs text-muted-foreground">
              Bulk actions safely exclude protected super administrator accounts.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="destructive"
              className="h-8 text-xs gap-1.5 rounded-xl font-medium"
              onClick={() => {
                setBulkAction("suspend");
                setBulkReason("Bulk suspension via administrator control center");
              }}
            >
              <UserX className="h-3.5 w-3.5" />
              <span>Bulk Suspend</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5 rounded-xl border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-medium"
              onClick={() => {
                setBulkAction("activate");
                setBulkReason("Bulk reactivation via administrator control center");
              }}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Bulk Activate</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-muted-foreground rounded-xl"
              onClick={() => setSelectedUserIds([])}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Table Card */}
      <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border/50 bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              <tr>
                <th scope="col" className="w-10 px-4 py-3.5 text-center">
                  <Checkbox
                    checked={allEligibleSelected}
                    onCheckedChange={handleToggleSelectAll}
                    aria-label="Select all eligible candidates"
                    disabled={eligibleUsers.length === 0}
                  />
                </th>
                <th scope="col" className="px-4 py-3.5">
                  {renderSortHeader("Candidate / User", "name")}
                </th>
                <th scope="col" className="px-4 py-3.5">
                  {renderSortHeader("Role", "role")}
                </th>
                <th scope="col" className="px-4 py-3.5">
                  {renderSortHeader("Status", "status")}
                </th>
                <th scope="col" className="px-4 py-3.5">Target Role</th>
                <th scope="col" className="px-4 py-3.5">Readiness</th>
                <th scope="col" className="px-4 py-3.5">
                  {renderSortHeader("Activity", "created_at")}
                </th>
                <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-normal">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span className="text-xs">Loading platform users...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                    <p className="text-sm font-medium">No users matched your criteria.</p>
                    <p className="text-xs mt-1">Try resetting the filters or search keywords.</p>
                    {onResetFilters && (roleFilter !== "all" || statusFilter !== "all" || Boolean(searchQuery.trim())) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onResetFilters}
                        className="mt-3 text-xs rounded-xl"
                      >
                        Clear Filters
                      </Button>
                    )}
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
                      {/* Selection Checkbox */}
                      <td
                        className="w-10 px-4 py-3.5 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {u.role === "super_admin" || u.id === currentAdmin?.id ? (
                          <span title={u.role === "super_admin" ? "Super administrator accounts cannot be modified via bulk operations" : "You cannot modify your own account via bulk operations"}>
                            <Checkbox disabled className="opacity-30 cursor-not-allowed" />
                          </span>
                        ) : (
                          <Checkbox
                            checked={selectedUserIds.includes(u.id)}
                            onCheckedChange={() => handleToggleUser(u.id)}
                            aria-label={`Select ${u.full_name || u.email}`}
                          />
                        )}
                      </td>
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
                        {u.readiness_score != null ? (
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 rounded-full bg-secondary overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${Math.min(100, Math.max(0, u.readiness_score))}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-foreground">
                              {Math.round(u.readiness_score)}%
                            </span>
                          </div>
                        ) : (
                          <span
                            className="text-[11px] text-muted-foreground/70 italic font-mono"
                            title="Insufficient assessment data (no resume or interview completed)"
                          >
                            Pending
                          </span>
                        )}
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
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground"
                                aria-label={`Actions for ${u.full_name || u.email}`}
                              >
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
                              ) : u.id === currentAdmin?.id ? (
                                <DropdownMenuItem disabled className="text-muted-foreground opacity-50 cursor-not-allowed">
                                  <UserX className="mr-2 h-4 w-4" />
                                  <span>Self-Suspension Prohibited</span>
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
              <strong className="text-foreground break-all">{suspendTargetUser?.email}</strong>? The user will be blocked from accessing platform features until reactivated.
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

      {/* Bulk Action Confirmation Dialog */}
      <Dialog
        open={bulkAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setBulkAction(null);
            setBulkReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className={`h-5 w-5 ${bulkAction === "suspend" ? "text-destructive" : "text-emerald-500"}`} />
              <span>Confirm Bulk {bulkAction === "suspend" ? "Account Suspension" : "Account Activation"}</span>
            </DialogTitle>
            <DialogDescription>
              You are about to {bulkAction === "suspend" ? "suspend" : "activate"}{" "}
              <strong className="text-foreground">{selectedUserIds.length}</strong> candidate accounts.
              {bulkAction === "suspend"
                ? " Suspended candidates will be blocked from logging in or accessing platform features."
                : " Activated candidates will regain full platform access."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Affected Accounts ({selectedUserIds.length})</span>
              <div className="rounded-xl border border-border/70 bg-muted/20 p-2.5 max-h-32 overflow-y-auto flex flex-col gap-1 text-xs">
                {users
                  .filter((u) => selectedUserIds.includes(u.id))
                  .map((u) => (
                    <div key={u.id} className="flex items-center justify-between py-1 border-b border-border/40 last:border-0">
                      <span className="font-medium text-foreground truncate max-w-[240px]">
                        {u.full_name ? `${u.full_name} (${u.email})` : u.email}
                      </span>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {u.role}
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">
                Operational Reason <span className="text-destructive">*</span>
              </label>
              <Textarea
                placeholder="Document the administrative or compliance reason for this bulk update..."
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                className="min-h-[75px] rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => {
                setBulkAction(null);
                setBulkReason("");
              }}
              disabled={isBulkSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant={bulkAction === "suspend" ? "destructive" : "default"}
              disabled={!bulkReason.trim() || isBulkSubmitting}
              onClick={handleConfirmBulkAction}
              className="gap-1.5"
            >
              {isBulkSubmitting
                ? "Processing..."
                : `Confirm ${bulkAction === "suspend" ? "Suspension" : "Activation"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
