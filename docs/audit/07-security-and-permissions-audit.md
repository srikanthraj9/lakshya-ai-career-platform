# 07 — Security and Permissions Audit

**Project:** Lakshya AI Career Platform  
**Repository:** `https://github.com/srikanthraj9/lakshya-ai-career-platform.git`  
**Audit Date:** October 25, 2026  
**Auditor:** Application Security & Compliance Reviewer  

---

## 1. Role-Based Access Control (RBAC) Architecture

Lakshya AI implements a strict 3-tier hierarchical role model:
1. `user` (Candidate) — Access restricted to own personal resources (resumes, interviews, applications, copilot).
2. `admin` (Platform Administrator) — Read/write access to user management, analytics, announcements, system health, and audit logs.
3. `super_admin` (Principal Administrator) — Exclusive authorization for feature flags, role promotion/demotion, system configuration, database schema inspection, and candidate simulation.

### Security Guarantees Verified:
- **Server-Side Enforcement:** Route guards in React (`AdminRoute.tsx`, `ProtectedRoute.tsx`) provide UI navigation protection, but **every backend endpoint independently enforces authentication and permissions** via FastAPI dependency injection (`require_admin`, `require_super_admin`, `get_current_user`).
- **No Self-Escalation:** An administrator cannot promote their own account to `super_admin`. Promotion/demotion of administrative roles strictly requires `require_super_admin`.
- **Super Admin Protection:** The backend prevents suspension or deletion of the last remaining active `super_admin` on the platform.

---

## 2. Simulation Mode (View As Candidate) Security Controls

The "View As Candidate" feature allows administrators to troubleshoot candidate workflows in the UI:
- **Session Tokens:** Simulation sessions generate a short-lived, cryptographically signed token stored in `admin_simulation_sessions`.
- **Read-Only Verification:** When the client sends `X-Simulation-Token`, the backend middleware intercepts all mutating HTTP verbs (`POST`, `PUT`, `PATCH`, `DELETE`) and immediately terminates the request with `403 Forbidden` (`{"detail": "Simulation sessions are strictly read-only"}`).
- **Auditing:** All simulation launches and exits are recorded in `admin_audit_logs`.

---

## 3. Database Safety & Data Integrity

- **SQL Injection Prevention:** All queries use SQLAlchemy 2.0 ORM expressions or parameterized queries (`bindparams`). Zero dynamic string interpolation of SQL statements is present in the codebase.
- **Database Explorer Safeguards:** The admin database page (`AdminDatabasePage.tsx` and `GET /api/v1/admin/database/tables`) only queries `information_schema` and `pg_stat_user_tables` for approved table names and row estimates. **No raw SQL execution endpoint exists.**
- **Secret Redaction:**
  - Database connection strings, passwords, JWT secrets, Groq/Gemini API keys, and SMTP credentials are never rendered in API responses or logs.
  - User password hashes (`hashed_password`) and verification token hashes (`token_hash`) are explicitly omitted from all Pydantic response models (`UserResponse`, `UserDetailResponse`).

---

## 4. Path Traversal & Storage Security

- File uploads (`POST /api/v1/resumes/upload`) validate MIME types (PDF, DOCX) and sanitize filenames using secure UUID namespaces before writing to storage, preventing directory traversal attacks.
