import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Check,
  ShieldAlert,
  Database,
  Cpu,
  KeyRound,
  HardDrive,
  Activity,
  ArrowUpRight,
  Clock,
  UserCheck,
  FileText,
  X,
  ShieldCheck,
} from "lucide-react";
import { adminService } from "@/services/adminService";
import { queryKeys } from "@/lib/queryKeys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { OperationalAlertItem, AlertSeverity, AlertStatus } from "@/types";

export function AdminAlertsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state sync
  const statusParam = (searchParams.get("status") as AlertStatus) || "all";
  const severityParam = (searchParams.get("severity") as AlertSeverity) || "all";
  const sourceParam = searchParams.get("source") || "all";
  const [search, setSearch] = useState(searchParams.get("q") || "");

  // Modal dialog states
  const [selectedAlert, setSelectedAlert] = useState<OperationalAlertItem | null>(null);
  const [transitionTarget, setTransitionTarget] = useState<{
    alert: OperationalAlertItem;
    status: "acknowledged" | "resolved";
  } | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const updateFilters = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== "all") {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  // Queries
  const {
    data: alertData,
    isLoading,
    isRefetching,
    refetch,
    isError,
  } = useQuery({
    queryKey: queryKeys.admin.alerts({
      status: statusParam === "all" ? undefined : statusParam,
      severity: severityParam === "all" ? undefined : severityParam,
      source_service: sourceParam === "all" ? undefined : sourceParam,
      search: search || undefined,
    }),
    queryFn: () =>
      adminService.getOperationalAlerts({
        status: statusParam === "all" ? undefined : statusParam,
        severity: severityParam === "all" ? undefined : severityParam,
        source_service: sourceParam === "all" ? undefined : sourceParam,
        search: search || undefined,
      }),
    refetchInterval: 15000,
  });

  // Transition Mutation
  const transitionMutation = useMutation({
    mutationFn: ({
      alertId,
      status,
      notes,
    }: {
      alertId: string;
      status: "acknowledged" | "resolved";
      notes?: string;
    }) =>
      adminService.transitionOperationalAlert(alertId, {
        status,
        resolution_notes: notes,
      }),
    onSuccess: (updated) => {
      toast.success(
        `Alert "${updated.title}" successfully marked as ${updated.status}.`
      );
      setTransitionTarget(null);
      setResolutionNotes("");
      queryClient.invalidateQueries({ queryKey: ["admin", "alerts"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.systemHealth });
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.detail || "Failed to update alert lifecycle status."
      );
    },
  });

  const handleOpenTransitionModal = (
    alert: OperationalAlertItem,
    status: "acknowledged" | "resolved"
  ) => {
    setTransitionTarget({ alert, status });
    setResolutionNotes(alert.resolution_notes || "");
  };

  const handleConfirmTransition = () => {
    if (!transitionTarget) return;
    transitionMutation.mutate({
      alertId: transitionTarget.alert.id,
      status: transitionTarget.status,
      notes: resolutionNotes.trim() || undefined,
    });
  };

  // Source icon helper
  const getSourceIcon = (source: string) => {
    switch (source.toLowerCase()) {
      case "database":
        return Database;
      case "ai_service":
        return Cpu;
      case "authentication":
        return KeyRound;
      case "storage":
        return HardDrive;
      case "governance":
        return ShieldAlert;
      case "api":
      default:
        return Activity;
    }
  };

  // Deep-link generator
  const getInvestigationRoute = (alert: OperationalAlertItem) => {
    switch (alert.source_service) {
      case "database":
      case "storage":
      case "api":
        return "/admin/system";
      case "ai_service":
        return "/admin/ai";
      case "governance":
        return "/admin/audit";
      case "authentication":
        return "/admin/users?filter=suspended";
      default:
        return "/admin/system";
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Intelligent Alert Center
            </h1>
            <Badge
              variant="outline"
              className="border-primary/40 bg-primary/10 text-primary font-bold text-xs px-2 py-0.5"
            >
              Live Monitor
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time incident detection, automated service degradation alerts, and operational lifecycle workflows.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="gap-2 rounded-xl text-xs h-9 border-border/70 bg-card/60"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefetching || isLoading ? "animate-spin" : ""}`}
            />
            <span>Refresh Alerts</span>
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Open Alerts */}
        <div className="flex flex-col rounded-2xl border border-border/60 bg-card/60 p-4 sm:p-5 backdrop-blur-xl shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Open Incidents</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {alertData?.open_count ?? 0}
            </span>
            {(alertData?.open_count ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-500">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                Action Required
              </span>
            )}
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="flex flex-col rounded-2xl border border-red-500/20 bg-card/60 p-4 sm:p-5 backdrop-blur-xl shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Critical Severity</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-red-500">
              {alertData?.critical_count ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">priority 1</span>
          </div>
        </div>

        {/* Warnings / Degradations */}
        <div className="flex flex-col rounded-2xl border border-amber-500/20 bg-card/60 p-4 sm:p-5 backdrop-blur-xl shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Warnings / Degradations</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <Info className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-500">
              {alertData?.warning_count ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">sub-optimal</span>
          </div>
        </div>

        {/* Resolved */}
        <div className="flex flex-col rounded-2xl border border-emerald-500/20 bg-card/60 p-4 sm:p-5 backdrop-blur-xl shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Resolved History</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-500">
              {alertData?.resolved_count ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">mitigated</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/60 p-3.5 backdrop-blur-xl shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") updateFilters("q", search);
            }}
            placeholder="Search incident title, description, or notes..."
            className="pl-9 h-9 text-xs rounded-xl bg-background/50 border-border/70"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status */}
          <Select
            value={statusParam}
            onValueChange={(val) => updateFilters("status", val)}
          >
            <SelectTrigger className="h-9 text-xs rounded-xl w-[130px] bg-background/50 border-border/70">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>

          {/* Severity */}
          <Select
            value={severityParam}
            onValueChange={(val) => updateFilters("severity", val)}
          >
            <SelectTrigger className="h-9 text-xs rounded-xl w-[130px] bg-background/50 border-border/70">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>

          {/* Source Service */}
          <Select
            value={sourceParam}
            onValueChange={(val) => updateFilters("source", val)}
          >
            <SelectTrigger className="h-9 text-xs rounded-xl w-[130px] bg-background/50 border-border/70">
              <SelectValue placeholder="Service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="database">Database</SelectItem>
              <SelectItem value="ai_service">AI Inference</SelectItem>
              <SelectItem value="authentication">Auth & RBAC</SelectItem>
              <SelectItem value="governance">Governance</SelectItem>
              <SelectItem value="api">Core API</SelectItem>
              <SelectItem value="storage">Storage</SelectItem>
            </SelectContent>
          </Select>

          {(statusParam !== "all" ||
            severityParam !== "all" ||
            sourceParam !== "all" ||
            search) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setSearchParams(new URLSearchParams());
              }}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Alert Items List */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl border border-border/50 bg-card/40 animate-pulse"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-destructive/20 bg-card/60 backdrop-blur-xl">
          <AlertCircle className="h-10 w-10 text-destructive mb-3" />
          <h3 className="text-sm font-bold text-foreground">
            Failed to Load Operational Alerts
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            An error occurred while inspecting platform telemetry and health probes.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="mt-4 rounded-xl text-xs"
          >
            Try Again
          </Button>
        </div>
      ) : alertData?.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-3">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-foreground">
            All Systems Operational
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">
            Zero active incidents detected matching the current filters. System health probes, AI request telemetry, and governance policies are functioning within normal operational bounds.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {alertData?.items.map((alert) => {
            const SourceIcon = getSourceIcon(alert.source_service);

            return (
              <div
                key={alert.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-4 sm:p-5 backdrop-blur-xl shadow-sm transition-all ${
                  alert.status === "open"
                    ? alert.severity === "critical"
                      ? "border-red-500/30 bg-red-950/10"
                      : "border-amber-500/30 bg-amber-950/10"
                    : alert.status === "acknowledged"
                    ? "border-amber-500/20 bg-card/60"
                    : "border-border/60 bg-card/40 opacity-80"
                }`}
              >
                {/* Left: Icon, Severity, Title, Description */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 mt-0.5 ${
                      alert.severity === "critical"
                        ? "bg-red-500/15 text-red-500"
                        : alert.severity === "warning"
                        ? "bg-amber-500/15 text-amber-500"
                        : "bg-blue-500/15 text-blue-500"
                    }`}
                  >
                    <SourceIcon className="h-5 w-5" />
                  </div>

                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Severity Badge */}
                      {alert.severity === "critical" ? (
                        <Badge
                          variant="destructive"
                          className="font-bold text-[10px] gap-1 px-2 py-0.5 uppercase tracking-wider"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                          Critical
                        </Badge>
                      ) : alert.severity === "warning" ? (
                        <Badge
                          variant="outline"
                          className="border-amber-500/40 text-amber-500 bg-amber-500/10 font-bold text-[10px] gap-1 px-2 py-0.5 uppercase tracking-wider"
                        >
                          Warning
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-blue-500/10 text-blue-500 font-bold text-[10px] px-2 py-0.5 uppercase tracking-wider"
                        >
                          Info
                        </Badge>
                      )}

                      {/* Status Badge */}
                      {alert.status === "open" ? (
                        <Badge
                          variant="outline"
                          className="border-primary/40 text-primary bg-primary/10 font-bold text-[10px] px-2 py-0.5"
                        >
                          Open
                        </Badge>
                      ) : alert.status === "acknowledged" ? (
                        <Badge
                          variant="outline"
                          className="border-amber-500/40 text-amber-500 bg-amber-500/10 font-bold text-[10px] px-2 py-0.5"
                        >
                          Acknowledged
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-500/10 text-emerald-500 font-bold text-[10px] gap-1 px-2 py-0.5"
                        >
                          <Check className="h-3 w-3" />
                          Resolved
                        </Badge>
                      )}

                      {/* Service Tag */}
                      <span className="text-[11px] font-mono text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-md">
                        {alert.source_service}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-foreground mt-1.5 line-clamp-1">
                      {alert.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                      {alert.description}
                    </p>

                    {/* Attribution & Metadata Footnote */}
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-muted-foreground/80">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3" />
                        {new Date(alert.updated_at).toLocaleTimeString()}
                      </span>
                      {alert.acknowledged_by_admin_email && alert.status === "acknowledged" && (
                        <span className="flex items-center gap-1 text-amber-500">
                          <UserCheck className="h-3 w-3" />
                          Ack by {alert.acknowledged_by_admin_email}
                        </span>
                      )}
                      {alert.resolved_by_admin_email && alert.status === "resolved" && (
                        <span className="flex items-center gap-1 text-emerald-500">
                          <CheckCircle2 className="h-3 w-3" />
                          Resolved by {alert.resolved_by_admin_email}
                        </span>
                      )}
                      {alert.resolution_notes && (
                        <span className="flex items-center gap-1 italic text-muted-foreground line-clamp-1">
                          "{alert.resolution_notes}"
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {/* Deep-link to related diagnostic view */}
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
                  >
                    <Link to={getInvestigationRoute(alert)}>
                      <span>Investigate</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </Button>

                  {/* View Details */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedAlert(alert)}
                    className="h-8 px-2.5 text-xs rounded-xl gap-1.5"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Details</span>
                  </Button>

                  {/* Acknowledge (if open) */}
                  {alert.status === "open" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenTransitionModal(alert, "acknowledged")}
                      className="h-8 px-3 text-xs rounded-xl border-amber-500/40 text-amber-500 hover:bg-amber-500/10 gap-1.5"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>Acknowledge</span>
                    </Button>
                  )}

                  {/* Resolve (if open or acknowledged) */}
                  {alert.status !== "resolved" && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleOpenTransitionModal(alert, "resolved")}
                      className="h-8 px-3 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Resolve</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Technical Detail Modal */}
      <Dialog
        open={!!selectedAlert}
        onOpenChange={(open) => !open && setSelectedAlert(null)}
      >
        <DialogContent className="max-w-2xl rounded-2xl bg-card border-border/80">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  selectedAlert?.severity === "critical"
                    ? "destructive"
                    : selectedAlert?.severity === "warning"
                    ? "outline"
                    : "secondary"
                }
                className="uppercase text-[10px] px-2 py-0.5 font-bold"
              >
                {selectedAlert?.severity}
              </Badge>
              <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                {selectedAlert?.status}
              </Badge>
              <span className="text-xs font-mono text-muted-foreground ml-auto">
                {selectedAlert?.source_service}
              </span>
            </div>
            <DialogTitle className="text-base font-bold mt-2">
              {selectedAlert?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Incident Fingerprint:{" "}
              <code className="text-primary font-mono">{selectedAlert?.id}</code>
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2 text-xs">
            <div>
              <span className="font-semibold text-foreground">Description</span>
              <p className="mt-1 text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-xl border border-border/50">
                {selectedAlert?.description}
              </p>
            </div>

            {selectedAlert?.resolution_notes && (
              <div>
                <span className="font-semibold text-foreground">
                  Investigation & Resolution Notes
                </span>
                <p className="mt-1 text-muted-foreground italic bg-muted/30 p-3 rounded-xl border border-border/50">
                  {selectedAlert.resolution_notes}
                </p>
              </div>
            )}

            <div>
              <span className="font-semibold text-foreground">Technical Metadata</span>
              <pre className="mt-1 font-mono text-[11px] bg-background/80 p-3 rounded-xl border border-border/60 overflow-x-auto text-muted-foreground max-h-48">
                {JSON.stringify(selectedAlert?.metadata || {}, null, 2)}
              </pre>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[11px] text-muted-foreground bg-muted/20 p-3 rounded-xl">
              <div>
                <span className="font-medium text-foreground block">Created At:</span>
                {selectedAlert?.created_at
                  ? new Date(selectedAlert.created_at).toLocaleString()
                  : "N/A"}
              </div>
              <div>
                <span className="font-medium text-foreground block">Last Updated:</span>
                {selectedAlert?.updated_at
                  ? new Date(selectedAlert.updated_at).toLocaleString()
                  : "N/A"}
              </div>
              {selectedAlert?.acknowledged_at && (
                <div>
                  <span className="font-medium text-foreground block">Acknowledged:</span>
                  {new Date(selectedAlert.acknowledged_at).toLocaleString()} (
                  {selectedAlert.acknowledged_by_admin_email})
                </div>
              )}
              {selectedAlert?.resolved_at && (
                <div>
                  <span className="font-medium text-foreground block">Resolved:</span>
                  {new Date(selectedAlert.resolved_at).toLocaleString()} (
                  {selectedAlert.resolved_by_admin_email})
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 flex-wrap">
            {selectedAlert && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="rounded-xl text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                >
                  <Link to={`/admin/audit?resource_type=operational_alert&resource_id=${encodeURIComponent(selectedAlert.id)}`}>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>View Audit Trail</span>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="rounded-xl text-xs"
                >
                  <Link to={getInvestigationRoute(selectedAlert)}>
                    <span>Open Diagnostic View</span>
                    <ArrowUpRight className="h-3.5 w-3.5 ml-1.5" />
                  </Link>
                </Button>
              </>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedAlert(null)}
              className="rounded-xl text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transition Confirmation Dialog */}
      <Dialog
        open={!!transitionTarget}
        onOpenChange={(open) => !open && setTransitionTarget(null)}
      >
        <DialogContent className="max-w-md rounded-2xl bg-card border-border/80">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {transitionTarget?.status === "resolved"
                ? "Mark Alert as Resolved"
                : "Acknowledge Operational Alert"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {transitionTarget?.status === "resolved"
                ? "Provide resolution notes detailing what root-cause mitigation was performed."
                : "Acknowledge this incident to signal active administrative investigation."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 text-xs">
              <span className="font-bold text-foreground block">
                {transitionTarget?.alert.title}
              </span>
              <span className="text-muted-foreground text-[11px] block mt-0.5">
                Service: {transitionTarget?.alert.source_service} • Severity:{" "}
                {transitionTarget?.alert.severity}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">
                {transitionTarget?.status === "resolved"
                  ? "Resolution Notes (Mandatory for audit trail)"
                  : "Investigation Notes (Optional)"}
              </label>
              <Textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder={
                  transitionTarget?.status === "resolved"
                    ? "e.g., Restarted replica pool, rate limit ceiling raised with provider."
                    : "e.g., Reviewing telemetry spikes with engineering."
                }
                rows={3}
                className="text-xs rounded-xl bg-background/50 border-border/70"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTransitionTarget(null)}
              disabled={transitionMutation.isPending}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              variant={
                transitionTarget?.status === "resolved" ? "default" : "secondary"
              }
              size="sm"
              onClick={handleConfirmTransition}
              disabled={
                transitionMutation.isPending ||
                (transitionTarget?.status === "resolved" &&
                  !resolutionNotes.trim())
              }
              className={`rounded-xl text-xs font-medium ${
                transitionTarget?.status === "resolved"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : ""
              }`}
            >
              {transitionMutation.isPending ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin mr-1.5" />
                  Updating...
                </>
              ) : transitionTarget?.status === "resolved" ? (
                "Confirm Resolution"
              ) : (
                "Acknowledge Incident"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
