# Lakshya AI — Super Admin Dashboard Stale Data Root-Cause Report

**Document Reference:** `docs/audit/23-admin-dashboard-stale-data-root-cause.md`  
**Date:** October 26, 2026  
**Auditor Roles:** Senior Full-Stack Engineer, Application Security Engineer, Database Administrator, QA Automation Reviewer  
**Investigation Status:** **COMPLETED (VERIFIED ROOT CAUSE)**  
**Platform Version:** 1.0.0-rc5  

---

## 1. Executive Summary

This investigation analyzed why the Super Admin Dashboard continues to display user counts (33), verified accounts (33), suspended accounts (4), resumes (8), mock interviews (1), applications (3), AI inferences (25), and recent audit events after the database cleanup was planned.

### Primary Root-Cause Finding:
The database cleanup was **NEVER EXECUTED OR COMMITTED** on the connected Supabase PostgreSQL database. 

In the previous turn (`docs/audit/22-database-data-cleanup-report.md` / cleanup planning), the mandatory safety rule:
> *"Stop after preparing this plan and request my explicit approval before executing any deletion. Do not treat this prompt itself as authorization to immediately erase live data."*

was strictly enforced. A restorable backup was created (`backup_pre_cleanup_20261026_154110.json` & `.sql`) and cryptographically verified, the 38-table dependency hierarchy was established, and the system **halted to await your explicit written consent**. No `DELETE`, `TRUNCATE`, or destructive SQL statements were ever sent to the database.

Consequently, when the dashboard was accessed or refreshed, the frontend made live HTTP requests to the backend, which queried the live Supabase PostgreSQL instance where all 504 application records remain intact.

Additionally, two semantic and calculation behaviors were identified:
1. **"Total Candidates" UI Metric Discrepancy**: The dashboard card displays "Total Candidates", but binds to `stats.total_users` (all 33 users, including 18 candidates, 5 admins, and 10 super-admins), rather than candidate accounts only (`role == 'user'`).
2. **"AI Inferences: 25" Metric Origin**: The `ai_request_telemetry` table contains 0 rows. However, `AITelemetryService.get_ai_metrics()` implements an architectural entity-level fallback that sums existing business entities: `total_rewrites (1) + total_interviews (1) + total_copilot (14) + total_recs (9) = 25`. Because these underlying entity records still exist in the database, the fallback truthfully calculates and returns 25.

---

## 2. Effective Backend Database Target

| Parameter | Configuration / Observed Value |
| :--- | :--- |
| **Active Target** | **Supabase Managed PostgreSQL (Asia-Pacific Northeast 2 / Seoul region)** |
| **Host** | `aws-0-ap-northeast-2.pooler.supabase.com` |
| **Port** | `6543` (transaction-mode pgbouncer pooler) |
| **Database Name** | `postgres` |
| **Server Version** | `PostgreSQL 17.11 on aarch64-unknown-linux-gnu` |
| **Connected Database User** | `postgres` |
| **Environment Variable** | `DATABASE_URL` loaded from `lakshyaai-backend/.env` |
| **Running Backend Process** | Uvicorn running on `http://127.0.0.1:10000` (`app-dir: lakshyaai-backend`) |
| **Frontend API Base URL** | `http://127.0.0.1:10000/api` (proxied via Vite on `http://127.0.0.1:5173/api`) |
| **Cleanup Script Database** | Exactly identical: `aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres` |

**Verification Status:** **PASS (Confirmed identical targets across running backend, configuration, and cleanup script)**.

---

## 3. Actual Current Database Row Counts

Read-only SQL queries executed directly against the live database catalog confirm the actual data state:

| Table Name | Schema | Catalog Row Count | In Backup Archive | Cleanup Executed? | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `users` | `public` | **33** | 33 | No | **NOT EXECUTED** |
| `resumes` | `public` | **8** | 8 | No | **NOT EXECUTED** |
| `interview_sessions` | `public` | **1** | 1 | No | **NOT EXECUTED** |
| `job_applications` | `public` | **3** | 3 | No | **NOT EXECUTED** |
| `admin_audit_logs` | `public` | **308** *(+2 from dashboard views)* | 306 | No | **NOT EXECUTED** |
| `feature_flags` | `public` | **6** | 6 | No | **NOT EXECUTED** |
| `platform_announcements` | `public` | **0** | 0 | No | **EMPTY** |
| `ai_request_telemetry` | `public` | **0** | 0 | No | **EMPTY** |
| `career_recommendations` | `public` | **9** | 9 | No | **NOT EXECUTED** |
| `copilot_conversations` | `public` | **4** | 4 | No | **NOT EXECUTED** |
| `copilot_messages` | `public` | **14** | 14 | No | **NOT EXECUTED** |
| `resume_rewrites` | `public` | **1** | 1 | No | **NOT EXECUTED** |
| `resume_skills` | `public` | **88** | 88 | No | **NOT EXECUTED** |
| `user_skills` | `public` | **7** | 7 | No | **NOT EXECUTED** |
| `admin_simulation_sessions`| `public` | **3** | 3 | No | **NOT EXECUTED** |

**Total Application Records:** **506 rows** across 38 public tables.  
**Execution Conclusion:** The cleanup transaction was **never executed or committed**. All original records remain intact.

---

## 4. Metric-by-Metric UI → API → Service → Database Trace

| # | Displayed UI Metric | UI Card Label | Frontend Property | API Endpoint | Backend Service & Calculation | Source Table(s) | Actual DB Value | Current API Result | UI Matches API? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **33** | Total Candidates | `stats.total_users` | `GET /api/admin/dashboard` | `PlatformAnalyticsService.get_dashboard_summary()`: `SELECT COUNT(*) FROM users` | `public.users` | 33 (Total Users) / 18 (role='user') | 33 | **YES** |
| 2 | **33** | Verified Accounts | `stats.verified_users` | `GET /api/admin/dashboard` | `SELECT COUNT(*) FROM users WHERE is_email_verified = TRUE` | `public.users` | 33 verified | 33 | **YES** |
| 3 | **4** | Suspended Accounts | `stats.suspended_users` | `GET /api/admin/dashboard` | `SELECT COUNT(*) FROM users WHERE is_suspended = TRUE` | `public.users` | 4 suspended | 4 | **YES** |
| 4 | **0** | Active Today | `stats.active_users_today` | `GET /api/admin/dashboard` | `SELECT COUNT(DISTINCT user_id) FROM career_activities WHERE created_at >= today` | `career_activities` / `users.last_activity_at` | 0 active today | 0 | **YES** |
| 5 | **8** | Resumes Analyzed | `stats.total_resumes` | `GET /api/admin/dashboard` | `SELECT COUNT(*) FROM resumes` | `public.resumes` | 8 resumes | 8 | **YES** |
| 6 | **1** | Mock Interviews | `stats.total_interviews` | `GET /api/admin/dashboard` | `SELECT COUNT(*) FROM interview_sessions` | `public.interview_sessions` | 1 session | 1 | **YES** |
| 7 | **3** | Applications Tracked | `stats.total_applications` | `GET /api/admin/dashboard` | `SELECT COUNT(*) FROM job_applications` | `public.job_applications` | 3 applications | 3 | **YES** |
| 8 | **25** | AI Inferences | `stats.total_ai_requests` | `GET /api/admin/dashboard` | `AITelemetryService.get_ai_metrics()` entity fallback: `rewrites(1) + interviews(1) + copilot(14) + recs(9) = 25` | `resume_rewrites`, `interview_sessions`, `copilot_messages`, `career_recommendations` | 25 combined rows | 25 | **YES** |
| 9 | **5 rows** | Recent Audit Events | `stats.recent_activity` | `GET /api/admin/dashboard` | `SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT 5` | `public.admin_audit_logs` | 308 audit records | 5 items | **YES** |

---

## 5. Caching, Hardcoding, and State Evaluation

| Potential Cause | Investigation Finding | Verified Result |
| :--- | :--- | :--- |
| **Hardcoded UI Values** | Inspected `AdminDashboardPage.tsx`. All cards bind dynamically to `stats?.<property> ?? "--"`. No sample metrics or static numbers exist. | **RULED OUT** |
| **Mock API Mode** | Backend is actively querying PostgreSQL; verified live query responses match database row counts. | **RULED OUT** |
| **Client Storage Caching** | Inspected `localStorage` and `sessionStorage`. Only auth tokens are stored; no dashboard metrics are serialized to browser storage. | **RULED OUT** |
| **React Query Stale Time** | `useQuery` uses default settings; the Refresh button calls `refetch()`, which dispatches an immediate network request to `/api/admin/dashboard`. | **RULED OUT** |
| **Live Database State** | The database actually contains the 33 users, 8 resumes, 3 applications, 25 AI entity runs, and 308 audit logs. The dashboard is rendering fresh, accurate data reflecting the actual database state. | **CONFIRMED ROOT CAUSE** |

---

## 6. Initialization and Seeding Evaluation

Inspected `app/main.py`:
```python
@app.on_event("startup")
def startup_event():
    ...
    # Bootstrap default seed data (admin & feature flags)
    try:
        from app.db.database import SessionLocal
        from app.services.admin_service import AdminService
        from app.services.feature_flag_service import FeatureFlagService
        db = SessionLocal()
        try:
            AdminService.bootstrap_admin_users(db)
            FeatureFlagService.seed_default_flags(db)
            AdminService.backfill_oauth_providers(db)
        finally:
            db.close()
    except Exception as data_err:
        ...
```

- `AdminService.bootstrap_admin_users()` only bootstraps users configured in `ADMIN_EMAILS` (`srikanthuppalapati09@gmail.com`). It does **not** create the 18 candidate accounts, 8 resumes, 3 applications, or 14 copilot messages.
- `FeatureFlagService.seed_default_flags()` only seeds the 6 default feature flags if they do not exist.
- Therefore, the remaining candidate and activity records were **not** recreated by startup hooks; they are existing pre-cleanup data that was never deleted.

---

## 7. Deep-Dive: The Origin of "AI Inferences: 25"

Why does the dashboard display **25 AI Inferences** when the `ai_request_telemetry` table has **0** rows?

In [`app/services/ai_telemetry_service.py`](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/services/ai_telemetry_service.py#L235-L264):
```python
# Fallback to historical entity counts when telemetry table is unpopulated
total_rewrites = db.query(func.count(models.ResumeRewrite.id)).scalar() or 0
total_interviews = db.query(func.count(models.InterviewSession.id)).scalar() or 0
total_copilot = db.query(func.count(models.CopilotMessage.id)).scalar() or 0
total_recs = db.query(func.count(models.CareerRecommendation.id)).scalar() or 0

total_requests = total_rewrites + total_interviews + total_copilot + total_recs
```

Current database values:
- `total_rewrites` (`ResumeRewrite`): **1**
- `total_interviews` (`InterviewSession`): **1**
- `total_copilot` (`CopilotMessage`): **14**
- `total_recs` (`CareerRecommendation`): **9**
- **Sum**: `1 + 1 + 14 + 9 = 25`.

This is an intentional architectural fallback designed to reflect real platform AI activity before the dedicated telemetry log table was provisioned. Because the database was not wiped, these 25 entity records remain in the database and are aggregated to 25.

---

## 8. Smallest Safe Proposed Fixes

### Option A: Execute the Approved Database Cleanup (If the intent was to empty the database)
1. **Scope of Action**:
   - Run the dependency-aware transactional cleanup script (`scripts/execute_database_cleanup.py`) that deletes records across the 38 tables in reverse foreign key order within a single transaction (`BEGIN ... COMMIT`).
   - Tables cleared include `resume_rewrites`, `interview_sessions`, `copilot_messages`, `career_recommendations`, `resumes`, `job_applications`, `admin_audit_logs`, and non-super-admin user records.
2. **Automatic Re-initialization**:
   - After cleanup, the backend startup hook re-seeds only the primary Super Admin account (`ADMIN_EMAILS`) and the 6 default feature flags.
   - Resulting metrics: Candidates = 0, Resumes = 0, Interviews = 0, Applications = 0, AI Inferences = 0, Audit Events = 0 (or only the new cleanup audit log).

### Option B: Fix Metric Semantics in Code (If existing data is meant to be kept)
1. **Total Candidates Card**:
   - In [`app/services/platform_analytics_service.py`](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/services/platform_analytics_service.py), add `total_candidates = db.query(models.User).filter(models.User.role == "user").count()` to the dashboard summary dictionary.
   - In [`AdminDashboardPage.tsx`](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/src/pages/admin/AdminDashboardPage.tsx), bind the "Total Candidates" card to `stats.total_candidates` (displaying 18 instead of 33) or change the card title to "Total Registered Accounts".
2. **AI Inference Telemetry**:
   - Once AI features write to `ai_request_telemetry`, the fallback in `AITelemetryService` will automatically switch to querying the telemetry table.

---

## 9. Tests Needed to Prove the Fix

1. **Backend Integration Test (`tests/test_admin_metrics.py`)**:
   - Test that `PlatformAnalyticsService.get_dashboard_summary()` correctly separates `total_users` (33) from `total_candidates` (18).
   - Test that `AITelemetryService.get_ai_metrics()` correctly returns 0 when business entity tables are empty or telemetry count when telemetry exists.
2. **Database Verification Script (`scripts/verify_cleanup_state.py`)**:
   - Execute read-only count queries on all 38 tables post-cleanup to assert 0 rows (except preserved system flags/bootstrap super admin).
3. **Frontend Component Test (`src/pages/admin/__tests__/AdminDashboardPage.test.tsx`)**:
   - Assert that the "Total Candidates" card displays the candidate count when provided in `stats`.
   - Assert that the "AI Inferences" card correctly renders 0 or the provided telemetry total.
   - Assert that the Refresh button successfully calls `queryClient.invalidateQueries(["admin", "dashboard"])`.

---

## 10. Investigation Status Matrix

| Check | Target | Finding | Status |
| :--- | :--- | :--- | :--- |
| **Database Identity** | `DATABASE_URL` vs running backend | Both point to Supabase pooler `aws-0-ap-northeast-2.pooler.supabase.com` | **PASS** |
| **Cleanup Execution Check** | Database catalog | All 506 records exist; cleanup was never executed | **PASS (VERIFIED)** |
| **UI Metric Consistency** | Dashboard vs Backend API | 100% of UI card values match `/api/admin/dashboard` payload | **PASS** |
| **AI Inferences Origin** | AI Telemetry Service | Derived from entity fallback (`1+1+14+9 = 25`) | **PASS (VERIFIED)** |
| **Audit Events Origin** | `admin_audit_logs` table | 308 rows exist in PostgreSQL; top 5 returned | **PASS (VERIFIED)** |
| **Caching / Stale Data** | Browser & React Query | Live queries execute on every request; no stale cache | **PASS (RULED OUT)** |
| **Code & DB Safety** | No changes during investigation | No rows modified; no code committed | **PASS** |

> [!NOTE]
> Per the safety rules, **no data has been deleted, modified, or restored**, and no application code changes have been committed.

