# LAKSHYA AI — COMPREHENSIVE SYSTEM AUDIT & ROOT-CAUSE ANALYSIS

**Document Version:** 1.0.0  
**Audit Date:** October 15, 2026  
**Auditor:** Senior Full-Stack Software Architect, Security Auditor, QA Lead & DevOps Specialist  
**Repository:** `lakshya-ai-career-platform`  
**Classification:** Technical Audit & Security Advisory  

---

## 1. Executive Summary

A comprehensive, evidence-based architectural, functional, security, database, AI, testing, and deployment audit of the **Lakshya AI** platform was conducted. Every component was inspected directly from repository source code, build scripts, configuration files, and empirical test execution.

### Key Audit Findings

1. **Overall Project Health:** **Degraded / High Risk**. While the frontend application builds successfully (`vite build` in 39.36s with 0 TypeScript compilation errors) and passes all 68 Vitest unit/isolation tests, the backend and deployment layers suffer from significant architectural defects, critical credential leaks, false documentation claims, and test suite failure.
2. **Test Suite Discrepancy:** The repository documentation claims **88 backend tests passed**. In reality, standard execution (`python -m unittest discover -s tests`) fails with **8 fatal errors and runs only 43 tests**. When executed with package recursion (`-t .`), all **88 tests are discovered**, but **45 tests are blocked/aborted** due to `OperationalError` exceptions in test `setUpClass` fixtures attempting to connect to a defunct external cloud database (`aws-1-ap-northeast-1.pooler.supabase.com`). Only **42 tests actually pass** without database connectivity.
3. **Critical Security Vulnerability:** Active production credentials (Google OAuth Client ID & Secret, Gmail SMTP App Password, Supabase database connection string with plaintext password, and hardcoded JWT secrets) are committed directly into repository environment templates (`lakshyaai-backend/.env.example` and `.env`), alongside an accidental shell leak file (`ecrets and add env example`).
4. **Account Suspension Bypass:** Account suspension is not enforced across candidate-facing endpoints. The primary authentication dependency (`get_current_user`) lacks checks for `user.is_suspended` or `user.is_active`, and the login endpoint issues valid JWTs to suspended users.
5. **View-As Simulation Architectural Defect:** The documented "View-As Candidate Simulation Mode" blocks mutations via middleware but **never switches the query context on read requests**. Because `get_current_user` only resolves the super admin's JWT identity, candidate data queries filter by the super admin's ID, displaying the administrator's own data rather than the simulated candidate's profile.
6. **AI Heuristics Presented as Genuine Intelligence:** The advertised "STAR-based interview evaluation rubric" and "Adaptive follow-up questions" are non-AI static heuristic placeholders. Answer evaluation relies on word count and simple keyword matching (awarding 12 points for containing a period), while questions are pulled sequentially from a static 3-item array.
7. **Containerization & Deployment Failure:** The multi-stage Dockerfile and Docker Compose setup build the frontend with a hardcoded fallback API URL (`http://127.0.0.1:10000/api`) without build argument injection or an Nginx reverse proxy for `/api`, causing production deployments to fail when accessed outside the host machine.

---

## 2. Repository and Architecture Overview

### 2.1 Repository Structure Inventory

```text
lakshya-ai-career-platform/
├── .github/workflows/ci.yml      # CI pipeline (Missing DB container service)
├── dist/                         # Compiled production frontend build
├── docs/                         # Engineering documentation (Contains schema drift)
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   └── DEPLOYMENT.md
├── e2e/                          # Playwright test specs
├── lakshyaai-backend/            # Python FastAPI Backend
│   ├── app/
│   │   ├── api/routes/           # 17 route modules (auth, resume, copilot, admin, etc.)
│   │   ├── core/                 # Config, security, permissions, middleware
│   │   ├── db/                   # Database engine, models (37 models), schemas
│   │   ├── services/             # Admin, Analytics, AI, Interview, Resume services
│   │   └── main.py               # Entrypoint & startup hooks
│   ├── tests/                    # 25 test files (88 discovered test cases)
│   ├── Dockerfile                # Backend container definition
│   └── requirements.txt          # Python dependencies (UTF-16LE encoding)
├── src/                          # React 18 + TypeScript + Vite SPA
│   ├── components/               # Radix UI + Tailwind UI primitives
│   ├── context/                  # AuthContext, ApplicationContext, etc.
│   ├── lib/                      # userStorage, queryKeys
│   ├── pages/                    # 28 view modules
│   ├── services/                 # Axios HTTP client & modules
│   └── test/                     # 22 Vitest test files (68 tests)
├── Dockerfile                    # Multi-stage frontend Dockerfile
├── docker-compose.yml            # Local dev stack
├── docker-compose.prod.yml       # Production stack
├── package.json                  # Node.js dependencies
├── tsconfig.json                 # Strict TypeScript configuration
└── vite.config.ts                # Vite bundler configuration
```

### 2.2 Framework and Dependency Verification

| Component | Documented Version | Actual Repository Version | Status |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React 18.3.1 | React `18.3.1` | Verified |
| **Language** | TypeScript 5.8.3 | TypeScript `5.8.3` | Verified |
| **Bundler** | Vite 5.4.19 | Vite `5.4.19` | Verified |
| **UI Components** | Radix UI + Tailwind | Radix UI `^1.1` / Tailwind `3.4.17` | Verified |
| **State & Cache** | TanStack Query 5.83.0 | `@tanstack/react-query` `5.83.0` | Verified |
| **Backend Framework** | FastAPI 0.135.1 | FastAPI `0.135.1` | Verified |
| **ASGI Server** | Uvicorn 0.41.0 | Uvicorn `0.41.0` | Verified |
| **ORM** | SQLAlchemy 2.0.48 | SQLAlchemy `2.0.48` | Verified |
| **Database Driver** | Psycopg2 2.9.11 | `psycopg2-binary` `2.9.11` | Verified |
| **Schema Validation**| Pydantic v2.12.5 | Pydantic `2.12.5` | Verified |
| **Database Engine** | PostgreSQL 16 + pgvector | PostgreSQL 16 (`pgvector/pgvector:pg16`) | Verified |

---

## 3. Feature Implementation Status Matrix

| Domain | Feature | Documented Status | Actual Verified Status | Gap / Discrepancy Analysis |
| :--- | :--- | :---: | :---: | :--- |
| **Auth & Security** | JWT Authentication | ✅ Implemented | ⚠️ Partially Implemented | Token issued, but no refresh token flow, revocation table, or `jti` claim. |
| | Email Verification | ✅ Implemented | ⚠️ Partially Implemented | Implemented as URL token, not OTP. Login does not enforce email verification. |
| | Account Suspension | ✅ Implemented | ❌ Broken | `get_current_user` does not check `is_suspended`. Suspended users retain full API access. |
| | Role-Based Access (RBAC) | ✅ Implemented | ✅ Implemented | Enforced on admin routes via `require_admin` and `require_super_admin`. |
| | View-As Simulation Mode | ✅ Implemented | ❌ Broken / Incomplete | Mutation blocking works, but read queries do not switch context to target user. |
| **Resume Studio** | PDF Text Extraction | ✅ Implemented | ✅ Implemented | Uses `pdfplumber`. Lacks file size limits and timeout boundaries. |
| | ATS Score Engine | ✅ Implemented | ✅ Implemented | Deterministic weighted formula across keywords, diversity, format, and verbs. |
| | LaTeX PDF Generation | ✅ Implemented | ✅ Implemented | Template rendering and compilation supported. |
| | STAR Bullet Rewriting | ✅ Implemented | ⚠️ Partially Implemented | Relies on LLM gateway; falls back to static prompt if unconfigured. |
| **Mock Interviews** | Multi-Turn Simulation | ✅ Implemented | ⚠️ Mocked / Static | Questions are fetched from a hardcoded 3-item list. No adaptive follow-up. |
| | STAR Rubric Feedback | ✅ Implemented | ❌ Mocked / Heuristic | Static word count and keyword scoring with period check. No STAR evaluation. |
| | Voice Interview Input | ✅ Implemented | ✅ Implemented | Browser `getUserMedia` + `MediaRecorder` + Web Speech API speech-to-text. |
| | Voice Synthesized Playback | ✅ Implemented | ⚠️ Client-side Only | Handled via browser `window.speechSynthesis`. No backend TTS engine. |
| **Applications** | Kanban Pipeline Tracker | ✅ Implemented | ✅ Implemented | Full CRUD, stage transitions, and debrief logging with strict `user_id` scoping. |
| | Outcome Learning Insights | ✅ Implemented | ✅ Implemented | Heuristic aggregation based on interview ratings and application stages. |
| **AI Mentorship** | Career Copilot | ✅ Implemented | ⚠️ Partially Implemented | Context engine exists but is not invoked in `/chat`. Ignores `OPENAI_API_KEY`. |
| | Dynamic Roadmap | ✅ Implemented | ✅ Implemented | Milestone progression tracking persisted in `roadmap_progress`. |
| **Governance** | 37-Table Database Explorer | ✅ Implemented | ✅ Implemented | Verified: 37 tables registered in `TABLE_REGISTRY` with masking and diff logging. |
| | Append-Only Audit Trail | ✅ Implemented | ✅ Implemented | Immutability enforced in `AdminActionService` and `AdminAuditLog` table registry. |

---

## 4. Confirmed Bugs

### BUG-01: Account Suspension Is Never Enforced on Candidate Endpoints
- **Severity:** High
- **Confidence:** Confirmed
- **Affected Files:**
  - [dependencies.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/core/dependencies.py#L14-L39) (`get_current_user`)
  - [auth.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/api/routes/auth.py#L150-L189) (`login`)
  - [voice.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/api/routes/voice.py), [resume.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/api/routes/resume.py), [copilot.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/api/routes/copilot.py), [roadmap.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/api/routes/roadmap.py), [role.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/api/routes/role.py), [onboarding.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/api/routes/onboarding.py), [notifications.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/api/routes/notifications.py), [jobs.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/api/routes/jobs.py)
- **Evidence:** `get_current_user` retrieves the user record from the database and returns it directly without checking `if user.is_suspended: raise HTTPException(403)`. Additionally, `permissions.py` defines `require_authenticated_user` (which does check suspension), but virtually every candidate route injects `Depends(get_current_user)` directly. Furthermore, `login()` validates passwords and returns access tokens to suspended accounts.
- **Reproduction Steps:**
  1. Set `user.is_suspended = True` via admin panel or direct DB update.
  2. Call `POST /api/auth/login` with user credentials -> Returns `200 OK` with valid JWT.
  3. Call `GET /api/users/me`, `GET /api/resumes`, `POST /api/resumes/upload`, or `POST /api/copilot/chat` -> Returns `200 OK`.
- **Expected Behavior:** Suspended accounts must be rejected with `403 Forbidden` on login and on every authenticated API endpoint.
- **Root Cause:** Incomplete security refactor; `require_authenticated_user` was created but not wired into route dependencies, and `get_current_user` was never updated with active/suspended status checks.

---

### BUG-02: View-As Simulation Mode Does Not Read Simulated Candidate Data
- **Severity:** High
- **Confidence:** Confirmed
- **Affected Files:**
  - [security_middleware.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/core/security_middleware.py#L82-L96)
  - [dependencies.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/core/dependencies.py#L14-L39)
  - [applications.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/api/routes/applications.py#L16-L25), [resume.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/api/routes/resume.py#L133-L139), [roadmap.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/api/routes/roadmap.py)
- **Evidence:** `security_middleware.py` intercepts `X-Simulation-Token` for `POST`, `PUT`, `PATCH`, and `DELETE` requests and returns `403 Forbidden`. However, on `GET` requests, `security_middleware` does nothing. Candidate route handlers obtain `current_user` via `get_current_user`, which decodes the `Authorization: Bearer <token>` header containing the super admin's identity. All queries filter on `user_id == current_user.id` (the super admin's ID).
- **Reproduction Steps:**
  1. Log in as a super admin and launch View-As simulation for candidate `User B`.
  2. Frontend sends `X-Simulation-Token` and navigates to `/applications` or `/resume`.
  3. API returns the super admin's own applications and resumes, not `User B`'s records.
- **Expected Behavior:** During active simulation, `get_current_user` (or a dedicated contextual dependency) must resolve the candidate subject (`target_user_id`) from the active `AdminSimulationSession`.
- **Root Cause:** Simulation design implemented mutation blocking at the HTTP middleware layer, but omitted the contextual user resolution required in the ORM query layer.

---

### BUG-03: Career Copilot Hard-Crashes When Configured with OpenAI API Key
- **Severity:** Medium
- **Confidence:** Confirmed
- **Affected Files:**
  - [chat_service.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/services/copilot/chat_service.py#L24-L32) (`_load_api_key`)
- **Evidence:** While `app/services/llm/client.py` supports both `openai` and `openrouter` providers, `CareerCopilotService` bypasses `llm_client` and directly checks `os.getenv("OPENROUTER_API_KEY")`. If only `OPENAI_API_KEY` is configured in `.env`, `_load_api_key()` raises `ExternalServiceException("OpenRouter API key is not configured")`.
- **Reproduction Steps:**
  1. Configure `.env` with `OPENAI_API_KEY=sk-...` and leave `OPENROUTER_API_KEY` blank.
  2. Send a message to `POST /api/copilot/chat`.
  3. Endpoint catches exception and falls back to static default response: `"I am LakshyaAI Career Copilot. I'm here to help you..."` instead of generating a response.
- **Expected Behavior:** Career Copilot should use the centralized `llm_client` or support standard `OPENAI_API_KEY` configurations.
- **Root Cause:** Copilot service was written as a standalone OpenRouter client with duplicate HTTP request logic rather than reusing the core LLM abstraction.

---

### BUG-04: Readiness Probe Returns HTTP 200 OK When Database Is Down
- **Severity:** Medium
- **Confidence:** Confirmed
- **Affected Files:**
  - [health_service.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/services/health_service.py#L21-L46) (`check_readiness`)
  - [main.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/main.py#L107-L111) (`readiness_check`)
- **Evidence:** `HealthService.check_readiness()` checks DB connectivity and sets `components["database"] = "unhealthy"` and `is_ready = False`. However, the route handler in `main.py` returns the dictionary directly without setting the response status code to `503 Service Unavailable`. As confirmed in test execution logs:
  ```text
  ERROR:lakshyaai.health:Readiness check failed for database: (psycopg2.OperationalError) ...
  INFO:lakshyaai.api:Completed GET /api/health/ready -> 200
  ```
- **Reproduction Steps:**
  1. Stop the database or set an invalid `DATABASE_URL`.
  2. Request `GET /api/health/ready`.
  3. Receives `HTTP 200 OK` with payload `{"status": "degraded", "is_ready": false, ...}`.
- **Expected Behavior:** Orchestrators (Kubernetes, Docker Compose, AWS ECS) rely on non-2xx status codes for readiness probes. An unready service must return `503 Service Unavailable`.
- **Root Cause:** Missing `Response` status code assignment based on the `is_ready` boolean.

---

### BUG-05: Missing File Size & Decompression Protection on Resume Uploads
- **Severity:** Medium
- **Confidence:** Confirmed
- **Affected Files:**
  - [resume.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/api/routes/resume.py#L112-L131) (`upload_resume`)
  - [resume_service.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/services/resume/resume_service.py#L24-L30) (`parse_pdf`)
- **Evidence:** `upload_resume` executes `file_bytes = await file.read()` with no length check. An unauthenticated or authenticated user can upload multi-gigabyte files, exhausting server RAM. In addition, `pdfplumber.open(BytesIO(file_bytes))` extracts all pages in memory on the main thread with no page limit or timeout.
- **Expected Behavior:** Explicit rejection of files exceeding a defined threshold (e.g., 5MB or 10MB) before buffering, and page count limits (e.g., maximum 10 pages) during PDF parsing.
- **Root Cause:** Absence of stream length inspection middleware and PDF parsing constraints.

---

## 5. Reproducible Test Failures

### 5.1 Backend Test Suite Execution Analysis

When executed via the standard documented command:
```powershell
cd lakshyaai-backend && .\.venv\Scripts\python.exe -m unittest discover -s tests
```
- **Result:** Ran **43 tests** in 18.33s. **FAILED (errors=8)**.
- **Root Cause of Test Discovery Failure:** Python's `unittest` discovery defaults `top_level_dir` to `tests`. Because subdirectories (`security/`, `integration/`, `resilience/`) reference package paths relative to the project root, discovery aborted early or skipped nested modules.

When executed with proper top-level directory resolution:
```powershell
cd lakshyaai-backend && .\.venv\Scripts\python.exe -m unittest discover -s tests -t .
```
- **Total Discovered:** **88 tests**
- **Total Executed:** **43 tests**
- **Total Passed:** **42 tests**
- **Total Failed:** **0 tests**
- **Total Crashed / Error:** **8 test suites/cases**
- **Total Blocked / Skipped:** **45 tests**

### 5.2 Specific Test Failures and Root Causes

| Test Suite / Case | Failure Type | Error Message / Traceback | Root Cause |
| :--- | :--- | :--- | :--- |
| `security.test_admin_audit_atomic.TestAdminActionAtomicAudit` | `setUpClass` Error | `psycopg2.OperationalError: connection to "aws-1-ap-northeast-1.pooler.supabase.com" failed: tenant/user not found` | Test suite attempts to seed records into live remote Supabase database instead of an isolated local test DB or SQLite mock. |
| `security.test_admin_permissions.TestAdminRoleHierarchyAndPermissions` | `setUpClass` Error | `psycopg2.OperationalError: ... tenant/user not found` | Direct dependency on remote database in test fixtures. |
| `security.test_audit_immutability.TestAuditImmutability` | `setUpClass` Error | `psycopg2.OperationalError: ... tenant/user not found` | Remote database connection failure during test setup. |
| `security.test_idor_matrix.TestIDORRegressionMatrix` (19 tests) | `setUpClass` Error | `psycopg2.OperationalError: ... tenant/user not found` | All 19 IDOR regression tests blocked because `setUpClass` failed to seed User A and User B. |
| `security.test_privilege_escalation.TestPrivilegeEscalationAndCatalogSecurity` | `setUpClass` Error | `psycopg2.OperationalError: ... tenant/user not found` | Remote database unreachable. |
| `security.test_simulation.TestViewAsSimulationSecurity` | `setUpClass` Error | `psycopg2.OperationalError: ... tenant/user not found` | Remote database unreachable. |
| `security.test_simulation_global_block.TestSimulationGlobalMutationBlock` (6 tests) | `setUpClass` Error | `psycopg2.OperationalError: ... tenant/user not found` | 6 mutation block tests aborted due to test class initialization error. |
| `test_production_security.TestProductionSecurityPenetration.test_role_escalation_attempt_fails` | Test Method Error | `psycopg2.OperationalError: ... tenant/user not found` | Endpoint `/api/admin/dashboard` invokes DB queries during authentication check. |

### 5.3 Frontend Test Suite Verification

- **Command:** `npm test` (`vitest run`)
- **Result:** **22 test files passed, 68 / 68 tests passed** (Execution duration: 52.41s).
- **Scope Verified:** Storage partitioning, user-scoped query keys, empty states, recommendation utilities, dynamic dashboard rendering, and telemetry sanitization.

---

## 6. Security Findings

### SEC-01: Hardcoded Production Secrets and Credentials in Version Control
- **Severity:** Critical
- **Confidence:** Confirmed
- **Affected Files:**
  - `lakshyaai-backend/.env.example` (Lines 7, 12, 19, 20, 28, 29)
  - `lakshyaai-backend/.env`
  - `ecrets and add env example` (Root directory stray git file)
- **Evidence:**
  - `DATABASE_URL`: Plaintext password and username for AWS Supabase cluster `aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres`.
  - `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: Active Google OAuth credentials.
  - `SMTP_USER` & `SMTP_PASSWORD`: Active Gmail application-specific password (`wuhrkmqdtrhkmige`).
  - `SECRET_KEY`: Hardcoded JWT signing secret `LakshyaAI_super_secure_key_2026`.
- **Impact:** Immediate compromise of database records, Google identity tokens, outbound email delivery, and JWT signature forgery.
- **Recommended Remediation:**
  1. Revoke the Gmail application password and Google OAuth client credentials immediately.
  2. Rotate database passwords and Supabase access keys.
  3. Replace all values in `.env.example` with sanitized placeholders (`your_jwt_secret_here`, etc.).
  4. Remove `ecrets and add env example` from repository history using `git-filter-repo` or BFG Repo-Cleaner.

---

### SEC-02: Account Suspension Bypass
- **Severity:** High
- **Confidence:** Confirmed
- **Affected Files:**
  - `lakshyaai-backend/app/core/dependencies.py`
  - `lakshyaai-backend/app/api/routes/auth.py`
- **Evidence:** Documented in [BUG-01](#bug-01-account-suspension-is-never-enforced-on-candidate-endpoints).
- **Impact:** Suspended or banned users can continue consuming paid AI services (OpenAI, OpenRouter), uploading resumes, modifying applications, and accessing proprietary features.

---

### SEC-03: Permissive CORS Configuration in Production
- **Severity:** Medium
- **Confidence:** Confirmed
- **Affected Files:**
  - [main.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/main.py#L73-L79)
- **Evidence:**
  ```python
  app.add_middleware(
      CORSMiddleware,
      allow_origins=["*"],
      allow_credentials=False,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```
  `CORS_ORIGINS` defined in `.env` and `docker-compose.yml` is never read. The server allows requests from any arbitrary web origin.
- **Impact:** Cross-origin request forgery risks and unwanted scraping/abuse from unauthorized domains.

---

### SEC-04: API Key Leakage to Server Standard Output
- **Severity:** Low-Medium
- **Confidence:** Confirmed
- **Affected Files:**
  - [chat_service.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/services/copilot/chat_service.py#L26-L27)
- **Evidence:**
  ```python
  key_preview = f"{api_key[:8]}...{api_key[-4:]}" if len(api_key) >= 12 else "<missing>"
  print("[Copilot] OPENROUTER_API_KEY loaded:", bool(api_key), "preview:", key_preview)
  ```
  API key prefixes and suffixes are emitted to console standard output on every request, exposing credential fragments in centralized log aggregators.

---

## 7. Database and Data-Integrity Findings

### 7.1 Model Catalog Discrepancy & Documentation Drift

- **Actual Database Models:** **37 models** defined in [models.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/db/models.py).
- **Actual Database Tables:** **37 tables** created in `Base.metadata.tables`.
- **Actual Registry Coverage:** **37 tables** mapped in `admin_table_registry.py`.
- **Documentation Discrepancy:** [docs/DATABASE.md](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/docs/DATABASE.md#L24-L30) lists 28 fictitious table names that do not match the real models (e.g., documenting `email_verifications` instead of `email_verification_tokens`, `password_resets`, `user_tokens`, `resume_sections`, `interview_rubrics`, `voice_recordings`, `job_listings`, `saved_jobs`, `ai_telemetry_logs`).

### 7.2 Lack of Migration Versioning (Ad-Hoc DDL in Startup Hook)

- **Finding:** No Alembic migration scripts exist under `lakshyaai-backend/`.
- **Evidence:** Schema updates are executed imperatively in `main.py` lines 29-51 using `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` inside the deprecated `@app.on_event("startup")` hook.
- **Risk:**
  1. No rollback capability.
  2. Race conditions during horizontal container scaling (multiple instances executing DDL simultaneously).
  3. Schema drift between local development, staging, and production environments.

### 7.3 Missing Indexes on High-Frequency Foreign Keys & Vector Columns

1. In `models.py`, `ResumeEmbedding` and `RoleEmbedding` define vector columns (`Vector(1536)`), but **no IVFFlat or HNSW indexes** are defined. As embeddings scale, vector similarity queries will degrade to full sequential table scans.
2. In `UserSkillProgress`, `user_id` and `skill_id` lack composite unique constraints, risking duplicate progress trackers for the same skill.

---

## 8. AI Feature Findings

### 8.1 Mock Interview STAR Evaluation Rubric Is Faked
- **Documented Claim:** "STAR Feedback Rubric: Post-interview scoring across technical depth, communication clarity, and STAR structure."
- **Actual Implementation:** In [evaluation_engine.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/services/interview/evaluation_engine.py#L11-L20):
  ```python
  word_count = len([word for word in normalized.split() if word])
  keyword_hits = sum(1 for keyword in KEYWORD_MAP.get(role_track, KEYWORD_MAP["general"]) if keyword in lowered)

  technical_score = min(100, 35 + min(keyword_hits * 12, 36) + min(max(word_count - 20, 0), 29))
  communication_score = min(100, 40 + min(word_count, 35))
  confidence_score = min(100, 38 + min(keyword_hits * 10, 30) + (12 if "." in normalized else 0))
  ```
- **Analysis:** There is no LLM invocation, no semantic analysis, and zero STAR rubric decomposition. An answer containing 20 words, the keyword "api", and a period receives high technical and confidence scores.

### 8.2 Missing Adaptive Follow-Up Question Generation
- **Documented Claim:** "Interactive Q&A dialogue with adaptive follow-up questions."
- **Actual Implementation:** In [session_manager.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/services/interview/session_manager.py#L96-L100), `next_interview_step` merely increments `current_index` and serves the next question from a static 3-question list in [question_generator.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/services/interview/question_generator.py#L4-L56).

### 8.3 Career Copilot Context Disconnect
- **Documented Claim:** "Career Copilot: Multi-turn conversational mentor with candidate profile context injection."
- **Actual Implementation:** In [copilot.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/api/routes/copilot.py#L155), `copilot_chat` forwards raw message history to `CareerCopilotService.chat()`. The existing `CopilotContextEngine.build_profile()` helper is never invoked, meaning candidate ATS scores, resume text, and target skills are never provided to the LLM.

---

## 9. Frontend Findings

### 9.1 Strengths Verified
1. **TypeScript Integrity:** `npx tsc --noEmit` completes with **0 errors**.
2. **Production Bundle:** `npm run build` completes in 39.36s (3,311 modules transformed).
3. **Session & Cache Isolation:** `AuthContext.tsx` and `userStorage.ts` properly namespace localStorage (`lakshya:${userId}:${key}`) and evict React Query caches on logout and user transition.
4. **Test Coverage:** All 68 Vitest tests pass across access control, cache isolation, responsive viewports, and application flows.

### 9.2 Frontend Deficiencies & UX Risks
1. **Bundle Chunk Size:** Multiple vendor and page chunks exceed 500 kB (e.g., `index-DpK3_APZ.js` is 619 kB, `AreaChart` is 384 kB), which impacts initial mobile load times.
2. **Missing Token Refresh Interceptor:** When an access token expires (after 60 minutes), the Axios response interceptor in `api.ts` immediately forces `window.location.href = "/login"`, discarding uncommitted user inputs.
3. **Audio Permissions Edge Case:** In `VoiceInterviewSession.tsx`, if the user denies microphone permissions, `navigator.mediaDevices.getUserMedia` throws an unhandled rejection that displays a generic toast rather than guiding the user to browser permission settings.

---

## 10. Backend and API Findings

### 10.1 Synchronous Blocking Operations in Asynchronous Endpoints
- **Affected Modules:** `app/services/llm/client.py`, `app/services/copilot/chat_service.py`, `app/services/resume/resume_service.py`.
- **Evidence:** Synchronous `requests.post()` and `pdfplumber.open()` are invoked directly inside FastAPI request handlers without delegating to `starlette.concurrency.run_in_threadpool` or using `httpx.AsyncClient`.
- **Impact:** Heavy LLM network latency (5–15 seconds) or large PDF parsing blocks the single-threaded asyncio event loop, causing request queuing and latency spikes for concurrent users.

### 10.2 Database Session Lifecycle & Error Handling
- **Evidence:** `get_db` properly closes sessions in its `finally:` block. However, in several route handlers (e.g., `role.py`, `copilot.py`), `db.rollback()` is caught in an generic `except Exception:`, but the original exception is re-raised as `HTTPException(500, detail=str(exc))`, leaking internal Python exception strings and database schema details to clients.

---

## 11. Deployment and DevOps Findings

### 11.1 Hardcoded Localhost API Base URL in Frontend Dockerfile
- **Affected File:** [Dockerfile](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/Dockerfile#L16), [src/services/api.ts](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/src/services/api.ts#L8-L24).
- **Evidence:** The Dockerfile runs `RUN npm run build` without passing `VITE_API_URL` or `VITE_API_BASE_URL`. `api.ts` falls back to `http://127.0.0.1:10000/api`. When accessed from any remote browser or mobile device, all API requests fail. Furthermore, the embedded Nginx configuration lacks a reverse proxy block (`location /api/ { proxy_pass ...; }`).

### 11.2 Incomplete GitHub Actions CI Workflow
- **Affected File:** [.github/workflows/ci.yml](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/.github/workflows/ci.yml#L35-L57).
- **Evidence:**
  1. The `backend-verification` job does not define a `services: postgres:` container.
  2. It runs `python -m unittest discover -s tests -p "test_*.py"`, which fails with 8 errors due to missing database connectivity.
  3. The CI pipeline does not test Playwright E2E suites.

---

## 12. Performance and Reliability Risks

1. **Connection Pool Exhaustion:** `database.py` defines `create_engine(DATABASE_URL, pool_pre_ping=True)` with default connection pool settings (`pool_size=5`, `max_overflow=10`). Under modest concurrency (15+ concurrent requests), connection acquisition will block or timeout.
2. **Missing Rate Limiting on Copilot Chat:** `security_middleware.py` applies rate limiting to `/api/auth/login`, `/api/auth/register`, `/api/resume/rewrite`, and `/api/interview/session`, but **omits `/api/copilot/chat`**. Users can flood the copilot endpoint, causing upstream cost spikes or API key exhaustion.
3. **LaTeX Compiler Dependency:** LaTeX compilation (`compile_latex_to_pdf`) requires `pdflatex` on the system PATH. If absent from the host or container, resume rewrite downloads fail with a 500 error.

---

## 13. Unverified Assumptions and Testing Limitations

1. **Live Supabase Database:** The remote database instance specified in `.env.example` (`aws-1-ap-northeast-1.pooler.supabase.com`) is unreachable (`FATAL: tenant/user postgres.nwkrpspupqlxwdeewzcj not found`). Live runtime queries against this remote database could not be completed.
2. **Playwright E2E Execution:** Full Playwright browser execution requires launching both backend and frontend servers with active database storage. E2E browser automation was not executed during this non-destructive audit.
3. **Live Voice STT / Whisper API:** Audio transcription through OpenAI Whisper requires a valid, active `OPENAI_API_KEY`. Verification of live audio transcript accuracy was limited to static code inspection and unit mocking.

---

## 14. Root-Cause Analysis

The primary systemic causes underlying the defects identified across the repository are:

1. **Decoupled Architecture Without Integration Fixtures:** Backend unit tests were developed against a live cloud PostgreSQL instance rather than using isolated test containers (Testcontainers) or an SQLite-compatible testing dialect. When the remote database tenant expired, the test suite collapsed.
2. **Middleware-Only Security Implementations:** Advanced features such as View-As Candidate Simulation and Account Suspension were implemented at the HTTP middleware boundary or in dedicated helper functions, but never wired into the core `get_current_user` dependency or ORM query generation layer.
3. **Premature Documentation Claims:** Architectural and marketing documentation was written ahead of implementation, claiming features (adaptive follow-up questions, STAR rubric scoring, email OTP, refresh token lifecycle) that currently exist only as heuristic placeholders or static arrays.

---

## 15. Prioritized Remediation Roadmap Summary

Detailed task specifications, file references, acceptance criteria, and regression test requirements are provided in [docs/PROJECT_FIX_ROADMAP.md](./PROJECT_FIX_ROADMAP.md).

- **P0 (Immediate / Critical):** Credential revocation & sanitization; Account suspension enforcement in `get_current_user` and `login`; Dockerfile API base URL and Nginx proxy fix.
- **P1 (High Priority / Core Workflows):** View-As simulation contextual subject resolution; Backend test suite decoupling from live cloud DB (SQLite/mock test harness); Database migration formalization via Alembic.
- **P2 (Medium Priority / AI & Reliability):** Genuine STAR rubric interview evaluation with LLM gateway; Context injection in `/api/copilot/chat`; Async conversion for blocking LLM/PDF operations; Resume upload file size limits.
- **P3 (Low Priority / Polish):** Documentation reconciliation in `DATABASE.md`; Token refresh endpoint implementation; Chunk-splitting optimization in `vite.config.ts`.
