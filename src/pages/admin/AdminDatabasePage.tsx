import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Database,
  Search,
  Shield,
  Lock,
  Edit2,
  Trash2,
  RefreshCw,
  Layers,
  Key,
  Eye,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { adminService, type DatabaseTableDefinition } from "@/services/adminService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function AdminDatabasePage() {
  const queryClient = useQueryClient();
  const [selectedTable, setSelectedTable] = useState<string>("users");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(20);
  const [search, setSearch] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState<Record<string, any> | null>(null);
  const [editUpdates, setEditUpdates] = useState<Record<string, any>>({});
  const [editReason, setEditReason] = useState<string>("");

  // Delete Modal State
  const [deletingRecord, setDeletingRecord] = useState<Record<string, any> | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>("");
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>("");

  // 1. Fetch tables list
  const { data: tables = [], isLoading: tablesLoading } = useQuery({
    queryKey: ["admin", "database", "tables"],
    queryFn: () => adminService.getDatabaseTables(),
  });

  // 2. Fetch records of selected table
  const {
    data: tableData,
    isLoading: recordsLoading,
    refetch: refetchRecords,
  } = useQuery({
    queryKey: ["admin", "database", "table", selectedTable, page, pageSize, searchTerm],
    queryFn: () =>
      adminService.queryDatabaseTable(selectedTable, {
        page,
        page_size: pageSize,
        search: searchTerm || undefined,
      }),
    enabled: !!selectedTable,
  });

  // 3. Mutation for updating record
  const updateMutation = useMutation({
    mutationFn: ({
      tableName,
      recordId,
      updates,
      reason,
    }: {
      tableName: string;
      recordId: string;
      updates: Record<string, any>;
      reason: string;
    }) => adminService.mutateDatabaseRecord(tableName, recordId, updates, reason),
    onSuccess: (res) => {
      toast.success("Record updated atomically", {
        description: `Audit log logged ID: ${res.audit_log_id}`,
      });
      setEditingRecord(null);
      setEditUpdates({});
      setEditReason("");
      queryClient.invalidateQueries({ queryKey: ["admin", "database", "table", selectedTable] });
    },
    onError: (err: any) => {
      toast.error("Mutation failed", {
        description: err?.response?.data?.detail || err.message,
      });
    },
  });

  // 4. Mutation for deleting record
  const deleteMutation = useMutation({
    mutationFn: ({
      tableName,
      recordId,
      reason,
      confirmationValue,
    }: {
      tableName: string;
      recordId: string;
      reason: string;
      confirmationValue?: string;
    }) => adminService.deleteDatabaseRecord(tableName, recordId, reason, confirmationValue),
    onSuccess: (res) => {
      toast.success("Record deleted safely", {
        description: `Audit log logged ID: ${res.audit_log_id}`,
      });
      setDeletingRecord(null);
      setDeleteReason("");
      setDeleteConfirmText("");
      queryClient.invalidateQueries({ queryKey: ["admin", "database", "table", selectedTable] });
    },
    onError: (err: any) => {
      toast.error("Deletion rejected", {
        description: err?.response?.data?.detail || err.message,
      });
    },
  });

  const currentTableMeta = tables.find((t) => t.table_name === selectedTable);
  const categories = ["all", ...Array.from(new Set(tables.map((t) => t.category)))];
  const filteredTables =
    selectedCategory === "all"
      ? tables
      : tables.filter((t) => t.category === selectedCategory);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchTerm(search.trim());
  };

  const handleOpenEdit = (rec: Record<string, any>) => {
    setEditingRecord(rec);
    const initial: Record<string, any> = {};
    if (currentTableMeta?.editable_fields) {
      currentTableMeta.editable_fields.forEach((f) => {
        if (rec[f] !== undefined && rec[f] !== null) {
          initial[f] = rec[f];
        }
      });
    }
    setEditUpdates(initial);
    setEditReason("");
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || !selectedTable) return;
    if (!editReason.trim() || editReason.trim().length < 3) {
      toast.error("A valid audit reason of at least 3 characters is required");
      return;
    }

    const recordId = String(editingRecord.id);
    updateMutation.mutate({
      tableName: selectedTable,
      recordId,
      updates: editUpdates,
      reason: editReason,
    });
  };

  const handleSaveDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingRecord || !selectedTable) return;
    if (!deleteReason.trim() || deleteReason.trim().length < 3) {
      toast.error("A valid audit reason is required");
      return;
    }

    const recordId = String(deletingRecord.id);
    deleteMutation.mutate({
      tableName: selectedTable,
      recordId,
      reason: deleteReason,
      confirmationValue: deleteConfirmText.trim() || undefined,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-3xl border border-border/60 bg-gradient-to-r from-card via-card/80 to-card/60 p-6 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500 font-bold border border-indigo-500/20 shadow-inner">
            <Database className="h-7 w-7" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                Database Explorer & Governance
              </h1>
              <Badge variant="outline" className="border-indigo-500/30 text-indigo-500 text-[11px] font-bold">
                SUPER ADMIN ONLY
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
              Strictly controlled, schema-whitelisted table explorer. All reads are masked for security, and mutations require mandatory audit reasons.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchRecords()}
            className="gap-2 h-9 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh Table</span>
          </Button>
        </div>
      </div>

      {/* Category Pills & Table Selector */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground mr-1 flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" /> Domain:
          </span>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="h-7 px-3 text-xs capitalize rounded-full font-semibold"
            >
              {cat}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl border border-border/60 bg-card/40 max-h-40 overflow-y-auto">
          {filteredTables.map((tbl) => (
            <button
              key={tbl.table_name}
              onClick={() => {
                setSelectedTable(tbl.table_name);
                setPage(1);
                setSearch("");
                setSearchTerm("");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center gap-1.5 ${
                selectedTable === tbl.table_name
                  ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 scale-105"
                  : "bg-background/80 hover:bg-accent text-foreground/80 border border-border/40"
              }`}
            >
              <FileSpreadsheet className="h-3 w-3" />
              <span>{tbl.table_name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Table Meta Card */}
      {currentTableMeta && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-foreground">
                {currentTableMeta.table_name}
              </span>
              <Badge variant="secondary" className="text-[10px] capitalize">
                {currentTableMeta.category}
              </Badge>
              {currentTableMeta.is_destructive_allowed ? (
                <Badge variant="outline" className="border-amber-500/30 text-amber-500 text-[10px]">
                  Deletions Permitted
                </Badge>
              ) : (
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 text-[10px]">
                  Protected &bull; Deletions Disallowed
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{currentTableMeta.description}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1 bg-background/80 px-2 py-1 rounded-md border border-border/40">
              <Eye className="h-3 w-3 text-sky-500" />
              <span>{currentTableMeta.readable_fields.length} Columns</span>
            </div>
            {currentTableMeta.masked_fields.length > 0 && (
              <div className="flex items-center gap-1 bg-background/80 px-2 py-1 rounded-md border border-rose-500/30 text-rose-500 font-semibold">
                <Shield className="h-3 w-3" />
                <span>{currentTableMeta.masked_fields.length} Masked</span>
              </div>
            )}
            <div className="flex items-center gap-1 bg-background/80 px-2 py-1 rounded-md border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold">
              <Edit2 className="h-3 w-3" />
              <span>{currentTableMeta.editable_fields.length} Editable</span>
            </div>
          </div>
        </div>
      )}

      {/* Search & Records Explorer */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-80">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={`Search ${selectedTable}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-background/60"
              />
            </div>
            <Button type="submit" size="sm" className="h-8 text-xs px-3">
              Search
            </Button>
          </form>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              Total records: <strong>{tableData?.total_records ?? 0}</strong>
            </span>
          </div>
        </div>

        {/* Records Table */}
        <div className="relative overflow-x-auto rounded-xl border border-border/50 bg-background/50">
          {recordsLoading ? (
            <div className="flex h-64 w-full items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : !tableData?.records || tableData.records.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              No records found in table <code className="text-primary">{selectedTable}</code>.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider font-bold border-b border-border/40">
                <tr>
                  <th className="p-3">Actions</th>
                  {tableData.schema_info.columns.map((col) => (
                    <th key={col} className="p-3 font-mono whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span>{col}</span>
                        {tableData.schema_info.masked_columns.includes(col) && (
                          <Shield className="h-2.5 w-2.5 text-rose-500" />
                        )}
                        {tableData.schema_info.editable_columns.includes(col) && (
                          <Edit2 className="h-2.5 w-2.5 text-emerald-500" />
                        )}
                        {tableData.schema_info.immutable_columns.includes(col) && (
                          <Lock className="h-2.5 w-2.5 text-muted-foreground/60" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30 font-mono text-[11px]">
                {tableData.records.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-accent/40 transition-colors">
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {currentTableMeta?.editable_fields && currentTableMeta.editable_fields.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(row)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                            title="Edit whitelisted fields"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        )}
                        {currentTableMeta?.is_destructive_allowed && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingRecord(row)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-500"
                            title="Delete record safely"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                    {tableData.schema_info.columns.map((col) => {
                      const val = row[col];
                      const isMasked = val === "[MASKED_SECURITY_FIELD]";
                      return (
                        <td key={col} className="p-3 max-w-xs truncate text-foreground">
                          {isMasked ? (
                            <span className="text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded text-[10px] font-sans">
                              ●●● MASKED
                            </span>
                          ) : val === null || val === undefined ? (
                            <span className="text-muted-foreground/40 italic">null</span>
                          ) : typeof val === "boolean" ? (
                            <Badge
                              variant={val ? "default" : "secondary"}
                              className="text-[9px] px-1 py-0"
                            >
                              {val ? "TRUE" : "FALSE"}
                            </Badge>
                          ) : typeof val === "object" ? (
                            <span className="text-muted-foreground text-[10px]">
                              {JSON.stringify(val).slice(0, 40)}...
                            </span>
                          ) : (
                            String(val)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {tableData && tableData.total_pages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground">
              Page {tableData.page} of {tableData.total_pages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= tableData.total_pages}
                onClick={() => setPage((p) => p + 1)}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Record Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-base text-foreground">
                  Mutate Record in {selectedTable}
                </h3>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                ID: {String(editingRecord.id).slice(0, 8)}...
              </Badge>
            </div>

            <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Editable Fields
                </span>
                {currentTableMeta?.editable_fields.map((field) => (
                  <div key={field} className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-foreground font-mono">{field}</label>
                    <Input
                      value={editUpdates[field] ?? ""}
                      onChange={(e) =>
                        setEditUpdates({
                          ...editUpdates,
                          [field]: e.target.value,
                        })
                      }
                      className="text-xs h-8 font-mono bg-background/60"
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-1 border-t border-border/40 pt-3">
                <label className="text-xs font-bold text-rose-500 flex items-center gap-1">
                  <Shield className="h-3 w-3" /> Audit Reason (Mandatory)
                </label>
                <Input
                  placeholder="e.g. Corrected user role per administrative governance policy"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="text-xs h-8 bg-background/60"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingRecord(null)}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={updateMutation.isPending}
                  className="gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{updateMutation.isPending ? "Saving Diff..." : "Commit Mutation"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safe Delete Record Modal */}
      {deletingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-destructive/50 bg-card p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3 text-destructive border-b border-border/40 pb-3">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="font-bold text-base text-foreground">
                Confirm Safe Record Deletion
              </h3>
            </div>

            <p className="text-xs text-muted-foreground">
              You are about to delete record <code className="font-mono text-foreground font-bold">{String(deletingRecord.id)}</code> from table <code className="font-mono text-primary font-bold">{selectedTable}</code>.
            </p>

            <form onSubmit={handleSaveDelete} className="flex flex-col gap-3">
              {currentTableMeta?.requires_confirmation_to_delete && (
                <div className="flex flex-col gap-1 bg-destructive/10 p-3 rounded-xl border border-destructive/20">
                  <label className="text-xs font-bold text-destructive">
                    Type DELETE to confirm:
                  </label>
                  <Input
                    placeholder="DELETE"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="text-xs h-8 bg-background/80"
                    required
                  />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-foreground">
                  Audit Reason (Mandatory)
                </label>
                <Input
                  placeholder="e.g. Purged invalid test record per Super Admin compliance review"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="text-xs h-8 bg-background/80"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDeletingRecord(null)}
                  disabled={deleteMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  size="sm"
                  disabled={deleteMutation.isPending}
                  className="gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{deleteMutation.isPending ? "Deleting..." : "Permanently Delete"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
