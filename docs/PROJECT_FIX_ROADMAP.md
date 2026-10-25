# LAKSHYA AI — PRIORITIZED REMEDIATION ROADMAP

**Document Version:** 1.0.0  
**Associated Audit Report:** [docs/PROJECT_AUDIT_REPORT.md](./PROJECT_AUDIT_REPORT.md)  
**Target Completion:** Phased Engineering Execution  

---

## Priority Framework Overview

Issues are prioritized based on user safety, credential exposure, data integrity, core application usability, and test reliability:

- **P0 — Critical / Immediate:** Severe security vulnerabilities, active credential leaks, and fatal deployment breaks.
- **P1 — High Priority / Core Integrity:** Broken core workflows, authorization bypasses, architectural simulation flaws, and test suite execution blockers.
- **P2 — Medium Priority / AI & Reliability:** Placeholder AI heuristics, context injection gaps, blocking asynchronous operations, and performance bottlenecks.
- **P3 — Low Priority / Maintainability:** Documentation reconciliation, dead code removal, bundle size optimization, and minor UX polish.

---

## Phase P0: Critical Security & Deployment Fixes

### Task P0-01: Revoke, Rotate, and Sanitize Leaked Repository Credentials
- **Issue ID:** `SEC-01`
- **Severity:** Critical
- **Affected Files:**
  - `lakshyaai-backend/.env.example`
  - `lakshyaai-backend/.env`
  - `ecrets and add env example` (stray git file in workspace root)
- **Proposed Changes:**
  1. Revoke the exposed Gmail Application Password (`wuhrkmqdtrhkmige`) in Google Account Security settings immediately.
  2. Rotate the Google OAuth Client Secret and Supabase database password.
  3. Replace all credentials in `lakshyaai-backend/.env.example` with dummy placeholders (`your_jwt_secret_here`, `postgresql://user:pass@localhost:5432/lakshyaai`, etc.).
  4. Delete the stray file `ecrets and add env example` and clean git history using `git rm`.
- **Dependencies:** None.
- **Acceptance Criteria:**
  - No plaintext passwords, active OAuth secrets, or live database credentials exist anywhere in tracked repository files.
- **Regression Tests:**
  - Automated regex scan for sensitive credential patterns in all tracked `.env*` and documentation files.

---

### Task P0-02: Enforce Account Suspension on Authentication & Candidate Endpoints
- **Issue ID:** `SEC-02` / `BUG-01`
- **Severity:** High (Security)
- **Affected Files:**
  - [lakshyaai-backend/app/core/dependencies.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/core/dependencies.py)
  - [lakshyaai-backend/app/api/routes/auth.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/api/routes/auth.py)
- **Proposed Changes:**
  1. In `app/core/dependencies.py`, update `get_current_user` to inspect `user.is_suspended` and `user.is_active`. If suspended or inactive, raise `HTTPException(status_code=403, detail="Account is suspended. Please contact support.")`.
  2. In `app/api/routes/auth.py` (`login`), verify `not db_user.is_suspended` before issuing access tokens. If suspended, reject with `HTTPException(status_code=403, detail="Account is suspended.")`.
- **Dependencies:** None.
- **Acceptance Criteria:**
  - Suspended users cannot log in (receive 403 Forbidden).
  - Existing JWTs belonging to suspended users are rejected with 403 Forbidden on all API endpoints.
- **Regression Tests:**
  - `tests/security/test_auth_security.py::test_suspended_user_login_rejected`
  - `tests/security/test_auth_security.py::test_suspended_user_token_access_rejected`

---

### Task P0-03: Fix Dockerfile Production API URL & Nginx Reverse Proxy
- **Issue ID:** `DEVOPS-01`
- **Severity:** High (Deployment)
- **Affected Files:**
  - [Dockerfile](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/Dockerfile)
  - [docker-compose.yml](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/docker-compose.yml)
  - [docker-compose.prod.yml](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/docker-compose.prod.yml)
- **Proposed Changes:**
  1. Update root `Dockerfile` to accept build argument `ARG VITE_API_URL` and expose it to the `RUN npm run build` step.
  2. In the Nginx production runner stage, configure an upstream reverse proxy block for `/api/` forwarding to `http://backend:10000/api/`.
  3. Ensure client-side requests can use relative path `/api` without hardcoding `http://127.0.0.1:10000`.
- **Dependencies:** None.
- **Acceptance Criteria:**
  - Running `docker-compose up` allows access from external network interfaces and localhost without CORS or connection refused errors.
- **Regression Tests:**
  - Docker container health check probe passing.
  - Playwright browser test loading candidate dashboard inside containerized environment.

---

## Phase P1: Core Workflows, Architecture & Testing Harness

### Task P1-01: Decouple Backend Test Suite from Remote Cloud Database
- **Issue ID:** `TEST-01`
- **Severity:** High (Developer Productivity & CI Integrity)
- **Affected Files:**
  - [lakshyaai-backend/app/db/database.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/db/database.py)
  - [lakshyaai-backend/tests/security/test_idor_matrix.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/tests/security/test_idor_matrix.py)
  - All test files in `lakshyaai-backend/tests/security/`
  - [.github/workflows/ci.yml](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/.github/workflows/ci.yml)
- **Proposed Changes:**
  1. Introduce a test database fixture that provisions an isolated local PostgreSQL container (or a SQLite mock engine for non-vector tests).
  2. Configure `conftest.py` / test base class to override `get_db` and `SessionLocal` with test transaction rollbacks.
  3. Update `.github/workflows/ci.yml` to spin up a `services: postgres` container running `pgvector/pgvector:pg16` with `DATABASE_URL` configured.
  4. Update CI test execution command to `python -m unittest discover -s tests -t .`.
- **Dependencies:** None.
- **Acceptance Criteria:**
  - All 88 backend tests execute locally and in CI with 0 errors and 0 failures without connecting to external Supabase servers.
- **Regression Tests:**
  - `python -m unittest discover -s tests -t .` passes 88 / 88 tests.

---

### Task P1-02: Fix View-As Simulation Mode Query Scoping (Architectural Alignment)
- **Issue ID:** `ARCH-01` / `BUG-02`
- **Severity:** High (Feature Integrity)
- **Affected Files:**
  - [lakshyaai-backend/app/core/dependencies.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/core/dependencies.py)
  - [lakshyaai-backend/app/services/simulation_service.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/services/simulation_service.py)
  - [lakshyaai-backend/app/core/security_middleware.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/core/security_middleware.py)
- **Proposed Changes:**
  1. In `app/core/dependencies.py`, update `get_current_user` to inspect `request.headers.get("X-Simulation-Token")`.
  2. If the token is present and valid for an active `AdminSimulationSession`, resolve and return the target candidate user (`target_user`), while setting `request.state.actor_id = admin_user.id`.
  3. Ensure that all read endpoints (`GET /api/applications`, `GET /api/resumes`, `GET /api/roadmap`) naturally filter using the candidate's `user_id`.
  4. Ensure `security_middleware.py` continues rejecting all mutating methods (`POST`, `PUT`, `PATCH`, `DELETE`) with `403 Forbidden` to maintain read-only safety.
- **Dependencies:** `P1-01`.
- **Acceptance Criteria:**
  - A super admin navigating candidate pages under View-As mode sees the target candidate's applications, resumes, and career roadmap.
  - Any mutation attempt by the simulating admin is immediately blocked with 403 Forbidden.
- **Regression Tests:**
  - `tests/security/test_simulation.py::test_simulation_reads_target_candidate_data`
  - `tests/security/test_simulation_global_block.py` (all 6 tests passing).

---

### Task P1-03: Implement Alembic Versioned Migrations & Remove DDL from Startup
- **Issue ID:** `DATA-01`
- **Severity:** High (Data Integrity)
- **Affected Files:**
  - [lakshyaai-backend/app/main.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/main.py#L19-L51)
  - [lakshyaai-backend/alembic.ini](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/alembic.ini)
  - New directory: `lakshyaai-backend/alembic/versions/`
- **Proposed Changes:**
  1. Initialize Alembic environment in `lakshyaai-backend/alembic/` bound to `app.db.models.Base.metadata`.
  2. Generate baseline migration script for all 37 tables.
  3. Remove imperative `ALTER TABLE` statements and `create_all()` from `main.py` startup event.
  4. Provide deployment script / entrypoint running `alembic upgrade head`.
- **Dependencies:** None.
- **Acceptance Criteria:**
  - Database schema can be migrated up and rolled back cleanly using `alembic upgrade` / `downgrade`.
  - Application startup executes without running DDL statements on every boot.
- **Regression Tests:**
  - Migration idempotency check: `alembic upgrade head` runs without error on fresh database.

---

## Phase P2: AI Workflows, Reliability & Performance

### Task P2-01: Replace Heuristic Mock Interview Evaluation with Real LLM STAR Rubric
- **Issue ID:** `AI-01`
- **Severity:** Medium-High (Feature Integrity)
- **Affected Files:**
  - [lakshyaai-backend/app/services/interview/evaluation_engine.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/services/interview/evaluation_engine.py)
  - [lakshyaai-backend/app/services/interview/question_generator.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/services/interview/question_generator.py)
  - [lakshyaai-backend/app/services/interview/session_manager.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/services/interview/session_manager.py)
- **Proposed Changes:**
  1. Update `evaluation_engine.py` to invoke `llm_client.chat_json()` with a structured prompt that parses candidate answers into Situation, Task, Action, and Result components.
  2. Return granular scores for Technical Depth (0–100), Communication Clarity (0–100), and STAR Structure (0–100).
  3. In `session_manager.py`, generate adaptive follow-up questions using candidate answer context when `llm_client.is_configured`.
  4. Retain heuristic calculation as a fallback when LLM is unconfigured or rate-limited.
- **Dependencies:** `P1-01`.
- **Acceptance Criteria:**
  - Answers are evaluated for genuine technical content and STAR structure.
  - Nonsense answers with keywords and periods are no longer awarded high scores.
- **Regression Tests:**
  - `tests/test_ai_resilience.py::test_star_evaluation_rubric`
  - Unit test verifying fallback when LLM times out.

---

### Task P2-02: Connect Candidate Profile Context to Career Copilot Chat
- **Issue ID:** `AI-02`
- **Severity:** Medium (Feature Completeness)
- **Affected Files:**
  - [lakshyaai-backend/app/api/routes/copilot.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/api/routes/copilot.py)
  - [lakshyaai-backend/app/services/copilot/chat_service.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/services/copilot/chat_service.py)
- **Proposed Changes:**
  1. In `copilot.py` (`copilot_chat`), invoke `CopilotContextEngine.build_profile()` using candidate's latest resume and career state.
  2. Inject candidate skills, target role, ATS score, and missing keywords into the system prompt.
  3. Refactor `CareerCopilotService` to use `llm_client` (supporting both `OPENAI_API_KEY` and `OPENROUTER_API_KEY`), removing hardcoded OpenRouter-only dependency.
  4. Remove `print()` statements that log API key previews.
- **Dependencies:** `P0-01`.
- **Acceptance Criteria:**
  - Career Copilot answers questions with personalized awareness of candidate's skills and target role.
  - Copilot works seamlessly with standard `OPENAI_API_KEY`.
- **Regression Tests:**
  - `tests/integration/test_intelligence_flow.py::test_copilot_context_injection`

---

### Task P2-03: Convert Synchronous Blocking Calls to Async Worker Pools
- **Issue ID:** `PERF-01`
- **Severity:** Medium (Performance & Concurrency)
- **Affected Files:**
  - [lakshyaai-backend/app/services/llm/client.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/services/llm/client.py)
  - [lakshyaai-backend/app/services/resume/resume_service.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/services/resume/resume_service.py)
- **Proposed Changes:**
  1. Refactor `LLMClient` to use `httpx.AsyncClient` with connection pooling, timeouts, and exponential retries.
  2. Offload CPU-bound PDF parsing (`pdfplumber.open`) and LaTeX compilation (`pdflatex`) to `starlette.concurrency.run_in_threadpool`.
  3. Enforce maximum upload size limit (10MB) and maximum PDF page count (15 pages) in `upload_resume`.
- **Dependencies:** None.
- **Acceptance Criteria:**
  - Event loop latency remains < 50ms during concurrent PDF parsing and AI chat requests.
- **Regression Tests:**
  - `load-tests/api_benchmark.py` running concurrent resume uploads without timeouts.

---

### Task P2-04: Fix Readiness Probe HTTP Status Code
- **Issue ID:** `BUG-04`
- **Severity:** Medium (Reliability)
- **Affected Files:**
  - [lakshyaai-backend/app/main.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/main.py#L107-L111)
- **Proposed Changes:**
  1. In `readiness_check`, inject `response: Response` from FastAPI.
  2. If `res["is_ready"] is False`, set `response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE`.
- **Dependencies:** None.
- **Acceptance Criteria:**
  - `GET /api/health/ready` returns HTTP 503 when the database is unreachable.
- **Regression Tests:**
  - `tests/security/test_health_probes.py::test_readiness_probe_fails_when_db_down`

---

## Phase P3: Maintainability, Documentation & Polish

### Task P3-01: Reconcile Database Documentation with Actual Model Catalog
- **Issue ID:** `DATA-02`
- **Severity:** Low (Maintainability)
- **Affected Files:**
  - [docs/DATABASE.md](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/docs/DATABASE.md)
  - [README.md](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/README.md)
- **Proposed Changes:**
  1. Replace fictitious table listings in `docs/DATABASE.md` with the verified 37 table names.
  2. Update ER diagrams and relationships to reflect actual foreign keys in `models.py`.
- **Dependencies:** None.
- **Acceptance Criteria:**
  - Every table name in `docs/DATABASE.md` exists in `Base.metadata.tables`.

---

### Task P3-02: Optimize Frontend Rollup Chunk Splitting
- **Issue ID:** `FE-01`
- **Severity:** Low (Performance)
- **Affected Files:**
  - [vite.config.ts](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/vite.config.ts)
- **Proposed Changes:**
  1. Configure `manualChunks` in `vite.config.ts` to separate large vendor libraries (`recharts`, `framer-motion`, `@radix-ui`) into isolated chunks.
  2. Reduce main vendor chunk size below 500 kB.
- **Dependencies:** None.
- **Acceptance Criteria:**
  - `npm run build` generates 0 chunk size warnings.
