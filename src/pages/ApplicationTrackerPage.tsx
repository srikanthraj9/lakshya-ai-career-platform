import React, { useState } from "react";
import {
  Briefcase,
  Plus,
  Kanban,
  Table as TableIcon,
  TrendingUp,
  Building,
  Sparkles,
} from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ApplicationKanban } from "@/components/applications/ApplicationKanban";
import { ApplicationTable } from "@/components/applications/ApplicationTable";
import { ApplicationFunnelAnalytics } from "@/components/applications/ApplicationFunnelAnalytics";
import { ApplicationDetailModal } from "@/components/applications/ApplicationDetailModal";
import { InterviewDebriefModal } from "@/components/applications/InterviewDebriefModal";
import { CompanyIntelligenceDrawer } from "@/components/applications/CompanyIntelligenceDrawer";
import { ApplicationOutreachModal } from "@/components/applications/ApplicationOutreachModal";
import { AddApplicationModal } from "@/components/applications/AddApplicationModal";
import { useApplications } from "@/hooks/useApplications";
import type { JobApplication } from "@/services/applicationTrackerService";

export default function ApplicationTrackerPage() {
  const {
    applications,
    stats,
    outcomeInsights,
    isLoading,
    isError,
    transitionStage,
    createApplication,
    deleteApplication,
    logDebrief,
    fetchCompanyIntelligence,
  } = useApplications();

  const [activeTab, setActiveTab] = useState<"kanban" | "table" | "analytics">("kanban");
  const [selectedAppForDetail, setSelectedAppForDetail] = useState<JobApplication | null>(null);
  const [selectedAppForDebrief, setSelectedAppForDebrief] = useState<JobApplication | null>(null);
  const [selectedAppForOutreach, setSelectedAppForOutreach] = useState<JobApplication | null>(null);
  const [selectedCompanyForIntel, setSelectedCompanyForIntel] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Sync open modals with current application in state (e.g. after stage transition)
  const activeDetailApp = selectedAppForDetail
    ? applications.find((a) => a.id === selectedAppForDetail.id) || selectedAppForDetail
    : null;

  const activeDebriefApp = selectedAppForDebrief
    ? applications.find((a) => a.id === selectedAppForDebrief.id) || selectedAppForDebrief
    : null;

  const activeOutreachApp = selectedAppForOutreach
    ? applications.find((a) => a.id === selectedAppForOutreach.id) || selectedAppForOutreach
    : null;

  return (
    <PageTransition>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Workspace Banner */}
        <div className="glass-card gradient-border relative overflow-hidden rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <StatusBadge variant="ai" dot>
                Execution Intelligence
              </StatusBadge>
              <span className="text-xs text-muted-foreground">
                • {stats.total_active} Active Applications • {stats.conversion_rate}% Conversion Rate
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setAddModalOpen(true)}
                className="gradient-primary rounded-xl text-xs text-white gap-1.5 shadow-md shadow-primary/25"
              >
                <Plus className="h-3.5 w-3.5" />
                Track Application
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Application Tracker & Outcome Intelligence
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl">
              Track your hiring pipeline from Wishlist to Offer, log real-world interview debriefs, and uncover outcome patterns that feed directly into your career readiness.
            </p>
          </div>

          {/* View Switcher Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-1 bg-secondary/40 p-1 rounded-xl border border-border/50 text-xs">
              <button
                onClick={() => setActiveTab("kanban")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === "kanban" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Kanban className="h-3.5 w-3.5" />
                Kanban Pipeline
              </button>

              <button
                onClick={() => setActiveTab("table")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === "table" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <TableIcon className="h-3.5 w-3.5" />
                Table View
              </button>

              <button
                onClick={() => setActiveTab("analytics")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === "analytics" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                Conversion Analytics & Insights
              </button>
            </div>
          </div>
        </div>

        {/* Error Notice */}
        {isError && (
          <div className="glass-card rounded-2xl p-4 border border-rose-500/30 bg-rose-500/10 flex items-center justify-between text-xs text-rose-300">
            <span>Unable to load live application pipeline data. Please verify your connection.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="text-xs rounded-xl border-rose-500/30 hover:bg-rose-500/20 text-rose-200"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-72 rounded-3xl border border-border/40 bg-secondary/10 p-4 space-y-3">
                <div className="h-4 w-24 bg-secondary/40 rounded-lg" />
                <div className="h-28 w-full bg-secondary/20 rounded-2xl" />
                <div className="h-28 w-full bg-secondary/20 rounded-2xl" />
              </div>
            ))}
          </div>
        )}

        {/* Workspace Body */}
        {!isLoading && activeTab === "kanban" && (
          <ApplicationKanban
            applications={applications}
            onTransition={transitionStage}
            onOpenDetail={setSelectedAppForDetail}
            onOpenDebrief={setSelectedAppForDebrief}
            onOpenCompanyIntel={setSelectedCompanyForIntel}
            onOpenOutreach={setSelectedAppForOutreach}
            onOpenAddModal={() => setAddModalOpen(true)}
            onDelete={deleteApplication}
          />
        )}

        {!isLoading && activeTab === "table" && (
          <ApplicationTable
            applications={applications}
            onTransition={transitionStage}
            onOpenDetail={setSelectedAppForDetail}
            onOpenDebrief={setSelectedAppForDebrief}
            onOpenCompanyIntel={setSelectedCompanyForIntel}
            onOpenOutreach={setSelectedAppForOutreach}
            onDelete={deleteApplication}
          />
        )}

        {!isLoading && activeTab === "analytics" && (
          <ApplicationFunnelAnalytics
            stats={stats}
            outcomeInsights={outcomeInsights}
          />
        )}

        {/* Modals & Drawers */}
        <ApplicationDetailModal
          isOpen={Boolean(activeDetailApp)}
          onClose={() => setSelectedAppForDetail(null)}
          application={activeDetailApp}
          onTransition={transitionStage}
          onOpenDebrief={(app) => {
            setSelectedAppForDetail(null);
            setSelectedAppForDebrief(app);
          }}
        />

        <InterviewDebriefModal
          isOpen={Boolean(activeDebriefApp)}
          onClose={() => setSelectedAppForDebrief(null)}
          application={activeDebriefApp}
          onSaveDebrief={logDebrief}
        />

        <CompanyIntelligenceDrawer
          isOpen={Boolean(selectedCompanyForIntel)}
          onClose={() => setSelectedCompanyForIntel(null)}
          companyName={selectedCompanyForIntel}
          onFetchCompany={fetchCompanyIntelligence}
        />

        <ApplicationOutreachModal
          isOpen={Boolean(activeOutreachApp)}
          onClose={() => setSelectedAppForOutreach(null)}
          application={activeOutreachApp}
        />

        <AddApplicationModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          onCreate={createApplication}
        />
      </div>
    </PageTransition>
  );
}
