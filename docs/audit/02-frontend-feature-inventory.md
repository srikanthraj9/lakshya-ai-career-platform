# 02 — Frontend Feature Inventory

**Project:** Lakshya AI Career Platform  
**Repository:** `https://github.com/srikanthraj9/lakshya-ai-career-platform.git`  
**Audit Date:** October 25, 2026  
**Auditor:** Senior Full-Stack Architect & Frontend Specialist  

---

## 1. Complete Route & Feature Map

| Route | Page / Component | Role Requirement | API Services Called | Backend Endpoints | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | `LandingPage.tsx` | Public | None | None | **Connected** |
| `/login` | `LoginPage.tsx` | Public | `authService.login` | `POST /api/v1/auth/login` | **Connected** |
| `/register` | `RegisterPage.tsx` | Public | `authService.register` | `POST /api/v1/auth/register` | **Connected** |
| `/verify-email` | `VerifyEmailPage.tsx` | Public | `authService.verifyEmail`, `resendVerification` | `POST /api/v1/auth/verify-email`, `POST /api/v1/auth/resend-verification` | **Connected** |
| `/forgot-password` | `ForgotPasswordPage.tsx` | Public | `authService.forgotPassword` | `POST /api/v1/auth/forgot-password` | **Connected** |
| `/reset-password` | `ResetPasswordPage.tsx` | Public | `authService.resetPassword` | `POST /api/v1/auth/reset-password` | **Connected** |
| `/onboarding` | `OnboardingPage.tsx` | User (`candidate`) | `profileService.updateProfile` | `POST /api/v1/profile` | **Connected** |
| `/dashboard` | `DashboardPage.tsx` | User (`candidate`) | `dashboardService.getSummary`, `recommendationService` | `GET /api/v1/dashboard/summary`, `GET /api/v1/recommendations` | **Connected** |
| `/profile` | `ProfilePage.tsx` | User (`candidate`) | `profileService.getProfile`, `updateProfile` | `GET /api/v1/profile`, `PUT /api/v1/profile` | **Connected** |
| `/resume` | `ResumePage.tsx` | User (`candidate`) | `resumeService.upload`, `getATSScore`, `rewrite` | `POST /api/v1/resumes/upload`, `GET /api/v1/resumes/{id}/ats`, `POST /api/v1/resumes/rewrite` | **Connected** |
| `/jobs` | `JobTrackerPage.tsx` | User (`candidate`) | `jobService.getApplications`, `addApplication`, `updateApplication` | `GET /api/v1/jobs/applications`, `POST /api/v1/jobs/applications`, `PUT /api/v1/jobs/applications/{id}` | **Connected** |
| `/roadmap` | `RoadmapPage.tsx` | User (`candidate`) | `roadmapService.getRoadmap`, `updateProgress` | `GET /api/v1/roadmap`, `PUT /api/v1/roadmap/progress` | **Connected** |
| `/interview` | `InterviewPage.tsx` | User (`candidate`) | `interviewService.createSession`, `submitAnswer`, `getDebrief` | `POST /api/v1/interview/sessions`, `POST /api/v1/interview/sessions/{id}/answer`, `GET /api/v1/interview/sessions/{id}/debrief` | **Connected** |
| `/copilot` | `CopilotPage.tsx` | User (`candidate`) | `copilotService.sendMessage`, `getHistory` | `POST /api/v1/copilot/chat`, `GET /api/v1/copilot/history` | **Connected** |
| `/passport` | `SkillPassportPage.tsx` | User (`candidate`) | `passportService.getPassport`, `generateShareLink` | `GET /api/v1/passport`, `POST /api/v1/passport/share` | **Orphaned Route Restored** |
| `/passport/shared/:token` | `SharedPassportPage.tsx` | Public | `passportService.getSharedPassport` | `GET /api/v1/passport/shared/{token}` | **Orphaned Route Restored** |
| `/notifications` | `NotificationsPage.tsx` | User (`candidate`) | `notificationService.getNotifications`, `markRead` | `GET /api/v1/notifications`, `PUT /api/v1/notifications/{id}/read` | **Integrated in Drawer & Route** |
| `/admin` | `AdminDashboardPage.tsx` | Admin / Super Admin | `adminService.getOverview` | `GET /api/v1/admin/overview` | **Connected** |
| `/admin/users` | `AdminUsersPage.tsx` | Admin / Super Admin | `adminService.getUsers`, `updateUserRole`, `suspendUser` | `GET /api/v1/admin/users`, `PUT /api/v1/admin/users/{id}`, `POST /api/v1/admin/users/{id}/suspend` | **Connected** |
| `/admin/users/:userId` | `AdminUserWorkspacePage.tsx` | Admin / Super Admin | `adminService.getUserDetails`, `createSimulationSession` | `GET /api/v1/admin/users/{id}`, `POST /api/v1/admin/simulation/start` | **Connected** |
| `/admin/analytics` | `AdminAnalyticsPage.tsx` | Admin / Super Admin | `adminService.getAnalytics` | `GET /api/v1/admin/analytics` | **Connected** |
| `/admin/ai` | `AdminAIPage.tsx` | Admin / Super Admin | `adminService.getAIMetrics` | `GET /api/v1/admin/ai/metrics` | **Connected** |
| `/admin/features` | `AdminFeaturesPage.tsx` | Super Admin | `adminService.getFeatureFlags`, `toggleFeatureFlag` | `GET /api/v1/admin/features`, `POST /api/v1/admin/features/{key}/toggle` | **Connected** |
| `/admin/announcements` | `AdminAnnouncementsPage.tsx` | Admin / Super Admin | `adminService.getAnnouncements`, `createAnnouncement` | `GET /api/v1/admin/announcements`, `POST /api/v1/admin/announcements` | **Connected** |
| `/admin/system` | `AdminSystemPage.tsx` | Admin / Super Admin | `adminService.getSystemHealth` | `GET /api/v1/admin/system/health` | **Connected** |
| `/admin/audit` | `AdminAuditPage.tsx` | Admin / Super Admin | `adminService.getAuditLogs` | `GET /api/v1/admin/audit-logs` | **Connected** |
| `/admin/database` | `AdminDatabasePage.tsx` | Super Admin | `adminService.getDatabaseTables`, `inspectTable` | `GET /api/v1/admin/database/tables`, `GET /api/v1/admin/database/tables/{name}` | **Connected** |

---

## 2. Identified Inconsistencies & Resolutions

1. **Missing Candidate Passport Routes in `App.tsx`:**
   - **Finding:** `SkillPassportPage.tsx` and `SharedPassportPage.tsx` were fully implemented with 100% Vitest coverage, but were omitted from the router in `App.tsx`. Links from `ProfilePage.tsx` and `RoadmapInsights.tsx` pointed to `/skills` and `/passport`, leading to 404s.
   - **Resolution:** Added `/passport` and `/skills` (rendering `SkillPassportPage`) and public `/passport/shared/:token` (rendering `SharedPassportPage`) to `App.tsx`.

2. **Admin Navigation Alignment:**
   - The admin sidebar layout in `AdminSidebar.tsx` supports 10 distinct management modules: Overview, Users, Candidate 360°, Analytics, AI Monitoring, Feature Flags, Announcements, System Health, Audit Logs, and Database Integrity.
   - All modules use unified navigation with active route highlighting, role-based visibility badges (Super Admin badge for Database and Feature Flags), and live simulation mode warning banner (`ViewAsBanner.tsx`).

3. **Client-Side State Management:**
   - React Query (`@tanstack/react-query`) handles server data caching and refetching with default stale times.
   - `AuthContext` maintains the authenticated user record, tokens, and active role permissions.
   - Responsive layout utilizes Tailwind CSS with accessible modal dialogues, mobile hamburger menus, and ARIA attributes.
