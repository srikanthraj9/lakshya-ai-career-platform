import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CareerProvider } from "@/context/CareerContext";
import { CareerIntelligenceProvider } from "@/context/CareerIntelligenceContext";
import { ApplicationProvider } from "@/context/ApplicationContext";
import { ActivityProvider } from "@/context/ActivityContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TopLoadingBar } from "@/components/TopLoadingBar";
import { PageLoader } from "@/components/PageLoader";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const AuthCallbackPage = lazy(() => import("./pages/AuthCallbackPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const CareerIntelligencePage = lazy(() => import("./pages/CareerIntelligencePage"));
const ApplicationTrackerPage = lazy(() => import("./pages/ApplicationTrackerPage"));
const ResumeStudioPage = lazy(() => import("./pages/ResumeStudioPage"));
const ResumeUploadPage = lazy(() => import("./pages/ResumeUploadPage"));
const ResumeViewPage = lazy(() => import("./pages/ResumeViewPage"));
const ResumeRewritePage = lazy(() => import("./pages/ResumeRewritePage"));
const RoleAlignmentPage = lazy(() => import("./pages/RoleAlignmentPage"));
const RoadmapPage = lazy(() => import("./pages/RoadmapPage"));
const InterviewStudioPage = lazy(() => import("./pages/InterviewStudioPage"));
const InterviewSetupPage = lazy(() => import("./pages/InterviewSetupPage"));
const InterviewSessionPage = lazy(() => import("./pages/InterviewSessionPage"));
const InterviewReportPage = lazy(() => import("./pages/InterviewReportPage"));
const VoiceInterviewPage = lazy(() => import("./pages/VoiceInterviewPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const JobsPage = lazy(() => import("./pages/JobsPage"));
const LiveJobsPage = lazy(() => import("./pages/LiveJobsPage"));
const CopilotPage = lazy(() => import("./pages/CopilotPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SkillPassportPage = lazy(() => import("./pages/SkillPassportPage"));
const SharedPassportPage = lazy(() => import("./pages/SharedPassportPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Admin Control Center Workspaces
const AdminRoute = lazy(() => import("./components/admin/AdminRoute").then(m => ({ default: m.AdminRoute })));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout").then(m => ({ default: m.AdminLayout })));
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage").then(m => ({ default: m.AdminDashboardPage })));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage").then(m => ({ default: m.AdminUsersPage })));
const AdminUserWorkspacePage = lazy(() => import("./pages/admin/AdminUserWorkspacePage").then(m => ({ default: m.AdminUserWorkspacePage })));
const AdminAnalyticsPage = lazy(() => import("./pages/admin/AdminAnalyticsPage").then(m => ({ default: m.AdminAnalyticsPage })));
const AdminAIPage = lazy(() => import("./pages/admin/AdminAIPage").then(m => ({ default: m.AdminAIPage })));
const AdminFeaturesPage = lazy(() => import("./pages/admin/AdminFeaturesPage").then(m => ({ default: m.AdminFeaturesPage })));
const AdminAnnouncementsPage = lazy(() => import("./pages/admin/AdminAnnouncementsPage").then(m => ({ default: m.AdminAnnouncementsPage })));
const AdminSystemPage = lazy(() => import("./pages/admin/AdminSystemPage").then(m => ({ default: m.AdminSystemPage })));
const AdminAlertsPage = lazy(() => import("./pages/admin/AdminAlertsPage").then(m => ({ default: m.AdminAlertsPage })));
const AdminAuditPage = lazy(() => import("./pages/admin/AdminAuditPage").then(m => ({ default: m.AdminAuditPage })));
const AdminDatabasePage = lazy(() => import("./pages/admin/AdminDatabasePage").then(m => ({ default: m.AdminDatabasePage })));
import { ViewAsBanner } from "./components/admin/ViewAsBanner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function AuthenticatedUserScope({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const scopeKey = user?.id ? `user-${user.id}` : "guest";

  return (
    <CareerProvider key={`career-${scopeKey}`}>
      <CareerIntelligenceProvider key={`intel-${scopeKey}`}>
        <ApplicationProvider key={`apps-${scopeKey}`}>
          <ActivityProvider key={`act-${scopeKey}`}>
            <NotificationProvider key={`notif-${scopeKey}`}>
              {children}
            </NotificationProvider>
          </ActivityProvider>
        </ApplicationProvider>
      </CareerIntelligenceProvider>
    </CareerProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AuthenticatedUserScope>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ViewAsBanner />
            <TopLoadingBar />
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/verify-email" element={<VerifyEmailPage />} />
                  <Route path="/onboarding" element={<OnboardingPage />} />
                  <Route path="/auth/callback" element={<AuthCallbackPage />} />
                  <Route path="/passport/shared/:token" element={<SharedPassportPage />} />

                  {/* Protected with sidebar layout */}
                  <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/intelligence" element={<CareerIntelligencePage />} />
                    <Route path="/applications" element={<ApplicationTrackerPage />} />

                    <Route path="/resume" element={<ResumeStudioPage />} />
                    <Route path="/resume/upload" element={<ResumeUploadPage />} />
                    <Route path="/resume/:id" element={<ResumeViewPage />} />
                    <Route path="/resume/rewrite" element={<ResumeRewritePage />} />
                    <Route path="/roles/analyze" element={<RoleAlignmentPage />} />
                    <Route path="/roadmap" element={<RoadmapPage />} />
                    <Route path="/interview" element={<InterviewStudioPage />} />
                    <Route path="/interview/setup" element={<InterviewSetupPage />} />
                    <Route path="/interview/session" element={<InterviewSessionPage />} />
                    <Route path="/interview/report/:sessionId" element={<InterviewReportPage />} />
                    <Route path="/interview/voice-ai" element={<VoiceInterviewPage />} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/jobs" element={<JobsPage />} />
                    <Route path="/jobs/live" element={<LiveJobsPage />} />
                    <Route path="/copilot" element={<CopilotPage />} />
                    <Route path="/passport" element={<SkillPassportPage />} />
                    <Route path="/skills" element={<SkillPassportPage />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                  </Route>

                  {/* Admin Control Center Protected Routes */}
                  <Route element={<AdminRoute />}>
                    <Route element={<AdminLayout />}>
                      <Route path="/admin" element={<AdminDashboardPage />} />
                      <Route path="/admin/users" element={<AdminUsersPage />} />
                      <Route path="/admin/users/:userId" element={<AdminUserWorkspacePage />} />
                      <Route path="/admin/users/:userId/360" element={<AdminUserWorkspacePage />} />
                      <Route path="/admin/users/:userId/workspace" element={<AdminUserWorkspacePage />} />
                      <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
                      <Route path="/admin/ai" element={<AdminAIPage />} />
                      <Route path="/admin/features" element={<AdminFeaturesPage />} />
                      <Route path="/admin/announcements" element={<AdminAnnouncementsPage />} />
                      <Route path="/admin/system" element={<AdminSystemPage />} />
                      <Route path="/admin/alerts" element={<AdminAlertsPage />} />
                      <Route path="/admin/audit" element={<AdminAuditPage />} />
                      <Route path="/admin/database" element={<AdminDatabasePage />} />
                    </Route>
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </AuthenticatedUserScope>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
