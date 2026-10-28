import React, { useState } from "react";
import {
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Cpu,
  User as UserIcon,
  ChevronDown,
  ChevronUp,
  Clock,
  Layers,
  Database,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminAuditLog } from "@/types";

interface AuditLogTableProps {
  logs: AdminAuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isLoading: boolean;
  isError?: boolean;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newSize: number) => void;
  onRetry?: () => void;
  onResetFilters?: () => void;
}

export function AuditLogTable({
  logs,
  total,
  page,
  pageSize,
  totalPages,
  isLoading,
  isError,
  onPageChange,
  onPageSizeChange,
  onRetry,
  onResetFilters,
}: AuditLogTableProps) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Format timestamp in user's local timezone with clean formatting
  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(date);
    } catch {
      return isoString;
    }
  };

  // Determine badge styling based on action category
  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("SUSPEND") || act.includes("DELETE") || act.includes("REVOKE")) {
      return "border-destructive/40 text-destructive bg-destructive/10";
    }
    if (act.includes("ACTIVATE") || act.includes("CREATE") || act.includes("RESTORE")) {
      return "border-emerald-500/40 text-emerald-400 bg-emerald-500/10";
    }
    if (act.includes("UPDATE") || act.includes("MODIFY") || act.includes("EDIT")) {
      return "border-amber-500/40 text-amber-400 bg-amber-500/10";
    }
    return "border-primary/40 text-primary bg-primary/10";
  };

  // Compute pagination range display numbers
  const fromRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const toRecord = total === 0 ? 0 : Math.min(page * pageSize, total);

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl shadow-sm overflow-hidden flex flex-col">
      {/* Header bar */}
      <div className="border-b border-border/50 bg-muted/30 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-foreground">Immutable Platform Audit Trail</h2>
            <p className="text-[11px] text-muted-foreground">
              Append-only tamper-evident compliance history
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] font-mono font-medium px-2.5 py-0.5 border-border/70">
            {total.toLocaleString()} Total Records
          </Badge>
          {totalPages > 0 && (
            <Badge variant="secondary" className="text-[11px] font-medium px-2 py-0.5">
              Page {page} of {totalPages}
            </Badge>
          )}
        </div>
      </div>

      {/* Main Table Content */}
      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full text-left text-sm" role="table">
          <thead className="border-b border-border/50 bg-muted/20 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            <tr>
              <th scope="col" className="px-5 py-3 whitespace-nowrap">Timestamp</th>
              <th scope="col" className="px-4 py-3 whitespace-nowrap">Actor</th>
              <th scope="col" className="px-4 py-3 whitespace-nowrap">Admin Action</th>
              <th scope="col" className="px-4 py-3 whitespace-nowrap">Target / Resource</th>
              <th scope="col" className="px-5 py-3 whitespace-nowrap">Context & Outcome</th>
              <th scope="col" className="px-3 py-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 font-normal">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="h-6 w-6 text-primary animate-spin" />
                    <p className="text-sm font-medium text-foreground">Loading audit records...</p>
                    <p className="text-xs text-muted-foreground">Querying server-side audit logs</p>
                  </div>
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                    <div className="h-10 w-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                      <AlertCircle className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">Failed to load audit records</p>
                    <p className="text-xs text-muted-foreground">
                      An error occurred while communicating with the audit logging service.
                    </p>
                    {onRetry && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onRetry}
                        className="mt-2 text-xs gap-1.5"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Retry Query
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                    <div className="h-10 w-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                      <Database className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">No audit actions recorded</p>
                    <p className="text-xs text-muted-foreground">
                      No administrative events match the selected criteria or pagination range.
                    </p>
                    {onResetFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onResetFilters}
                        className="mt-1 text-xs text-primary hover:text-primary/80"
                      >
                        Reset filters
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const isExpanded = !!expandedRows[log.id];
                const hasDetails =
                  (log.action_metadata && Object.keys(log.action_metadata).length > 0) ||
                  log.before_data ||
                  log.after_data ||
                  log.diff ||
                  log.reason ||
                  log.ip_address ||
                  log.user_agent;

                return (
                  <React.Fragment key={log.id}>
                    <tr
                      className={`hover:bg-accent/20 transition-colors ${
                        isExpanded ? "bg-accent/10" : ""
                      }`}
                    >
                      {/* Timestamp */}
                      <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        <div
                          className="flex items-center gap-1.5"
                          title={`UTC: ${log.created_at}`}
                        >
                          <Clock className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                          <span className="font-mono">{formatTimestamp(log.created_at)}</span>
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="px-4 py-3">
                        {log.admin_email ? (
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                              {log.admin_email.charAt(0).toUpperCase()}
                            </div>
                            <span
                              className="text-xs font-medium text-foreground truncate max-w-[180px]"
                              title={log.admin_email}
                            >
                              {log.admin_email}
                            </span>
                          </div>
                        ) : log.admin_user_id ? (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <UserIcon className="h-3.5 w-3.5" />
                            <span
                              className="text-xs font-mono text-muted-foreground"
                              title={log.admin_user_id}
                            >
                              Deleted Actor ({log.admin_user_id.slice(0, 8)}...)
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted/60 text-muted-foreground border border-border/40">
                            <Cpu className="h-3 w-3 text-muted-foreground/80" />
                            System / Automated
                          </span>
                        )}
                      </td>

                      {/* Admin Action */}
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold font-mono tracking-wide ${getActionBadge(
                            log.action_type
                          )}`}
                        >
                          {log.action_type}
                        </Badge>
                      </td>

                      {/* Resource Target */}
                      <td className="px-4 py-3 text-xs">
                        {log.target_email ? (
                          <div className="flex flex-col">
                            <span
                              className="font-medium text-foreground truncate max-w-[170px]"
                              title={log.target_email}
                            >
                              {log.target_email}
                            </span>
                            {log.target_user_id && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                ID: {log.target_user_id.slice(0, 8)}...
                              </span>
                            )}
                          </div>
                        ) : log.target_user_id ? (
                          <span
                            className="font-mono text-muted-foreground truncate max-w-[170px] inline-block"
                            title={log.target_user_id}
                          >
                            User: {log.target_user_id.slice(0, 8)}...
                          </span>
                        ) : log.resource_type || log.resource_id ? (
                          <div className="flex flex-col font-mono text-[11px] text-muted-foreground">
                            {log.resource_type && (
                              <span className="text-foreground/80 font-sans font-medium text-xs">
                                {log.resource_type}
                              </span>
                            )}
                            {log.resource_id && (
                              <span className="truncate max-w-[160px]" title={log.resource_id}>
                                {log.resource_id.slice(0, 10)}...
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/70 italic text-xs">
                            Platform Wide
                          </span>
                        )}
                      </td>

                      {/* Context & Outcome */}
                      <td className="px-5 py-3 text-xs">
                        {log.reason ? (
                          <p className="text-foreground/90 font-medium line-clamp-1">
                            {log.reason}
                          </p>
                        ) : log.action_metadata &&
                          Object.keys(log.action_metadata).length > 0 ? (
                          <span className="text-[11px] font-mono text-muted-foreground truncate max-w-[200px] inline-block">
                            {JSON.stringify(log.action_metadata).slice(0, 45)}
                            {JSON.stringify(log.action_metadata).length > 45 ? "..." : ""}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60 text-xs italic">
                            Standard execution
                          </span>
                        )}
                      </td>

                      {/* Expand Button */}
                      <td className="px-3 py-3 text-right">
                        {hasDetails && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => toggleRow(log.id)}
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? "Collapse event details" : "Expand event details"}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>

                    {/* Expanded details row */}
                    {isExpanded && (
                      <tr className="bg-muted/15 border-b border-border/40">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="rounded-xl border border-border/60 bg-card/80 p-4 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2 text-xs">
                              <span className="font-semibold text-foreground flex items-center gap-1.5">
                                <Info className="h-3.5 w-3.5 text-primary" />
                                Audit Event Identifier:{" "}
                                <code className="font-mono text-[11px] text-muted-foreground">
                                  {log.id}
                                </code>
                              </span>
                              <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                                {log.ip_address && (
                                  <span>
                                    IP: <strong className="text-foreground font-mono">{log.ip_address}</strong>
                                  </span>
                                )}
                                {log.severity && (
                                  <span>
                                    Severity: <strong className="text-foreground">{log.severity}</strong>
                                  </span>
                                )}
                              </div>
                            </div>

                            {log.reason && (
                              <div className="text-xs">
                                <span className="font-semibold text-muted-foreground">Administrative Reason:</span>
                                <p className="mt-1 text-foreground bg-muted/40 p-2 rounded-lg font-mono text-[11px]">
                                  {log.reason}
                                </p>
                              </div>
                            )}

                            {log.action_metadata && Object.keys(log.action_metadata).length > 0 && (
                              <div className="text-xs space-y-1">
                                <span className="font-semibold text-muted-foreground">Action Metadata:</span>
                                <pre className="text-[11px] bg-muted/50 p-2.5 rounded-lg overflow-x-auto text-muted-foreground font-mono">
                                  {JSON.stringify(log.action_metadata, null, 2)}
                                </pre>
                              </div>
                            )}

                            {(log.before_data || log.after_data || log.diff) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                                {log.before_data && (
                                  <div>
                                    <span className="font-semibold text-muted-foreground">State Before:</span>
                                    <pre className="mt-1 text-[11px] bg-destructive/5 border border-destructive/20 p-2 rounded-lg overflow-x-auto text-destructive-foreground font-mono">
                                      {JSON.stringify(log.before_data, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {log.after_data && (
                                  <div>
                                    <span className="font-semibold text-muted-foreground">State After:</span>
                                    <pre className="mt-1 text-[11px] bg-emerald-500/5 border border-emerald-500/20 p-2 rounded-lg overflow-x-auto text-emerald-400 font-mono">
                                      {JSON.stringify(log.after_data, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="border-t border-border/50 bg-muted/30 px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Record Range Summary */}
        <div className="text-xs text-muted-foreground text-center sm:text-left">
          {total > 0 ? (
            <span>
              Showing <strong className="text-foreground font-medium">{fromRecord}</strong> to{" "}
              <strong className="text-foreground font-medium">{toRecord}</strong> of{" "}
              <strong className="text-foreground font-medium">{total.toLocaleString()}</strong> records
            </span>
          ) : (
            <span>0 records found</span>
          )}
        </div>

        {/* Right: Page Size Selector + Prev/Next Controls */}
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 w-full sm:w-auto">
          {/* Page size selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="audit-page-size" className="text-xs text-muted-foreground whitespace-nowrap">
              Rows per page:
            </label>
            <select
              id="audit-page-size"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              disabled={isLoading}
              className="h-8 rounded-lg border border-border/60 bg-card px-2.5 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* Current Page indicator */}
          <div className="text-xs font-medium text-foreground px-1 whitespace-nowrap">
            Page {page} of {Math.max(1, totalPages)}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || isLoading}
              className="h-8 px-2.5 text-xs gap-1 border-border/60 bg-card hover:bg-accent disabled:opacity-40"
              aria-label="Previous Page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || isLoading || total === 0}
              className="h-8 px-2.5 text-xs gap-1 border-border/60 bg-card hover:bg-accent disabled:opacity-40"
              aria-label="Next Page"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
