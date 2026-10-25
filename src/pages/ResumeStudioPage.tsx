import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { PageTransition } from "@/components/PageTransition";
import { ErrorFallback } from "@/components/ErrorFallback";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { ResumeStudioHeader } from "@/components/resume/ResumeStudioHeader";
import { ResumeStudioTabs, type ResumeStudioTab } from "@/components/resume/ResumeStudioTabs";
import { ResumeOverview } from "@/components/resume/ResumeOverview";
import { ATSDiagnostics } from "@/components/resume/ATSDiagnostics";
import { SkillIntelligence } from "@/components/resume/SkillIntelligence";
import { ResumeOptimize } from "@/components/resume/ResumeOptimize";
import { ResumeHistory } from "@/components/resume/ResumeHistory";
import { ResumeEmptyState } from "@/components/resume/ResumeEmptyState";

import { useAuth } from "@/context/AuthContext";
import { resumeService } from "@/services/resume";
import { getApiErrorMessage } from "@/services/api";
import { queryKeys } from "@/lib/queryKeys";
import { getUserStorage, setUserStorage, removeUserStorage } from "@/lib/userStorage";
import type { ResumeListItem, ResumeDetail } from "@/types";

interface ResumeStudioPageProps {
  initialTab?: ResumeStudioTab;
  resumeId?: string;
  autoOpenUpload?: boolean;
}

const RESUME_ID_KEY = "resumeId";

export default function ResumeStudioPage({
  initialTab = "overview",
  resumeId: propResumeId,
  autoOpenUpload = false,
}: ResumeStudioPageProps) {
  const { user } = useAuth();
  const userId = user?.id;

  const { id: urlParamId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const queryTab = searchParams.get("tab") as ResumeStudioTab | null;

  const validTabs: ResumeStudioTab[] = ["overview", "ats", "skills", "optimize", "history"];
  const resolveInitialTab = (): ResumeStudioTab => {
    if (queryTab && validTabs.includes(queryTab)) return queryTab;
    if (initialTab === ("diagnostics" as any)) return "ats";
    if (initialTab && validTabs.includes(initialTab)) return initialTab;
    return "overview";
  };

  const [activeTab, setActiveTab] = useState<ResumeStudioTab>(resolveInitialTab);
  const [uploadModalOpen, setUploadModalOpen] = useState(autoOpenUpload);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Sync tab with URL search parameter if it changes externally
  useEffect(() => {
    if (queryTab && validTabs.includes(queryTab) && queryTab !== activeTab) {
      setActiveTab(queryTab);
    }
  }, [queryTab, activeTab]);

  const handleTabChange = useCallback((tab: ResumeStudioTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(location.search);
    params.set("tab", tab);
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  }, [location.pathname, location.search, navigate]);

  // 1. Fetch user's stored resume list — strictly scoped to authenticated user
  const { data: resumeList = [], isLoading: isListLoading, refetch: refetchList } = useQuery<ResumeListItem[]>({
    queryKey: queryKeys.resumes.list(userId || ""),
    queryFn: resumeService.listResumes,
    enabled: Boolean(userId),
    retry: 2,
  });

  // 2. Resolve Active Resume ID (Priority: propResumeId -> urlParamId -> userStorage -> first resume in list)
  const activeResumeId = useMemo(() => {
    if (propResumeId) return propResumeId;
    if (urlParamId) return urlParamId;

    const savedId = getUserStorage<string>(userId, RESUME_ID_KEY, null);
    if (savedId && resumeList.some((r) => r.id === savedId)) {
      return savedId;
    }

    return resumeList[0]?.id || null;
  }, [propResumeId, urlParamId, resumeList, userId]);

  // Save selected resumeId to user-scoped storage
  useEffect(() => {
    if (userId && activeResumeId) {
      setUserStorage(userId, RESUME_ID_KEY, activeResumeId);
    }
  }, [userId, activeResumeId]);

  // 3. Query full details for active resume
  const {
    data: activeResume,
    isLoading: isResumeLoading,
    isError: isResumeError,
    refetch: refetchActiveResume,
  } = useQuery<ResumeDetail>({
    queryKey: queryKeys.resumes.detail(userId || "", activeResumeId || ""),
    queryFn: () => resumeService.getResume(activeResumeId!),
    enabled: Boolean(userId && activeResumeId),
    retry: 2,
  });

  // Handle Switching Active Resume while preserving active tab
  const handleSelectResume = useCallback((id: string) => {
    if (userId) {
      setUserStorage(userId, RESUME_ID_KEY, id);
    }
    const currentTab = activeTab;
    navigate(`/resume/${id}?tab=${currentTab}`);
  }, [userId, navigate, activeTab]);

  // Upload Mutation
  const handleUploadFile = useCallback(async (file: File) => {
    if (!file || !userId) return;
    try {
      if (resumeList.length >= 10) {
        toast.error("Maximum 10 resumes allowed. Please delete an older version first.");
        return;
      }

      setIsUploading(true);
      setUploadProgress(10);

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 85) {
            clearInterval(progressInterval);
            return 85;
          }
          return prev + 15;
        });
      }, 150);

      const uploaded = await resumeService.upload(file);
      clearInterval(progressInterval);
      setUploadProgress(100);

      setUserStorage(userId, RESUME_ID_KEY, uploaded.id);
      setUserStorage(userId, "resumeFileName", file.name);

      await queryClient.invalidateQueries({ queryKey: queryKeys.resumes.all(userId) });

      toast.success("Resume uploaded and analyzed successfully!");
      setUploadModalOpen(false);
      navigate(`/resume/${uploaded.id}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [userId, resumeList, queryClient, navigate]);

  // Download Original PDF
  const handleDownloadOriginal = useCallback(async () => {
    if (!activeResumeId || !activeResume) return;
    try {
      setIsDownloading(true);
      const blob = await resumeService.downloadResumeFile(activeResumeId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = activeResume.file_name || activeResume.original_filename || "resume.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch (err) {
      toast.error("Original file could not be downloaded from storage.");
    } finally {
      setIsDownloading(false);
    }
  }, [activeResumeId, activeResume]);

  // Delete Resume Action
  const handleDeleteResume = useCallback(async (idToDelete?: string) => {
    const targetId = idToDelete || activeResumeId;
    if (!targetId || !userId) return;

    try {
      await resumeService.deleteResume(targetId);
      toast.success("Resume deleted");
      removeUserStorage(userId, RESUME_ID_KEY);
      await queryClient.invalidateQueries({ queryKey: queryKeys.resumes.all(userId) });
      navigate("/resume");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }, [userId, activeResumeId, queryClient, navigate]);

  // Loading State
  if (isListLoading || (activeResumeId && isResumeLoading)) {
    return (
      <PageTransition>
        <div className="space-y-6 max-w-7xl mx-auto" role="status" aria-label="Loading resume studio">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-12 w-96 rounded-xl" />
          <div className="grid gap-6 lg:grid-cols-12">
            <Skeleton className="lg:col-span-5 h-[500px] rounded-3xl" />
            <Skeleton className="lg:col-span-7 h-[500px] rounded-3xl" />
          </div>
        </div>
      </PageTransition>
    );
  }

  // No Resumes Uploaded Yet -> Empty State
  if (!activeResumeId && resumeList.length === 0) {
    return (
      <PageTransition>
        <div className="max-w-7xl mx-auto space-y-6">
          <ResumeEmptyState
            onFileSelected={handleUploadFile}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
          />
        </div>
      </PageTransition>
    );
  }

  if (isResumeError) {
    return (
      <PageTransition>
        <div className="space-y-6 max-w-xl mx-auto py-16 text-center">
          <ErrorFallback
            title="Resume Load Failed"
            message="We couldn't retrieve this resume version. It may not exist or may have been deleted."
            onRetry={() => refetchActiveResume()}
          />
          {resumeList.length > 0 && (
            <div className="pt-2">
              <Button
                variant="gradient"
                size="sm"
                onClick={() => {
                  const fallbackId = resumeList[0]?.id;
                  if (fallbackId) handleSelectResume(fallbackId);
                  else navigate("/resume");
                }}
                className="gap-2 text-xs font-semibold"
              >
                <span>View Stored Resume ({resumeList[0]?.file_name || "Latest"})</span>
              </Button>
            </div>
          )}
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-8 max-w-7xl mx-auto pb-12">
        {/* Studio Header: Resumes list selector, ATS score preview, upload & download CTAs */}
        <ResumeStudioHeader
          resumes={resumeList}
          activeResumeId={activeResumeId}
          activeResumeName={activeResume?.file_name || activeResume?.original_filename}
          activeAtsScore={activeResume?.ats_score}
          onSelectResume={handleSelectResume}
          onOpenUpload={() => setUploadModalOpen(true)}
          onDownloadOriginal={handleDownloadOriginal}
          onDeleteResume={handleDeleteResume}
          isDownloading={isDownloading}
        />

        {/* Studio Tabs Navigation */}
        <ResumeStudioTabs activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Tab Panels */}
        <AnimatePresence mode="wait">
          {activeTab === "overview" && activeResume && (
            <motion.div
              key="tab-overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ResumeOverview
                resume={activeResume}
                onDownloadOriginal={handleDownloadOriginal}
                isDownloading={isDownloading}
                onSwitchTab={handleTabChange}
              />
            </motion.div>
          )}

          {activeTab === "ats" && (
            <motion.div
              key="tab-ats"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ATSDiagnostics
                resume={activeResume || null}
                isLoading={isResumeLoading}
                isError={isResumeError}
                onRetry={() => refetchActiveResume()}
                onOptimize={() => handleTabChange("optimize")}
                onViewSkills={() => handleTabChange("skills")}
                onOpenUpload={() => setUploadModalOpen(true)}
              />
            </motion.div>
          )}

          {activeTab === "skills" && (
            <motion.div
              key="tab-skills"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <SkillIntelligence
                resume={activeResume || null}
                isLoading={isResumeLoading}
                isError={isResumeError}
                onRetry={() => refetchActiveResume()}
                onOptimize={() => handleTabChange("optimize")}
                onOpenUpload={() => setUploadModalOpen(true)}
              />
            </motion.div>
          )}

          {activeTab === "optimize" && (
            <motion.div
              key="tab-optimize"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ResumeOptimize resume={activeResume || null} />
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div
              key="tab-history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ResumeHistory
                resumes={resumeList}
                activeResumeId={activeResumeId}
                onSelectResume={handleSelectResume}
                onOpenUpload={() => setUploadModalOpen(true)}
                onDeleteResume={handleDeleteResume}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Upload Dialog */}
        <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upload New Resume Version</DialogTitle>
            </DialogHeader>
            <ResumeEmptyState
              onFileSelected={handleUploadFile}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
            />
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
