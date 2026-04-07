import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TopLoadingBar } from "@/components/TopLoadingBar";
import { PageLoader } from "@/components/PageLoader";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ResumeUploadPage = lazy(() => import("./pages/ResumeUploadPage"));
const ResumeViewPage = lazy(() => import("./pages/ResumeViewPage"));
const ResumeRewritePage = lazy(() => import("./pages/ResumeRewritePage"));
const RoleAlignmentPage = lazy(() => import("./pages/RoleAlignmentPage"));
const RoadmapPage = lazy(() => import("./pages/RoadmapPage"));
const InterviewSetupPage = lazy(() => import("./pages/InterviewSetupPage"));
const InterviewSessionPage = lazy(() => import("./pages/InterviewSessionPage"));
const InterviewReportPage = lazy(() => import("./pages/InterviewReportPage"));
const VoiceInterviewPage = lazy(() => import("./pages/VoiceInterviewPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const JobsPage = lazy(() => import("./pages/JobsPage"));
const LiveJobsPage = lazy(() => import("./pages/LiveJobsPage"));
const CopilotPage = lazy(() => import("./pages/CopilotPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <TopLoadingBar />
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Protected with sidebar layout */}
                <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/resume/upload" element={<ResumeUploadPage />} />
                  <Route path="/resume/:id" element={<ResumeViewPage />} />
                  <Route path="/resume/rewrite" element={<ResumeRewritePage />} />
                  <Route path="/roles/analyze" element={<RoleAlignmentPage />} />
                  <Route path="/roadmap" element={<RoadmapPage />} />
                  <Route path="/interview/setup" element={<InterviewSetupPage />} />
                  <Route path="/interview/session" element={<InterviewSessionPage />} />
                  <Route path="/interview/report/:sessionId" element={<InterviewReportPage />} />
                  <Route path="/interview/voice-ai" element={<VoiceInterviewPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/jobs" element={<JobsPage />} />
                  <Route path="/jobs/live" element={<LiveJobsPage />} />
                  <Route path="/copilot" element={<CopilotPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
