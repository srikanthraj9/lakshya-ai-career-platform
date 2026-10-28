# Audit Report 72: Student Dashboard & Admin Operational Incident End-to-End Repair Report

**Repository:** `srikanthraj9/lakshya-ai-career-platform`  
**Execution Context:** Master Prompt 73 — Live Application Defect Remediation  
**Baseline Commit:** `05bcfda4c0c4237d7dcd49d9a5b749af9fda88ab`  
**Date:** 2026-10-28  

---

## Executive Summary

Master Prompt 73 reported two defects in the live application:
1. **Issue A (Student Workspace):** Dashboard displayed `Command Center Unavailable` with message `Failed to load your career intelligence metrics.` when the user had not selected a target career role.
2. **Issue B (Admin Workspace):** Platform status displayed `Degraded`, and a critical operational incident was displayed for `SELF_SERVICE_ACCOUNT_DELETION`.

Both issues were independently investigated, diagnosed to their root causes with verifiable code and database evidence, and repaired with regression tests.

---

## Phase 1: Root-Cause Investigation & Verifiable Evidence

### 1. Issue A — Student Dashboard Failure
* **Observed UI Behavior:** The student dashboard page failed to render and presented `<ErrorFallback>` with title `Command Center Unavailable` and message `Failed to load your career intelligence metrics.`.
* **Root Cause 1 (Backend Unhandled SQL Error / Schema Drift):**
  * In `lakshyaai-backend/app/api/routes/analytics.py`, `get_performance_summary` invoked:
    ```python
    total_resumes = db.query(models.Resume).filter(models.Resume.user_id == current_user.id).count()
    ```
    In SQLAlchemy 2.0, `db.query(models.Resume)...count()` compiles as a subquery selecting all model columns:
    ```sql
    SELECT count(*) FROM (SELECT resumes.id, ... resumes.base_quality_score FROM resumes WHERE resumes.user_id = ...)
    ```
    Because the production PostgreSQL database had not run migration `e1f2a3b4c5d6`, the column `resumes.base_quality_score` did not exist. PostgreSQL raised:
    `psycopg2.errors.UndefinedColumn: column resumes.base_quality_score does not exist`
    This caused `GET /api/analytics/summary` to crash with HTTP 500!
* **Root Cause 2 (Invalid Column Access on Model):**
  * Line 165 of `analytics.py` attempted to query `models.InterviewSession.score`.
  * The actual column on `models.InterviewSession` is `overall_score`. This triggered `AttributeError: type object 'InterviewSession' has no attribute 'score'`, causing further 500 errors.
* **Root Cause 3 (Frontend Error State & Target Role Empty State):**
  * `useDashboardData.ts` set `isError: isSummaryError`. When the summary endpoint crashed with HTTP 500, the error boundary threw `Command Center Unavailable`.
  * Additionally, when a candidate had not yet chosen a target career role (`targetRole.title === "No Target Role Selected"`), there was no prominent onboarding callout guiding them to select a role.

### 2. Issue B — Admin Status Degraded & False Critical Incident
* **Observed UI Behavior:** The Admin Header displayed platform status `Degraded`, and the Admin Control Center displayed a red banner: `Critical Operational Incident Detected: Critical Governance Action: SELF_SERVICE_ACCOUNT_DELETION`.
* **Root Cause 1 (Misclassified Audit Log Severity):**
  * In `lakshyaai-backend/app/api/routes/users.py` line 812, successful self-service account deletion created an `AdminAuditLog` with `severity="critical"`.
  * A normal, verified user GDPR/privacy self-service account deletion is a routine lifecycle compliance event, NOT a platform operational incident, system outage, or service degradation.
* **Root Cause 2 (Operational Alert Classifier False Positives):**
  * In `lakshyaai-backend/app/services/operational_alert_service.py` lines 253–278, the operational alert engine queried all `AdminAuditLog` records with `severity == "critical"` in the last 24 hours and promoted each one into an active operational incident (`GOVERNANCE_CRITICAL_EVENT`, status `open`).
  * Inspection of the database confirmed that user `c2c6e837-4251-4bf2-befb-dce491a246cc` was successfully and completely deleted from the database (`User: None`), and the audit record `ceb53db6-eaf3-4019-bf59-f7ce77513fb7` documented a successful deletion. However, because its severity was set to `critical`, the alert engine misclassified this successful deletion as an unresolved critical operational incident.
* **Root Cause 3 (AI Provider Detection Mismatch in Health Diagnostics):**
  * In `lakshyaai-backend/app/services/health_service.py` (`HealthService.get_system_diagnostics`), AI key checks only inspected `settings.GEMINI_API_KEY` and `settings.OPENAI_API_KEY`.
  * The environment was configured with `GROQ_API_KEY`. Because `HealthService` ignored `GROQ_API_KEY`, `GOOGLE_API_KEY`, and `AI_API_KEY`, it marked `ai_service` as `degraded` (`No external AI API keys configured; local heuristic fallback active`).
  * In `lakshyaai-backend/app/api/routes/admin.py`, a duplicate route `@router.get("/system/health")` at line 49 shadowed line 403 and served `HealthService.get_system_diagnostics`, returning `status: "degraded"`.

---

## Phase 2: Repairs Implemented

### 1. `lakshyaai-backend/app/api/routes/analytics.py`
- Replaced `db.query(models.Resume)...count()` with targeted column counting:
  `db.query(func.count(models.Resume.id)).filter(models.Resume.user_id == current_user.id).scalar() or 0`.
- Changed fallback queries in `get_ats_trend`, `get_skill_growth`, `get_performance_summary`, and `get_dashboard_overview` to select only explicit columns (`models.Resume.ats_score`, `models.Resume.created_at`, `models.ResumeSkill.skill_name`), preventing SQLAlchemy from querying nonexistent columns on unmigrated schemas.
- Corrected interview score query to `models.InterviewSession.overall_score` with defensive exception handling and zero-division protection.

### 2. `lakshyaai-backend/app/api/routes/users.py`
- Changed the audit log severity for successful, verified user self-service account deletion from `severity="critical"` to `severity="info"` (`reason="User self-service account deletion requested and verified"`).

### 3. `lakshyaai-backend/app/services/operational_alert_service.py`
- Updated `detect_operational_alerts` governance query to filter out `action_type != "SELF_SERVICE_ACCOUNT_DELETION"`.
- Backward-compatibility safeguard: Historical or legacy self-service deletion logs in the database are no longer misclassified as active critical operational incidents.
- Preserved genuine administrative critical events (e.g., `DATABASE_DELETE_*`, security anomalies, AI error bursts).

### 4. `lakshyaai-backend/app/services/health_service.py` & `app/api/routes/admin.py`
- Added comprehensive AI provider detection in `HealthService.get_system_diagnostics` across `GROQ_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `OPENAI_API_KEY`, and `AI_API_KEY`.
- Corrected `open_alerts_count` in system diagnostics to pull from `OperationalAlertService.get_alerts_summary(db).open_count`.
- Removed duplicate `@router.get("/system/health")` route at line 49 in `admin.py`, ensuring consistent schema-compliant diagnostics via `schemas.SystemHealthResponse`.

### 5. `src/hooks/useDashboardData.ts` & `src/components/dashboard/DashboardHero.tsx` & `src/pages/DashboardPage.tsx`
- In `useDashboardData.ts`:
  - Captured individual query refetch triggers (`refetchProfile`, `refetchTrend`, `refetchSkills`, `refetchProgress`, `refetchResumes`) and invoked all of them in `refetchAll` to provide guaranteed recovery on user retry.
- In `DashboardHero.tsx`:
  - When no target role is chosen, added an explicit "Select Target Role" primary button linking to `/role-alignment` alongside profile setup.
- In `DashboardPage.tsx`:
  - Added an intentional, informative empty-state callout when `targetRole.title === "No Target Role Selected"`, guiding new candidates to select a role to unlock tailored ATS diagnostics, skill breakdowns, and AI recommendations.

---

## Phase 3: Test Execution & Verification

### 1. New Regression Test Suite (`test_dashboard_and_incident_regression.py`)
Executed: `python -m unittest tests.test_dashboard_and_incident_regression`
```
Ran 8 tests in 1.137s
OK
```
* `test_student_dashboard_summary_with_no_target_role`: Verified `GET /api/analytics/summary` returns HTTP 200 with zero baseline metrics for a new candidate.
* `test_student_dashboard_overview_with_no_resumes`: Verified `GET /api/analytics/dashboard` returns HTTP 200 without schema errors.
* `test_student_ats_trend_and_skill_growth_fallbacks`: Verified trend and skill growth endpoints return empty lists gracefully.
* `test_unauthenticated_request_rejected`: Verified unauthenticated requests receive HTTP 401.
* `test_self_service_account_deletion_audit_severity_is_info`: Verified self-service deletion writes audit log with `severity='info'` and permanently purges user.
* `test_self_service_deletion_not_classified_as_operational_alert`: Verified `SELF_SERVICE_ACCOUNT_DELETION` is excluded from operational alerts.
* `test_genuine_critical_admin_event_is_preserved_as_incident`: Verified administrative deletions remain detected as critical alerts.
* `test_admin_system_health_endpoint`: Verified `/api/admin/system/health` requires admin and returns status `healthy`.

### 2. Full Backend Test Suite
Executed: `python -m unittest discover -s tests -p "test_*.py"`
```
Ran 345 tests in 84.109s
OK (skipped=1)
```

### 3. Frontend Vitest Suite
Executed: `npm test -- --run`
```
Test Files  45 passed (45)
     Tests  218 passed (218)
  Duration  21.31s
```

### 4. Production Frontend Build
Executed: `npm run build`
```
✓ built in 11.06s
```

---

## Phase 4: Git Hygiene & Release State

* **Changed Files:**
  1. `lakshyaai-backend/app/api/routes/analytics.py`
  2. `lakshyaai-backend/app/api/routes/users.py`
  3. `lakshyaai-backend/app/api/routes/admin.py`
  4. `lakshyaai-backend/app/services/health_service.py`
  5. `lakshyaai-backend/app/services/operational_alert_service.py`
  6. `src/hooks/useDashboardData.ts`
  7. `src/components/dashboard/DashboardHero.tsx`
  8. `src/pages/DashboardPage.tsx`
  9. `lakshyaai-backend/tests/test_dashboard_and_incident_regression.py`
  10. `docs/audit/72-student-admin-dashboard-incident-repair-report.md`
* **Security Checks:** No secrets, tokens, credentials, or private keys exposed in code or commits.
* **Database Safety:** No production database mutations or migrations executed. All tests executed against isolated test databases.

---

## Final Verdict

**Status:** `FIXED AND VERIFIED`
* Student Workspace metrics loading failure resolved across all schema states.
* Candidate target-role empty state and selection actions implemented.
* Admin Platform Status `healthy` restored.
* False operational alert for `SELF_SERVICE_ACCOUNT_DELETION` eliminated while preserving genuine operational incidents.
