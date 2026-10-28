# 06 — Existing Admin Dashboard Audit

**Project:** Lakshya AI Career Platform  
**Repository:** `https://github.com/srikanthraj9/lakshya-ai-career-platform.git`  
**Audit Date:** October 25, 2026  
**Auditor:** Full-Stack Architect & QA Lead  

---

## 1. Existing Admin Architecture Discovered

Rather than having no admin features or a detached template, the Lakshya AI repository already contained a dedicated, sophisticated admin control system across frontend and backend:

### A. Frontend Architecture
- **Route Guard:** `src/components/admin/AdminRoute.tsx`
  - Validates `user && (user.role === 'admin' || user.role === 'super_admin')`.
  - Redirects unauthorized users to `/dashboard` with warning notification.
- **Admin Layout Shell:** `src/components/admin/AdminLayout.tsx`
  - Encapsulates `AdminSidebar.tsx`, `AdminHeader.tsx`, and `ViewAsBanner.tsx`.
  - Provides responsive layout with collapsible mobile drawer.
- **View As Candidate Simulation:**
  - `ViewAsBanner.tsx` displays active impersonation session with target user details.
  - Includes "Exit Simulation" button that clears `X-Simulation-Token` and returns to Admin Workspace.
- **Admin Views:** 10 dedicated pages in `src/pages/admin/`:
  1. `AdminDashboardPage.tsx` — Platform overview KPIs, growth charts, operational health summary.
  2. `AdminUsersPage.tsx` — Searchable, filterable user directory with role mutation and suspension modal.
  3. `AdminUserWorkspacePage.tsx` — Candidate 360° workspace, timeline, resume reviews, roadmap, and simulation launch.
  4. `AdminAnalyticsPage.tsx` — Funnel conversion, ATS score distribution, feature engagement analytics.
  5. `AdminAIPage.tsx` — LLM provider status, request rates, error rates, latency percentiles, and recent error log.
  6. `AdminFeaturesPage.tsx` — Dynamic feature flag management with description and toggle controls.
  7. `AdminAnnouncementsPage.tsx` — System broadcast announcement manager with audience targeting.
  8. `AdminSystemPage.tsx` — Real-time system diagnostics: PostgreSQL latency, pool stats, disk/memory, external APIs.
  9. `AdminAuditPage.tsx` — Tamper-evident administrative activity log with timestamp and target resource filtering.
  10. `AdminDatabasePage.tsx` — Safe read-only database inspector showing verified tables, approximate row counts, and column metadata.

### B. Backend Architecture
- **Router:** `lakshyaai-backend/app/api/routes/admin.py` (636 lines, 22.5 KB)
- **Service & API Client:** `src/services/adminService.ts` (366 lines)
- **Role Enforcement:** All endpoints enforce `require_admin` or `require_super_admin` via FastAPI dependency injection.

---

## 2. Feature-by-Feature Status & Gap Analysis

| Admin Feature | Frontend View | Backend Route | DB Source | Status | Evidence / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Overview Metrics** | `AdminDashboardPage` | `GET /admin/overview` | `users`, `resumes`, `interview_sessions` | **Connected & Verified** | Live DB queries compute real totals (active users, onboarding %, resume count). |
| **User Directory** | `AdminUsersPage` | `GET /admin/users` | `users`, `user_career_profiles` | **Connected & Verified** | Paginated with `search`, `role`, and `status` query filters. |
| **User Role Mutation** | `AdminUsersPage` | `PUT /admin/users/{id}` | `users`, `admin_audit_logs` | **Connected & Verified** | Requires Super Admin to promote/demote admins; writes audit log. |
| **User Suspension** | `AdminUsersPage` | `POST /admin/users/{id}/suspend` | `users`, `admin_audit_logs` | **Connected & Verified** | Prevents suspension of the last Super Admin. |
| **Candidate 360°** | `AdminUserWorkspacePage` | `GET /admin/users/{id}` | `users`, `resumes`, `job_applications` | **Connected & Verified** | Aggregates candidate profile, applications, and interview records. |
| **Simulation Mode** | `AdminUserWorkspacePage` | `POST /admin/simulation/start` | `admin_simulation_sessions` | **Connected & Verified** | Generates temporary token; backend blocks mutating verbs with 403. |
| **Analytics Engine** | `AdminAnalyticsPage` | `GET /admin/analytics` | `users`, `resumes`, `interview_sessions` | **Connected & Verified** | Real database aggregations; no fake metrics or hardcoded arrays. |
| **AI Telemetry** | `AdminAIPage` | `GET /admin/ai/metrics` | `copilot_messages` | **Connected & Verified** | Aggregates request count, provider breakdown, average latency. |
| **Feature Flags** | `AdminFeaturesPage` | `GET /admin/features`, `POST /admin/features/{k}/toggle` | `feature_flags` | **Connected & Verified** | Super Admin only; changes persist in PostgreSQL. |
| **Announcements** | `AdminAnnouncementsPage` | `GET /admin/announcements`, `POST /admin/announcements` | `platform_announcements` | **Connected & Verified** | Admin can create announcements with role target and expiry. |
| **System Diagnostics** | `AdminSystemPage` | `GET /admin/system/health` | PostgreSQL, Environment | **Connected & Verified** | Measures live ping, pool stats, and provider health. |
| **Audit Logs** | `AdminAuditPage` | `GET /admin/audit-logs` | `admin_audit_logs` | **Connected & Verified** | Chronological audit log with search and actor filtering. |
| **Database Inspector** | `AdminDatabasePage` | `GET /admin/database/tables` | `information_schema` | **Connected & Verified** | Strictly read-only; no raw SQL execution permitted. |
