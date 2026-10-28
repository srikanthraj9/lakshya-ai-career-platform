# 03 — Backend API Inventory

**Project:** Lakshya AI Career Platform  
**Repository:** `https://github.com/srikanthraj9/lakshya-ai-career-platform.git`  
**Audit Date:** October 25, 2026  
**Auditor:** Senior Backend Architect & API Security Specialist  

---

## 1. Complete REST API Catalog

The FastAPI backend exposes all REST endpoints prefixed by `/api/v1` (with `/health` also available at the root level).

### A. Authentication & User Management (`/api/v1/auth`)
- `POST /register`: Accepts `UserCreate`. Validates email, password strength. Creates `User` with `role='user'`. Generates `EmailVerificationToken`.
- `POST /login`: Accepts OAuth2 password form (`username`, `password`). Returns JWT `access_token` and `refresh_token`.
- `POST /verify-email`: Accepts `{ token: string }`. Activates user account upon token verification.
- `POST /resend-verification`: Accepts `{ email: string }`. Generates fresh verification token and dispatches email.
- `POST /forgot-password`: Accepts `{ email: string }`. Issues password recovery token.
- `POST /reset-password`: Accepts `{ token: string, new_password: string }`. Resets user password hash.
- `GET /me`: Requires `get_current_user`. Returns authenticated user record without sensitive hashes.

### B. Admin Subsystem (`/api/v1/admin`)
- `GET /overview`: Requires `require_admin`. Calculates real metrics: total users, verified users, 24h/7d new registrations, 30d active users, onboarding completion, resume counts, interview sessions, and AI telemetry counts from DB.
- `GET /users`: Requires `require_admin`. Paginated user catalog with `search`, `role`, `is_active`, `is_verified` filtering.
- `GET /users/{id}`: Requires `require_admin`. Returns Candidate 360° record including profile, career state, resumes, applications, roadmap milestones, and interview records.
- `PUT /users/{id}`: Requires `require_admin` (and `require_super_admin` for role escalation). Updates account properties. Emits `admin_audit_logs`.
- `POST /users/{id}/suspend`: Requires `require_admin`. Suspends or reactivates candidate accounts with safety guard against demoting the sole super admin.
- `POST /simulation/start`: Requires `require_super_admin`. Creates signed simulation session token allowing read-only "View As Candidate" exploration.
- `GET /analytics`: Requires `require_admin`. Returns aggregate registration velocity, feature adoption rates, and ATS score distributions.
- `GET /ai/metrics`: Requires `require_admin`. Returns telemetry aggregates: provider breakdowns (Groq, Gemini, OpenAI), request volume, error counts, latency averages, and redacted error logs.
- `GET /features`: Requires `require_admin`. Returns list of active feature flags from `feature_flags` table.
- `POST /features/{key}/toggle`: Requires `require_super_admin`. Updates feature flag state and writes audit event.
- `GET /announcements`: Requires `require_admin`. Returns platform announcements.
- `POST /announcements`: Requires `require_admin`. Publishes new system announcement to all or targeted roles.
- `GET /system/health`: Requires `require_admin`. Deep health check inspecting PostgreSQL connection, latency, disk/memory, and external AI provider reachability.
- `GET /audit-logs`: Requires `require_admin`. Paginated audit trail from `admin_audit_logs`.
- `GET /database/tables`: Requires `require_super_admin`. Safe read-only inspection of approved tables with approximate row counts.
- `GET /database/tables/{name}`: Requires `require_super_admin`. Schema and column metadata inspection without arbitrary SQL execution.

### C. Resumes & ATS Scoring (`/api/v1/resumes`)
- `POST /upload`: Multipart PDF/DOCX file upload. Extracts plain text, runs ATS analysis engine, stores metadata in `resumes` table.
- `GET /{id}/ats`: Returns detailed ATS score, missing skills (`resume_missing_skills`), and category breakdown (`resume_ats_breakdown`).
- `POST /rewrite`: LLM-powered bullet point rewrite optimizing for target role keywords.
- `GET /{id}/pdf`: Generates clean, ATS-compliant PDF resume formatted via ReportLab.

### D. AI Copilot (`/api/v1/copilot`)
- `POST /chat`: Multi-turn conversational career copilot. Persists messages in `copilot_conversations` and `copilot_messages`.
- `GET /history`: Retrieves recent conversation thread for authenticated user.

### E. Mock Interview Studio (`/api/v1/interview`)
- `POST /sessions`: Initializes mock interview based on target role and seniority.
- `POST /sessions/{id}/answer`: Evaluates audio/text answer against STAR framework and provides instant feedback.
- `GET /sessions/{id}/debrief`: Generates comprehensive debrief report with strengths, improvement areas, and readiness score.

### F. Job Tracker & Recommendations (`/api/v1/jobs`)
- `GET /applications`: Retrieves user's application Kanban board (`job_applications`).
- `POST /applications`: Creates new application tracker card.
- `PUT /applications/{id}`: Moves application stage (Applied, Screening, Interview, Offer, Rejected).

### G. Career Roadmap & Skill Passport (`/api/v1/roadmap` & `/api/v1/passport`)
- `GET /roadmap`: Returns skill milestones and learning resources (`roadmap_progress`).
- `PUT /roadmap/progress`: Updates completion status of a roadmap node.
- `GET /passport`: Retrieves verified skills, endorsements, and project proof (`user_skills`).
- `POST /passport/share`: Issues cryptographically signed public share token for candidate skill passport.
- `GET /passport/shared/{token}`: Public unauthenticated endpoint returning verified credentials.

---

## 2. Authorization & Middleware Matrix

| Dependency | Target Endpoint Group | Behavior on Unauthorized |
| :--- | :--- | :--- |
| `get_current_user` | `/me`, `/profile`, `/resumes`, `/interview`, `/copilot`, `/jobs`, `/roadmap`, `/passport` | `401 Unauthorized` |
| `require_admin` | `/admin/overview`, `/admin/users`, `/admin/analytics`, `/admin/ai/metrics`, `/admin/announcements`, `/admin/system/health`, `/admin/audit-logs` | `403 Forbidden` |
| `require_super_admin` | `/admin/features/{key}/toggle`, `/admin/simulation/start`, `/admin/database/*` | `403 Forbidden` |
| `simulation_guard` | All mutating endpoints (`POST`, `PUT`, `DELETE`, `PATCH`) | `403 Forbidden` (Read-only simulation) |
