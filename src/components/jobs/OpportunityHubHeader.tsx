import React from "react";
import { Briefcase, Search, MapPin, Filter, Sparkles, SlidersHorizontal, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useCareerContext } from "@/hooks/useCareerContext";

interface OpportunityHubHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  locationFilter: string;
  onLocationChange: (loc: string) => void;
  typeFilter: string;
  onTypeChange: (type: string) => void;
  totalJobs: number;
}

export function OpportunityHubHeader({
  searchQuery,
  onSearchChange,
  locationFilter,
  onLocationChange,
  typeFilter,
  onTypeChange,
  totalJobs,
}: OpportunityHubHeaderProps) {
  const { targetRole } = useCareerContext();

  return (
    <div className="glass-card gradient-border relative overflow-hidden rounded-3xl p-6 sm:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Title & Context */}
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge variant="ai" dot>
              Opportunity Intelligence Hub
            </StatusBadge>
            <span className="text-xs text-muted-foreground">• {totalJobs} Active Matches</span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Market Openings & Targeted Opportunities
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            AI-matched job positions tailored to your verified skills for {targetRole}. Compare compatibility, identify gaps, and tailor targeted resumes with 1 click.
          </p>
        </div>

        {/* Right: Target Role Pill */}
        <div className="flex items-center gap-3 self-start lg:self-auto shrink-0 bg-secondary/30 border border-border/60 rounded-2xl p-3.5">
          <div className="space-y-0.5 text-left">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Target Role Scope</span>
            <p className="text-xs font-semibold text-foreground truncate max-w-[160px]">{targetRole}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/30 text-primary">
            <Briefcase className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid gap-3 sm:grid-cols-12 pt-3 border-t border-border/50">
        <div className="relative sm:col-span-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by title, technology, or company..."
            className="pl-9 h-10 rounded-xl bg-secondary/30 border-border/80 text-xs font-medium"
          />
        </div>

        <div className="relative sm:col-span-3">
          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={locationFilter}
            onChange={(e) => onLocationChange(e.target.value)}
            placeholder="Filter location (e.g. Remote)"
            className="pl-9 h-10 rounded-xl bg-secondary/30 border-border/80 text-xs font-medium"
          />
        </div>

        <div className="sm:col-span-3">
          <Select value={typeFilter} onValueChange={onTypeChange}>
            <SelectTrigger className="h-10 rounded-xl bg-secondary/30 border-border/80 text-xs">
              <SelectValue placeholder="Work Arrangement" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border bg-popover">
              <SelectItem value="all">All Arrangements</SelectItem>
              <SelectItem value="remote">Remote Only</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
              <SelectItem value="onsite">On-Site</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
