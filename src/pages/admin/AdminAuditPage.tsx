import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Filter } from "lucide-react";
import { adminService } from "@/services/adminService";
import { queryKeys } from "@/lib/queryKeys";
import { AuditLogTable } from "@/components/admin/AuditLogTable";

export function AdminAuditPage() {
  const [actionFilter, setActionFilter] = useState("");

  const filters = {
    page: 1,
    page_size: 50,
    action_type: actionFilter || undefined,
  };

  const { data: logs, isLoading } = useQuery({
    queryKey: queryKeys.admin.audit(filters),
    queryFn: () => adminService.getAuditLogs(filters),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Platform Governance & Audit Trail
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Immutable log of all administrative actions, feature toggles, candidate suspensions, and role changes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-10 rounded-xl border border-border/60 bg-card/60 px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All Action Types</option>
            <option value="VIEW_ADMIN_DASHBOARD">VIEW_ADMIN_DASHBOARD</option>
            <option value="VIEW_USER_DETAIL">VIEW_USER_DETAIL</option>
            <option value="SUSPEND_USER">SUSPEND_USER</option>
            <option value="ACTIVATE_USER">ACTIVATE_USER</option>
            <option value="UPDATE_USER_ROLE">UPDATE_USER_ROLE</option>
            <option value="CREATE_FEATURE_FLAG">CREATE_FEATURE_FLAG</option>
            <option value="UPDATE_FEATURE_FLAG">UPDATE_FEATURE_FLAG</option>
            <option value="CREATE_ANNOUNCEMENT">CREATE_ANNOUNCEMENT</option>
            <option value="DELETE_ANNOUNCEMENT">DELETE_ANNOUNCEMENT</option>
          </select>
        </div>
      </div>

      <AuditLogTable logs={logs || []} isLoading={isLoading} />
    </div>
  );
}
