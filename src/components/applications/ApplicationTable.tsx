import React, { useState } from "react";
import {
  Search,
  Filter,
  MoreVertical,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Building,
  DollarSign,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APPLICATION_STAGES, type JobApplication } from "@/services/applicationTrackerService";

interface ApplicationTableProps {
  applications: JobApplication[];
  onTransition: (id: string, stage: string) => void;
  onOpenDetail: (app: JobApplication) => void;
  onOpenDebrief: (app: JobApplication) => void;
  onOpenCompanyIntel: (companyName: string) => void;
  onOpenOutreach: (app: JobApplication) => void;
  onDelete: (id: string) => void;
}

export function ApplicationTable({
  applications,
  onTransition,
  onOpenDetail,
  onOpenDebrief,
  onOpenCompanyIntel,
  onOpenOutreach,
  onDelete,
}: ApplicationTableProps) {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");

  const filtered = applications.filter((app) => {
    const matchesSearch =
      app.company_name.toLowerCase().includes(search.toLowerCase()) ||
      app.job_title.toLowerCase().includes(search.toLowerCase()) ||
      (app.location && app.location.toLowerCase().includes(search.toLowerCase()));
    const matchesStage = stageFilter === "all" || app.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const getStageBadge = (stageId: string) => {
    switch (stageId) {
      case "offer":
        return <StatusBadge variant="success" dot>Offer</StatusBadge>;
      case "interviewing":
        return <StatusBadge variant="warning" dot>Interviewing</StatusBadge>;
      case "screening":
        return <StatusBadge variant="ai" dot>Screening</StatusBadge>;
      case "applied":
        return <StatusBadge variant="default" dot>Applied</StatusBadge>;
      case "closed":
        return <StatusBadge variant="neutral">Closed</StatusBadge>;
      default:
        return <StatusBadge variant="neutral">Wishlist</StatusBadge>;
    }
  };

  return (
    <div className="glass-card rounded-3xl p-6 space-y-4">
      {/* Search & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/50">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, title, or location..."
            className="pl-9 rounded-xl border-border/60 bg-secondary/30 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="rounded-xl border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Stages ({applications.length})</option>
            {APPLICATION_STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border/60 text-muted-foreground uppercase tracking-wider text-[10px]">
              <th className="py-3 px-3">Company & Role</th>
              <th className="py-3 px-3">Stage</th>
              <th className="py-3 px-3">Fit Score</th>
              <th className="py-3 px-3">Salary Band</th>
              <th className="py-3 px-3">Next Action</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {filtered.map((app) => (
              <tr key={app.id} className="hover:bg-secondary/20 transition-colors group">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-[11px] border border-primary/20">
                      {app.company_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <button
                        onClick={() => onOpenCompanyIntel(app.company_name)}
                        className="font-bold text-foreground hover:text-primary transition-colors text-xs block text-left"
                      >
                        {app.company_name}
                      </button>
                      <p className="text-[11px] text-muted-foreground">{app.job_title}</p>
                    </div>
                  </div>
                </td>

                <td className="py-3 px-3">
                  {getStageBadge(app.stage)}
                </td>

                <td className="py-3 px-3">
                  <span className="font-bold text-primary">{Math.round(app.match_score_at_application)}%</span>
                </td>

                <td className="py-3 px-3 text-muted-foreground">
                  {app.salary_range || "—"}
                </td>

                <td className="py-3 px-3">
                  {app.next_step_notes ? (
                    <span className="text-foreground text-[11px] truncate max-w-[180px] block">
                      {app.next_step_notes}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>

                <td className="py-3 px-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenDetail(app)}
                      className="h-7 px-2 rounded-lg text-xs"
                    >
                      Details
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg text-muted-foreground">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 bg-popover/95 backdrop-blur-xl border-border/80 text-xs">
                        <DropdownMenuItem onClick={() => onOpenDebrief(app)} className="cursor-pointer text-accent">
                          Log Interview Debrief
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onOpenOutreach(app)} className="cursor-pointer text-primary">
                          ✨ AI Outreach Generator
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onOpenCompanyIntel(app.company_name)} className="cursor-pointer">
                          Company Intel Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(app.id)} className="cursor-pointer text-destructive focus:text-destructive">
                          <Trash2 className="h-3 w-3 mr-1.5" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No applications match your filter criteria.
          </div>
        )}
      </div>
    </div>
  );
}
