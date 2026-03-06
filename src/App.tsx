import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ResumeUploadPage from "./pages/ResumeUploadPage";
import ResumeDetailPage from "./pages/ResumeDetailPage";
import RoleAlignmentPage from "./pages/RoleAlignmentPage";
import InterviewSetupPage from "./pages/InterviewSetupPage";
import InterviewSessionPage from "./pages/InterviewSessionPage";
import InterviewReportPage from "./pages/InterviewReportPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import JobsPage from "./pages/JobsPage";
import ProfilePage from "./pages/ProfilePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected with sidebar layout */}
            <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/resume/upload" element={<ResumeUploadPage />} />
              <Route path="/resume/:id" element={<ResumeDetailPage />} />
              <Route path="/roles/analyze" element={<RoleAlignmentPage />} />
              <Route path="/interview/setup" element={<InterviewSetupPage />} />
              <Route path="/interview/session" element={<InterviewSessionPage />} />
              <Route path="/interview/report/:sessionId" element={<InterviewReportPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
