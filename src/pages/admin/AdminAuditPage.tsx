import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Filter, RefreshCw, X, Download, Search, Calendar } from "lucide-react";
import { toast } from "sonner";
import { adminService } from "@/services/adminService";
import { queryKeys } from "@/lib/queryKeys";
import { AuditLogTable } from "@/components/admin/AuditLogTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export function AdminAuditPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [actionFilter, setActionFilter] = useState(searchParams.get("action_type") || "");
  const [resourceTypeFilter, setResourceTypeFilter] = useState(searchParams.get("resource_type") || "");
  const [resourceIdFilter, setResourceIdFilter] = useState(searchParams.get("resource_id") || "");
  const [severityFilter, setSeverityFilter] = useState(searchParams.get("severity") || "");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [startDate, setStartDate] = useState(searchParams.get("start_date") || "");
  const [endDate, setEndDate] = useState(searchParams.get("end_date") || "");
  const [isExporting, setIsExporting] = useState(false);

  // Sync state if URL changes externally
  useEffect(() => {
    setActionFilter(searchParams.get("action_type") || "");
    setResourceTypeFilter(searchParams.get("resource_type") || "");
    setResourceIdFilter(searchParams.get("resource_id") || "");
    setSeverityFilter(searchParams.get("severity") || "");
    setSearchQuery(searchParams.get("search") || "");
    setStartDate(searchParams.get("start_date") || "");
    setEndDate(searchParams.get("end_date") || "");
  }, [searchParams]);

  const filters = {
    page,
    page_size: pageSize,
    action_type: actionFilter || undefined,
    resource_type: resourceTypeFilter || undefined,
    resource_id: resourceIdFilter || undefined,
    severity: severityFilter || undefined,
    search: searchQuery.trim() || undefined,
    start_date: startDate ? new Date(startDate).toISOString() : undefined,
    end_date: endDate ? new Date(endDate + "T23:59:59.999Z").toISOString() : undefined,
  };

  const {
    data,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.admin.audit(filters),
    queryFn: () => adminService.getAuditLogs(filters),
    placeholderData: (previousData) => previousData,
  });

  const updateUrlParams = (newParams: Record<string, string>) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([k, v]) => {
      if (v) {
        nextParams.set(k, v);
      } else {
        nextParams.delete(k);
      }
    });
    setSearchParams(nextParams);
  };

  const handleActionFilterChange = (value: string) => {
    setActionFilter(value);
    setPage(1);
    updateUrlParams({ action_type: value });
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
    updateUrlParams({ search: value });
  };

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setPage(1);
    updateUrlParams({ start_date: start, end_date: end });
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  const handleResetFilters = () => {
    setActionFilter("");
    setResourceTypeFilter("");
    setResourceIdFilter("");
    setSeverityFilter("");
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setPage(1);
    setSearchParams(new URLSearchParams());
  };

  const handleClearResourceFilter = () => {
    setResourceTypeFilter("");
    setResourceIdFilter("");
    setPage(1);
    updateUrlParams({ resource_type: "", resource_id: "" });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await adminService.exportAuditLogs({
        action_type: actionFilter || undefined,
        resource_type: resourceTypeFilter || undefined,
        resource_id: resourceIdFilter || undefined,
        severity: severityFilter || undefined,
        search: searchQuery.trim() || undefined,
        start_date: startDate ? new Date(startDate).toISOString() : undefined,
        end_date: endDate ? new Date(endDate + "T23:59:59.999Z").toISOString() : undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `lakshya_audit_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Audit logs exported to CSV successfully.");
    } catch (err) {
      toast.error("Failed to export audit logs. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const logs = data?.items || [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 1;

  const hasActiveResourceFilter = !!(resourceTypeFilter || resourceIdFilter);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting || total === 0}
              className="h-9 px-3 text-xs gap-1.5 rounded-xl border-border/60 hover:bg-primary/10 hover:text-primary"
              title="Export filtered audit logs as sanitized CSV"
            >
              <Download className={`h-3.5 w-3.5 ${isExporting ? "animate-bounce text-primary" : ""}`} />
              <span>{isExporting ? "Exporting..." : "Export CSV"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-9 px-2.5 text-xs gap-1 rounded-xl border-border/60"
              title="Refresh Audit Trail"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-primary" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 p-3 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-xl">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search action type, resource, ID, reason..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl bg-background/60"
            />
          </div>

          {/* Date Range Filtering */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => handleDateChange(e.target.value, endDate)}
              className="h-9 w-36 text-xs rounded-xl bg-background/60"
              aria-label="Start date"
              title="Filter from start date"
            />
            <span className="text-[11px] text-muted-foreground">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => handleDateChange(startDate, e.target.value)}
              className="h-9 w-36 text-xs rounded-xl bg-background/60"
              aria-label="End date"
              title="Filter up to end date"
            />
          </div>

          {/* Action Type Dropdown */}
          <div className="relative">
            <select
              value={actionFilter}
              onChange={(e) => handleActionFilterChange(e.target.value)}
              className="h-9 w-full md:w-auto rounded-xl border border-border/60 bg-background/60 px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary pr-8"
              aria-label="Filter by action type"
            >
              <option value="">All Action Types</option>
              <optgroup label="User & Role Administration">
                <option value="VIEW_ADMIN_DASHBOARD">VIEW_ADMIN_DASHBOARD</option>
                <option value="VIEW_USER_DETAIL">VIEW_USER_DETAIL</option>
                <option value="SUSPEND_USER">SUSPEND_USER</option>
                <option value="ACTIVATE_USER">ACTIVATE_USER</option>
                <option value="BULK_SUSPEND_USER">BULK_SUSPEND_USER</option>
                <option value="BULK_ACTIVATE_USER">BULK_ACTIVATE_USER</option>
                <option value="UPDATE_USER_ROLE">UPDATE_USER_ROLE</option>
              </optgroup>
              <optgroup label="Operational Alert Center">
                <option value="ALERT_ACKNOWLEDGED">ALERT_ACKNOWLEDGED</option>
                <option value="ALERT_RESOLVED">ALERT_RESOLVED</option>
              </optgroup>
              <optgroup label="Simulation & Impersonation">
                <option value="SIMULATE_USER_LOGIN">SIMULATE_USER_LOGIN</option>
                <option value="TERMINATE_SIMULATION">TERMINATE_SIMULATION</option>
              </optgroup>
              <optgroup label="Platform Controls & Notices">
                <option value="CREATE_FEATURE_FLAG">CREATE_FEATURE_FLAG</option>
                <option value="UPDATE_FEATURE_FLAG">UPDATE_FEATURE_FLAG</option>
                <option value="CREATE_ANNOUNCEMENT">CREATE_ANNOUNCEMENT</option>
                <option value="UPDATE_ANNOUNCEMENT">UPDATE_ANNOUNCEMENT</option>
                <option value="DELETE_ANNOUNCEMENT">DELETE_ANNOUNCEMENT</option>
              </optgroup>
              <optgroup label="Database Operations">
                <option value="DATABASE_MUTATION_USERS">DATABASE_MUTATION_USERS</option>
                <option value="DATABASE_DELETE_USERS">DATABASE_DELETE_USERS</option>
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {hasActiveResourceFilter && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-xs">
          <Filter className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-muted-foreground">Filtered by Resource:</span>
          <Badge variant="outline" className="font-mono text-[11px] bg-background/80">
            {resourceTypeFilter ? `${resourceTypeFilter} • ` : ""}{resourceIdFilter}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearResourceFilter}
            className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground gap-1 ml-auto"
          >
            <X className="h-3 w-3" />
            <span>Clear Filter</span>
          </Button>
        </div>
      )}

      <AuditLogTable
        logs={logs}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        isLoading={isLoading}
        isError={isError}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        onRetry={refetch}
        onResetFilters={handleResetFilters}
      />
    </div>
  );
}
