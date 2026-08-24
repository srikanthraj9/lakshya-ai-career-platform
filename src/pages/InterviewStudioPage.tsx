import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { PageTransition } from "@/components/PageTransition";
import { ErrorFallback } from "@/components/ErrorFallback";
import { Skeleton } from "@/components/ui/skeleton";

import {
  InterviewStudioHeader,
  type InterviewMode,
  type InterviewStage,
} from "@/components/interview/InterviewStudioHeader";
import { InterviewSetup } from "@/components/interview/InterviewSetup";
import { TextInterviewSession } from "@/components/interview/TextInterviewSession";
import { VoiceInterviewSession } from "@/components/interview/VoiceInterviewSession";
import { InterviewReport } from "@/components/interview/InterviewReport";
import { InterviewHistory } from "@/components/interview/InterviewHistory";

import { interviewService } from "@/services/interview";
import { getApiErrorMessage } from "@/services/api";
import type { InterviewSession, InterviewSessionListItem, InterviewReport as InterviewReportType } from "@/types";

interface InterviewStudioPageProps {
  initialStage?: InterviewStage;
  mode?: InterviewMode;
}

export default function InterviewStudioPage({
  initialStage = "setup",
  mode: propMode = "text",
}: InterviewStudioPageProps) {
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<InterviewMode>(propMode);
  const [stage, setStage] = useState<InterviewStage>(
    urlSessionId ? "report" : initialStage
  );
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Active Session State
  const passedSession = (location.state as { session?: InterviewSession } | null)?.session ?? null;
  const [activeSession, setActiveSession] = useState<InterviewSession | null>(passedSession);
  const [reportSessionId, setReportSessionId] = useState<string | null>(urlSessionId || null);

  // Sync mode if prop changes
  useEffect(() => {
    if (propMode) {
      setMode(propMode);
    }
  }, [propMode]);

  // Sync stage if urlSessionId is present
  useEffect(() => {
    if (urlSessionId) {
      setReportSessionId(urlSessionId);
      setStage("report");
    }
  }, [urlSessionId]);

  // 1. Fetch Past Sessions List
  const { data: pastSessions = [], isLoading: isHistoryLoading, refetch: refetchHistory } = useQuery<InterviewSessionListItem[]>({
    queryKey: ["interview-sessions-list"],
    queryFn: interviewService.listSessions,
    retry: 2,
  });

  // 2. Fetch Report Data if in report stage
  const {
    data: reportData,
    isLoading: isReportLoading,
    isError: isReportError,
    refetch: refetchReport,
  } = useQuery<InterviewReportType>({
    queryKey: ["interview-report", reportSessionId],
    queryFn: () => interviewService.getReport(reportSessionId!),
    enabled: Boolean(reportSessionId && stage === "report"),
    retry: 2,
  });

  // Start New Session Action
  const handleStartSession = useCallback(
    async (role: string, difficulty: string, selectedMode: InterviewMode) => {
      setMode(selectedMode);

      if (selectedMode === "voice") {
        setStage("active");
        return;
      }

      setIsStarting(true);
      try {
        const session = await interviewService.start(role, difficulty, selectedMode);
        setActiveSession(session);
        setStage("active");
        await queryClient.invalidateQueries({ queryKey: ["interview-sessions-list"] });
      } catch (err) {
        toast.error(getApiErrorMessage(err));
      } finally {
        setIsStarting(false);
      }
    },
    [queryClient]
  );

  // Session Completion Callback
  const handleSessionComplete = useCallback((completedSessionId: string) => {
    setReportSessionId(completedSessionId);
    setStage("report");
    navigate(`/interview/report/${completedSessionId}`);
  }, [navigate]);

  // Reset to Setup
  const handleResetToSetup = useCallback(() => {
    setActiveSession(null);
    setReportSessionId(null);
    setStage("setup");
    setIsHistoryOpen(false);
    navigate("/interview");
  }, [navigate]);

  // Resume Incomplete Session
  const handleResumeSession = useCallback((s: InterviewSessionListItem) => {
    setActiveSession({
      session_id: s.id,
      role: s.role,
      difficulty: s.difficulty,
      mode: s.mode,
      question: "",
      question_index: s.current_index + 1,
      total_questions: s.total_questions,
      remaining_seconds: 45,
    });
    setMode((s.mode as InterviewMode) || "text");
    setStage("active");
    setIsHistoryOpen(false);
  }, []);

  return (
    <PageTransition>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Top Header */}
        <InterviewStudioHeader
          mode={mode}
          stage={stage}
          onModeChange={setMode}
          onNewSession={handleResetToSetup}
          onViewHistory={() => setIsHistoryOpen(!isHistoryOpen)}
          isHistoryOpen={isHistoryOpen}
        />

        {/* History Drawer / Section */}
        <AnimatePresence>
          {isHistoryOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden pb-4"
            >
              <InterviewHistory
                sessions={pastSessions}
                isLoading={isHistoryLoading}
                onOpenReport={(id) => {
                  setReportSessionId(id);
                  setStage("report");
                  setIsHistoryOpen(false);
                  navigate(`/interview/report/${id}`);
                }}
                onResumeSession={handleResumeSession}
                onStartNew={handleResetToSetup}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Workspace Stages */}
        <AnimatePresence mode="wait">
          {stage === "setup" && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <InterviewSetup
                initialRole={targetRole && targetRole !== "No Target Role Selected" ? targetRole : ""}
                initialMode={mode}
                onStartSession={handleStartSession}
                isLoading={isStarting}
              />
            </motion.div>
          )}

          {stage === "active" && mode === "text" && activeSession && (
            <motion.div
              key="active-text"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <TextInterviewSession
                session={activeSession}
                onComplete={handleSessionComplete}
                onExit={handleResetToSetup}
              />
            </motion.div>
          )}

          {stage === "active" && mode === "voice" && (
            <motion.div
              key="active-voice"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <VoiceInterviewSession
                role={activeSession?.role || (targetRole && targetRole !== "No Target Role Selected" ? targetRole : "Candidate")}
                onExit={handleResetToSetup}
              />
            </motion.div>
          )}

          {stage === "report" && (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {isReportLoading ? (
                <div className="space-y-4 max-w-4xl mx-auto">
                  <Skeleton className="h-28 w-full rounded-3xl" />
                  <div className="grid gap-4 sm:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-24 rounded-2xl" />
                    ))}
                  </div>
                </div>
              ) : isReportError ? (
                <ErrorFallback
                  title="Report Load Failed"
                  message="We couldn't retrieve this interview performance report."
                  onRetry={() => refetchReport()}
                />
              ) : reportData ? (
                <InterviewReport
                  report={reportData}
                  onNewInterview={handleResetToSetup}
                />
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
