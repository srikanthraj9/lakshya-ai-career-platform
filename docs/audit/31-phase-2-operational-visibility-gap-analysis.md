# Lakshya AI — Phase 2: Operational Visibility & Intelligent Alert Center
## Architectural Gap Analysis & Technical Design Document

**Document Identifier:** `docs/audit/31-phase-2-operational-visibility-gap-analysis.md`  
**Milestone:** Super Admin Dashboard Enhancement — Phase 2  
**Standard Followed:** Mandatory End-to-End Feature Development Standard  
**Date:** October 27, 2026  
**Status:** COMPLETE — Ready for Implementation  

---

## 1. Executive Summary & Objective

Phase 2 builds upon the validated Phase 1 foundation ([30-phase-1-enhancement-completion-report.md](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/docs/audit/30-phase-1-enhancement-completion-report.md)) to introduce **Operational Visibility & the Intelligent Alert Center**.

The goal is to elevate platform monitoring from static dashboard numbers into an actionable operational intelligence hub. Administrators will be able to detect degraded services, burst AI errors, authentication anomalies, and governance events; acknowledge them; record investigation notes; and mark them resolved, all tied back into System Health and Governance Audit records.

---

## 2. Inspection of Existing Infrastructure & Reusable Assets

### 2.1 Backend Assets
1. **System Health Probes** (`lakshyaai-backend/app/services/health_service.py` & `platform_analytics_service.py`):
   - Already instruments DB query latency (`SELECT 1`), AI inference provider keys, file storage paths, and rate limiter status.
   - Reusable for real-time service health failure and degradation detection.
2. **AI Request Telemetry** (`lakshyaai-backend/app/services/ai_telemetry_service.py` & `models.AIRequestTelemetry`):
   - Records every AI call with `status`, `error_category` (`rate_limit_429`, `server_error_5xx`, `timeout`, `connection_error`), `duration_ms`, `provider`, and `model_name`.
   - Reusable for detecting repeated AI request failures and provider degradation.
3. **Governance & Audit Trail** (`lakshyaai-backend/app/services/audit_service.py` & `models.AdminAuditLog`):
   - Full sanitization engine `sanitize_metadata` redacting passwords, tokens, API keys, and connection strings.
   - Flexible JSON storage for audit actions, reasons, severity levels (`info`, `warning`, `critical`), and actor identification.
4. **Authentication & RBAC** (`lakshyaai-backend/app/core/permissions.py`):
   - `require_admin` and `require_super_admin` dependency decorators enforcing server-side authorization.

### 2.2 Frontend Assets
1. **Admin Design System**:
   - Dark theme styling with purple accents (`#7C3AED` / `#A855F7`), rounded glassmorphic cards (`rounded-2xl border-border/60 bg-card/60 backdrop-blur-xl`), Lucide icons, and Tailwind CSS tokens.
2. **System Health Panel** (`src/components/admin/SystemHealthPanel.tsx`):
   - Renders individual service cards with badges (`Healthy`, `Degraded`, `Unhealthy`) and refresh triggers.
3. **Admin Dashboard Overview** (`src/pages/admin/AdminDashboardPage.tsx`):
   - Has the foundational "Actionable Platform Alerts" placeholder card added in Phase 1 ready to be wired to the real alert engine.
4. **API Service Client** (`src/services/adminService.ts`):
   - Centralized Axios client with automatic bearer token attachment, error interceptors, and query caching.

---

## 3. Gap Analysis: What is Missing?

| Capability | Current State | Required State in Phase 2 |
| :--- | :--- | :--- |
| **Dedicated Alert Center** | Does not exist in admin navigation. | First-class route `/admin/alerts` with full filtering (severity, status, source), search, and detail modal. |
| **Alert Detection Engine** | Ad-hoc checks without unified aggregation. | `OperationalAlertService` that evaluates system health, AI error bursts, and critical governance events into typed alert objects. |
| **Alert Lifecycle Management** | No acknowledge or resolve workflows. | Server-enforced state transitions (`Open` → `Acknowledged` → `Resolved`) with resolution notes and admin attribution. |
| **Audit Integration for Alerts** | Alert state changes are not audited. | Every acknowledge or resolve operation writes an immutable `AdminAuditLog` entry. |
| **System Health Diagnostics Linkage** | System health shows status but doesn't link to open alerts. | Degraded/unhealthy services render direct deep-links to filtered alert views with relevant error summaries. |
| **Overview Alert Widget** | Static Phase 1 placeholder summary. | Dynamic breakdown of open alerts by severity, top unresolved alerts, last refreshed timestamp, and link to Alert Center. |

---

## 4. Architectural Design & Persistence Decision

### 4.1 Persistence Architecture Analysis
The prompt instructions require:
> *"If an alert can be computed reliably from existing health checks or events, prefer that approach over unnecessary persistence. If acknowledged/resolved state requires persistence, explain the design choice in the gap analysis."*

**Design Choice: Hybrid Synthetic Detection + Audit-Backed Lifecycle Persistence**
1. **Alert Detection is Dynamic & Non-Destructive**:
   - Alerts are computed in real-time from active sources:
     - `database` latency / health check failures.
     - `ai_request_telemetry` failure bursts (e.g., >= 3 failures in recent window).
     - `admin_audit_logs` critical severity actions or user suspensions.
   - Each active incident receives a deterministic, idempotent `incident_fingerprint` (e.g. `health:database:degraded`, `ai:burst:rate_limit_429:groq`, `gov:bulk_suspend:recent`).
2. **Lifecycle Persistence via `admin_audit_logs`**:
   - When an administrator acknowledges or resolves an alert:
     - The backend records an `AdminAuditLog` with `action_type="ALERT_ACKNOWLEDGED"` or `action_type="ALERT_RESOLVED"`, `resource_type="operational_alert"`, `resource_id=incident_fingerprint`, `reason=notes`, and metadata containing the admin ID and timestamp.
   - When fetching alerts:
     - Active incidents are reconciled against the latest lifecycle audit log for that fingerprint.
     - If marked resolved after incident timestamp, status is `resolved`. If acknowledged, status is `acknowledged`. Otherwise `open`.
3. **Database Safety Guarantee**:
   - **Zero schema changes or table creations required on live Supabase production.**
   - Completely backward-compatible and preserves 100% of the live database clean slate.
   - Additionally, we provide a stand-alone migration script `lakshyaai-backend/migrations/003_create_admin_alerts.sql` for future dedicated table extraction if the user requests it later.

---

## 5. Alert Data Model & Schemas

### 5.1 Alert Categories & Source Mapping
- `SERVICE_HEALTH_FAILURE`: Source = `system_health` (Core API, Database connection drop). Severity = `critical`.
- `SERVICE_DEGRADATION`: Source = `system_health` (High DB latency > 1500ms, missing AI key). Severity = `warning`.
- `AI_PROVIDER_ERROR_BURST`: Source = `ai_request_telemetry` (>= 3 consecutive failures, 429 rate limit, 5xx). Severity = `warning` or `critical`.
- `AUTH_SECURITY_ANOMALY`: Source = `users` / `audit` (Multiple rapid user suspensions, email verification failures). Severity = `warning`.
- `GOVERNANCE_CRITICAL_EVENT`: Source = `admin_audit_logs` (`severity == 'critical'` or sensitive database mutations). Severity = `critical`.

### 5.2 Schema Specification (`schemas.py`)
```python
class OperationalAlertItem(BaseModel):
    id: str  # Deterministic fingerprint or UUID
    alert_type: str  # SERVICE_HEALTH_FAILURE, SERVICE_DEGRADATION, etc.
    severity: str  # critical, warning, info
    title: str
    description: str
    source_service: str  # api, database, ai_service, authentication, storage, governance
    status: str  # open, acknowledged, resolved
    created_at: datetime
    updated_at: datetime
    related_resource_type: Optional[str] = None
    related_resource_id: Optional[str] = None
    acknowledged_by_admin_email: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved_by_admin_email: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    metadata: dict = Field(default_factory=dict)

class OperationalAlertListResponse(BaseModel):
    items: list[OperationalAlertItem]
    total: int
    open_count: int
    acknowledged_count: int
    resolved_count: int
    critical_count: int
    warning_count: int
    info_count: int
    last_refreshed_at: datetime

class OperationalAlertTransitionRequest(BaseModel):
    status: str = Field(..., regex="^(acknowledged|resolved)$")
    resolution_notes: Optional[str] = Field(None, max_length=1000)
```

---

## 6. Files Expected to Change

### 6.1 Backend
1. `lakshyaai-backend/app/db/schemas.py`: Add `OperationalAlertItem`, `OperationalAlertListResponse`, `OperationalAlertTransitionRequest`.
2. `lakshyaai-backend/app/services/operational_alert_service.py` *(New)*: Detection logic, fingerprinting, reconciliation with audit logs, transition execution.
3. `lakshyaai-backend/app/api/routes/admin.py`: Add `GET /admin/alerts`, `POST /admin/alerts/{alert_id}/transition`, `GET /admin/alerts/summary`.
4. `lakshyaai-backend/app/services/platform_analytics_service.py`: Enhance system health response with detailed error summaries and last checked timestamps.
5. `lakshyaai-backend/tests/test_admin_operational_alerts.py` *(New)*: Isolated tests for detection, lifecycle transitions, authorization, and audit logs.
6. `lakshyaai-backend/migrations/003_create_admin_alerts.sql` *(New, reference only)*: Non-destructive reference migration.

### 6.2 Frontend
1. `src/types/index.ts`: Add TypeScript definitions for `OperationalAlertItem`, `OperationalAlertListResponse`, and transition payloads.
2. `src/services/adminService.ts`: Add `getOperationalAlerts`, `transitionOperationalAlert`, and `getAlertSummary`.
3. `src/pages/admin/AdminAlertsPage.tsx` *(New)*: Dedicated Intelligent Alert Center page with search, severity/status filters, alert table, detail drawer/modal, and acknowledge/resolve actions.
4. `src/components/admin/AdminSidebar.tsx`: Add Alert Center navigation link with dynamic open-alert badge count.
5. `src/App.tsx`: Register `/admin/alerts` under `AdminRoute`.
6. `src/pages/admin/AdminDashboardPage.tsx`: Wire actionable alert summary widget to live alert metrics with deep links.
7. `src/components/admin/SystemHealthPanel.tsx` & `src/pages/admin/AdminSystemPage.tsx`: Link service issues to related alerts, show last checked timestamp and error descriptions.
8. `src/test/adminAlertCenter.test.tsx` *(New)*: Frontend integration tests for Alert Center UI and flows.

---

## 7. Security & Governance Considerations

1. **Server-Side Authorization**: Every alert query and transition strictly enforces `require_admin`.
2. **Audit Attribution**: Every status transition (`acknowledged` or `resolved`) is permanently recorded in `AdminAuditLog` with `admin_user_id`, timestamp, client IP, and sanitized notes.
3. **Information Disclosure Prevention**: Error messages from system health and AI telemetry are sanitized via `AITelemetryService.sanitize_error` and `AuditService.sanitize_metadata`. No internal connection strings or secrets are returned.
4. **Database Protection**: No table drops, truncates, or schema mutations on live Supabase.

---

## 8. Testing Strategy & Acceptance Criteria

1. **Backend Tests** (`tests/test_admin_operational_alerts.py`):
   - Verify alert detection from health probes and telemetry on isolated SQLite DB.
   - Verify valid lifecycle transitions (`open` → `acknowledged` → `resolved`).
   - Verify invalid transition rejection (e.g. invalid status string).
   - Verify authorization rejection for non-admin users.
   - Verify audit log emission for every transition.
2. **Frontend Tests** (`src/test/adminAlertCenter.test.tsx`):
   - Verify alert listing, badge colors, and responsive layout.
   - Verify status filtering (`open`, `acknowledged`, `resolved`) and search.
   - Verify acknowledge and resolve action dialogs and mutation triggers.
   - Verify loading, empty, and error states.
3. **Regression & Build Verification**:
   - `npm test -- --run` (all 37+ test files pass).
   - `npm run build` (clean compilation, zero TypeScript errors).
   - Health check endpoints verify healthy.
   - Supabase production database row counts remain untouched.
