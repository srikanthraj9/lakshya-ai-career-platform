import React from "react";
import { ShieldCheck, Calendar, User, Tag, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AdminAuditLog } from "@/types";

interface AuditLogTableProps {
  logs: AdminAuditLog[];
  isLoading: boolean;
}

export function AuditLogTable({ logs, isLoading }: AuditLogTableProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl shadow-sm overflow-hidden">
      <div className="border-b border-border/50 bg-muted/40 px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span className="font-bold text-sm text-foreground">Immutable Platform Audit Trail</span>
        </div>
        <Badge variant="outline" className="text-[10px]">
          {logs.length} Recorded Actions
        </Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border/50 bg-muted/20 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            <tr>
              <th className="px-5 py-3">Timestamp</th>
              <th className="px-4 py-3">Admin Action</th>
              <th className="px-4 py-3">Resource Target</th>
              <th className="px-5 py-3">Metadata Context</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 font-normal">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-xs text-muted-foreground">
                  Loading audit trail...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-xs text-muted-foreground">
                  No administrative actions recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold font-mono ${
                        log.action_type.includes("SUSPEND")
                          ? "border-destructive/30 text-destructive bg-destructive/5"
                          : log.action_type.includes("ACTIVATE")
                          ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5"
                          : log.action_type.includes("UPDATE")
                          ? "border-amber-500/30 text-amber-500 bg-amber-500/5"
                          : "border-primary/30 text-primary bg-primary/5"
                      }`}
                    >
                      {log.action_type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-foreground font-mono">
                    {log.target_user_id ? (
                      <span className="truncate max-w-[140px] inline-block">{log.target_user_id}</span>
                    ) : (
                      <span className="text-muted-foreground italic">Platform Wide</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground font-mono">
                    <pre className="text-[11px] bg-muted/40 p-1.5 rounded-lg max-w-md overflow-x-auto">
                      {JSON.stringify(log.action_metadata, null, 1)}
                    </pre>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
