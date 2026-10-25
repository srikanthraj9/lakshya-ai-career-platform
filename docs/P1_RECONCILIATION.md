# Lakshya AI — Phase P1 Preflight & Scope Reconciliation Report

**Date:** 2026-10-15  
**Audit Baseline:** [PROJECT_AUDIT_REPORT.md](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/docs/PROJECT_AUDIT_REPORT.md)  
**Initial Roadmap:** [PROJECT_FIX_ROADMAP.md](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/docs/PROJECT_FIX_ROADMAP.md)  
**Phase P0 Execution Record:** [REPAIR_EXECUTION_REPORT.md](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/docs/REPAIR_EXECUTION_REPORT.md)  
**Status:** **PREFLIGHT RECONCILIATION COMPLETE — READY FOR CONTROLLED P1 IMPLEMENTATION**

---

## 1. Executive Summary & Purpose

This reconciliation document evaluates the state of the Lakshya AI codebase following the completion of Phase P0. It verifies what was fixed, audits remaining vulnerabilities, resolves scope discrepancies between earlier roadmap drafts and the execution report, and establishes a strict, dependency-ordered plan for Phase P1.

---

## 2. Verification of Phase P0 Closure

### 2.1 Credential Remediation & Repository Exposure Status
- **Files Sanitized in Working Tree:**
  - `lakshyaai-backend/.env.example`: All sensitive production credentials (Google OAuth client secrets, Gmail SMTP application password, Supabase database password, and JWT signing secret) have been replaced with safe placeholders (`your_super_secure_jwt_secret_key_change_in_production`, `postgresql://postgres:postgrespassword@localhost:5432/lakshyaai`, etc.).
  - `"ecrets and add env example\357\200\242"`: Stray root-level tracking artifact staged for removal.
  - `lakshyaai-backend/.env`: Removed from git tracking index; `.gitignore` line 2 verified to ignore `.env` at all directory depths (`git check-ignore -v lakshyaai-backend/.env` confirmed match on `.gitignore:2:.env`).
  - Production frontend build bundles in `dist/` and source in `src/`: Scanned for credential patterns; zero secrets detected in client bundles.
- **Exposure Reality & Unresolved External Action:**
  - ⚠️ **Credential Rotation Status: UNVERIFIED / PENDING MANUAL USER ACTION.**
    While the local repository files are sanitized, git commit history prior to this remediation contains historical commits with plaintext credentials. 
    **Critical rule:** Credential rotation cannot be marked complete without explicit evidence of revocation in third-party provider dashboards (Google Cloud Console, Google Account Security, Supabase Dashboard).
  - ⚠️ **Shared Git History:** Git history rewriting (`git-filter-repo` / BFG) has deliberately **NOT** been performed to prevent breaking shared branches without explicit coordination.

### 2.2 Account Status Enforcement Verification
- **Verified Across All Gateway Paths:**
  1. `POST /api/auth/login`: Verified that `db_user.is_active` (`403 Forbidden: Account is deactivated. Please contact support.`) and `db_user.is_suspended` (`403 Forbidden: Account is suspended: <reason>`) are checked immediately after credential verification and before token generation.
  2. `GET /api/auth/google/callback`: Verified that existing users attempting Google OAuth login are checked for `is_active` and `is_suspended`, redirecting to `/login?error=account_deactivated` and `/login?error=account_suspended`.
  3. `get_current_user` ([dependencies.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/core/dependencies.py)): Enforces `is_active` and `is_suspended` on all endpoints injecting current user. Existing tokens presented by deactivated or suspended accounts are rejected with HTTP 403.
  4. `get_optional_current_user` ([dependencies.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/core/dependencies.py)): Returns `None` for deactivated or suspended accounts.
  5. `require_authenticated_user`, `require_admin`, `require_super_admin` ([permissions.py](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/core/permissions.py)): Reinforced with `is_active` checks.
- **Evidence:** Regression test suite [`tests/security/test_account_status_security.py`](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/tests/security/test_account_status_security.py) executed via Python 3.12: **11 / 11 tests passed**.

### 2.3 Production Frontend API & Docker Architecture Verification
- **Verified Configuration:**
  - `src/services/api.ts`: `resolveApiBaseUrl()` defaults to relative `"/api"` in production builds when explicit environment variables are not supplied. Local development preserves `http://127.0.0.1:10000/api`.
  - `nginx.conf`: Dedicated configuration created with `location /api/ { proxy_pass http://backend:10000/api/; ... }` forwarding headers, WebSocket upgrade, 90s timeout, and client max body size 10M.
  - `Dockerfile`: Accepts `ARG VITE_API_URL` and `ARG VITE_API_BASE_URL` in builder stage; copies `nginx.conf` into `/etc/nginx/conf.d/default.conf`.
- **Testing Status & Boundaries:**
  - Unit/Configuration tests in [`src/test/apiConfiguration.test.ts`](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/src/test/apiConfiguration.test.ts): **7 / 7 tests passed**.
  - Vitest full suite: **75 / 75 tests passed** across 23 test files.
  - Production build: `npm run build` compiled 3,311 modules with **0 errors**.
  - ⚠️ **Live Docker Engine Verification:** Not executed in this turn (requires running Docker daemon and live multi-container network invocation, deferred to avoid irreversible or unsupported deployment actions).

---

## 3. Scope Reconciliation & Roadmap Conflict Analysis

### 3.1 Conflicting Roadmap Items
A discrepancy exists between `PROJECT_FIX_ROADMAP.md` and the footer summary in `REPAIR_EXECUTION_REPORT.md`:

| Task Area | `PROJECT_FIX_ROADMAP.md` Placement | `REPAIR_EXECUTION_REPORT.md` Note | Reconciliation Decision |
| :--- | :--- | :--- | :--- |
| **Test Runner Decoupling** | Task `P1-01` (High) | Omitted from report footer | **Must remain Task 1 in P1.** Prerequisite for all backend verification. |
| **View-As Simulation** | Task `P1-02` (High) | Omitted from report footer | **Must remain in P1.** High security / architectural gap (`ARCH-01`). |
| **Alembic Migrations** | Task `P1-03` (High) | Omitted from report footer | **Must remain in P1.** Prerequisite for adding indexes and modifying database constraints safely. |
| **STAR Rubric Evaluation** | Task `P2-01` (Med-High) | Listed as P1-01 in report footer | **Included in P1 as Task 6.** Essential core feature fix. |
| **SQLAlchemy Cascades** | Audit Dimension 7 / Unnumbered | Listed as P1-02 in report footer | **Formalized as P1-04.** Prevents orphan records and integrity errors. |
| **Interview State Locks** | Audit Dimension 4 / Unnumbered | Listed as P1-03 in report footer | **Formalized as P1-07.** Protects interview flow from race conditions. |
| **Missing Database Indexes** | Audit Dimension 7.3 / Unnumbered | Listed as P1-04 in report footer | **Formalized as P1-05.** Applied via Alembic migration. |

---

## 4. Prioritized, Dependency-Aware Phase P1 Task Sequence

```mermaid
graph TD
    P1_01["P1-01: Isolated Test Infrastructure (TEST-01)"] --> P1_02["P1-02: Alembic Migrations Framework (DATA-01)"]
    P1_01 --> P1_03["P1-03: View-As Simulation Scoping (ARCH-01)"]
    P1_02 --> P1_04["P1-04: SQLAlchemy Relationship Cascades (DATA-03)"]
    P1_02 --> P1_05["P1-05: High-Frequency & Vector Indexes (DATA-04)"]
    P1_01 --> P1_06["P1-06: Genuine LLM STAR Rubric Evaluation (AI-01)"]
    P1_06 --> P1_07["P1-07: Interview Session State & Concurrency Lock (BUG-06)"]
```

---

### Task P1-01: Decouple Backend Test Suite & Provide Isolated PostgreSQL Test Fixture
- **Issue ID:** `TEST-01`
- **Original Roadmap Priority:** P1-01 (High)
- **Dependencies:** None.
- **Security / Integrity Impact:** High. 45 backend security and isolation tests (including IDOR matrix, audit immutability, role hierarchy, simulation global block) are currently blocked from running because `database.py` attempts to connect to an external Supabase instance.
- **Affected Files:**
  - `lakshyaai-backend/app/db/database.py`
  - `lakshyaai-backend/tests/conftest.py` (or test base classes)
  - `lakshyaai-backend/tests/security/` (all test classes relying on `SessionLocal`)
- **Action Plan:**
  1. Introduce an environment-aware engine provider in `database.py` that defaults to SQLite in-memory or a local PostgreSQL test instance when `TESTING=true` or during unittest discovery.
  2. Implement a unified test transaction rollback fixture so tests do not leave state or attempt remote connections.
  3. Ensure `python -m unittest discover -s tests -t .` discovers and executes all 88 tests cleanly.
- **Acceptance Criteria:**
  - All 88 backend tests execute locally with 0 errors and 0 failures without network egress.

---

### Task P1-02: Implement Alembic Versioned Migrations & Remove DDL from App Startup
- **Issue ID:** `DATA-01`
- **Original Roadmap Priority:** P1-03 (High)
- **Dependencies:** `P1-01` (requires working test harness).
- **Security / Integrity Impact:** High. `main.py` lines 29–51 imperatively execute `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` inside startup hooks on every application boot. This creates race conditions during horizontal container scaling and prevents rollback.
- **Affected Files:**
  - `lakshyaai-backend/alembic.ini`
  - `lakshyaai-backend/alembic/` (new migration environment)
  - `lakshyaai-backend/app/main.py` (remove imperative DDL from startup)
- **Action Plan:**
  1. Initialize Alembic configuration connected to `app.db.models.Base.metadata`.
  2. Generate baseline migration representing the 37 models and pgvector extension.
  3. Remove imperative `ALTER TABLE` statements from `main.py`.
- **Acceptance Criteria:**
  - Database schema can be migrated cleanly via `alembic upgrade head`.
  - Application startup executes zero DDL statements.

---

### Task P1-03: Fix View-As Simulation Mode Query Scoping (Architectural Alignment)
- **Issue ID:** `ARCH-01 / BUG-02`
- **Original Roadmap Priority:** P1-02 (High)
- **Dependencies:** `P1-01`.
- **Security / Integrity Impact:** High. When a super admin views as a candidate using `X-Simulation-Token`, candidate read endpoints (`/api/applications`, `/api/resumes`, `/api/roadmap`) query with `current_user.id` (the admin's ID) rather than the simulated `target_user.id`. The admin sees their own empty state instead of the candidate's records.
- **Affected Files:**
  - `lakshyaai-backend/app/core/dependencies.py` (`get_current_user`)
  - `lakshyaai-backend/app/services/simulation_service.py`
  - `lakshyaai-backend/app/core/security_middleware.py`
- **Action Plan:**
  1. In `get_current_user`, inspect `request.headers.get("X-Simulation-Token")`.
  2. If present and valid for an active `AdminSimulationSession`, resolve and return the target candidate user (`target_user`), while setting `request.state.actor_id = admin_user.id`.
  3. Ensure that `security_middleware.py` continues rejecting all mutating methods (`POST`, `PUT`, `PATCH`, `DELETE`) with `403 Forbidden` to maintain read-only safety.
- **Acceptance Criteria:**
  - Admin under View-As mode sees candidate's applications, resumes, and roadmap.
  - Any mutation attempt by simulating admin returns 403 Forbidden.
- **Required Tests:**
  - `tests/security/test_simulation.py` (all tests passing).
  - `tests/security/test_simulation_global_block.py` (all 6 tests passing).

---

### Task P1-04: Formalize SQLAlchemy Relationship Cascades & Foreign Key Invariants
- **Issue ID:** `DATA-03`
- **Original Roadmap Priority:** Unnumbered (Identified in Execution Report & Audit Dimension 7)
- **Dependencies:** `P1-01`, `P1-02`.
- **Security / Integrity Impact:** Medium-High. Several relationships lack `cascade="all, delete"` or explicit `ondelete="CASCADE"` on foreign keys (e.g., `UserSkillProgress`, `InterviewDebrief`, `ApplicationEvent`). Deleting a user or application can trigger foreign key constraint errors or leave orphan records.
- **Affected Files:**
  - `lakshyaai-backend/app/db/models.py`
- **Action Plan:**
  1. Audit all 37 models for foreign keys without matching `ondelete="CASCADE"`.
  2. Add `cascade="all, delete"` and `back_populates` to `UserSkillProgress` and related child collections.
  3. Verify cascading delete behavior with an automated regression test.
- **Acceptance Criteria:**
  - Deleting a parent `User` or `JobApplication` cleanly cascades to all child records with zero foreign key violations.

---

### Task P1-05: Add High-Frequency Foreign Key & PgVector Indexes
- **Issue ID:** `DATA-04`
- **Original Roadmap Priority:** Unnumbered (Audit Dimension 7.3)
- **Dependencies:** `P1-02` (Alembic migration).
- **Performance / Scalability Impact:** Medium-High. `ResumeEmbedding` and `RoleEmbedding` define `Vector(1536)` columns with no vector index, causing full table scans for similarity search. Composite foreign keys on `UserSkillProgress` (`user_id`, `skill_id`) lack unique lookup indexes.
- **Affected Files:**
  - `lakshyaai-backend/app/db/models.py`
  - Alembic migration version script
- **Action Plan:**
  1. Add HNSW vector indexes to `ResumeEmbedding.embedding` and `RoleEmbedding.embedding` for cosine distance (`vector_cosine_ops`).
  2. Add composite index on `(user_id, skill_id)` in `UserSkillProgress`.
  3. Generate Alembic migration script for index creation.
- **Acceptance Criteria:**
  - Vector similarity queries utilize index scans rather than sequential scans.

---

### Task P1-06: Replace Heuristic Mock Interview Evaluation with Real LLM STAR Rubric
- **Issue ID:** `AI-01`
- **Original Roadmap Priority:** P2-01 (Promoted to P1)
- **Dependencies:** `P1-01`.
- **Feature & Quality Impact:** High. The documented STAR rubric scoring is currently faked using word count and keyword matching (`min(keyword_hits * 12, 36) + min(max(word_count - 20, 0), 29)`).
- **Affected Files:**
  - `lakshyaai-backend/app/services/interview/evaluation_engine.py`
  - `lakshyaai-backend/app/services/interview/question_generator.py`
  - `lakshyaai-backend/app/services/interview/session_manager.py`
- **Action Plan:**
  1. Update `evaluation_engine.py` to invoke `llm_client.chat_json()` with structured prompt decomposing answer into Situation, Task, Action, and Result.
  2. Generate granular scores for Technical Depth (0–100), Communication Clarity (0–100), and STAR Structure (0–100).
  3. Retain heuristic calculation as a fallback when LLM is unconfigured or rate-limited.
- **Acceptance Criteria:**
  - Answers are semantically evaluated for technical depth and STAR structure.
  - Fallback logic gracefully handles missing API keys without crashing.

---

### Task P1-07: Mock Interview Session State Transitions & Concurrency / Race-Condition Protection
- **Issue ID:** `BUG-06`
- **Original Roadmap Priority:** Unnumbered (Audit Dimension 4 & 10)
- **Dependencies:** `P1-01`, `P1-06`.
- **Integrity & Concurrency Impact:** Medium-High. Concurrent double-submissions on `/api/interview/session/{id}/answer` read the same `current_index`, duplicate question answers, and corrupt session scores.
- **Affected Files:**
  - `lakshyaai-backend/app/services/interview/session_manager.py`
- **Action Plan:**
  1. In `submit_interview_answer`, query the session using row-level locking (`with_for_update()`) inside an atomic transaction.
  2. Check `session.status != "in_progress"` and reject submissions after completion.
  3. Ensure idempotency if a submission with the same answer or question index is re-sent.
- **Acceptance Criteria:**
  - Concurrent answer requests for the same session are serialized; no duplicate messages or index skipping occurs.

---

## 5. Acceptance Test Matrix for Phase P1

| Task | Test Suite | Target Invariant | Passing Criteria |
| :--- | :--- | :--- | :--- |
| **P1-01** | `tests/conftest.py` / `discover` | Isolated DB harness | 88 / 88 tests pass without remote Supabase |
| **P1-02** | `alembic upgrade head` | Versioned migrations | Clean baseline migration up and down |
| **P1-03** | `test_simulation.py` & `test_simulation_global_block.py` | View-As query scoping | Admin reads candidate data; mutations blocked (403) |
| **P1-04** | `test_cascades.py` (New) | Relationship cascades | Deleting User/Application cleans child rows |
| **P1-05** | Migration verification | Index definitions | HNSW & composite FK indexes created |
| **P1-06** | `test_ai_resilience.py` | STAR evaluation rubric | Valid STAR decomposition with fallback |
| **P1-07** | `test_interview_concurrency.py` (New) | State transition lock | Concurrent answers serialized without race condition |

---

## 6. Preflight Conclusion & Recommended Immediate Next Step

Phase P0 closure is verified with honest accounting of remaining manual actions (vendor credential rotation). 
Phase P1 scope has been fully reconciled into a logical, 7-task dependency graph.

**Proposed Immediate Next Step:**
Begin **Task P1-01: Decouple Backend Test Suite & Provide Isolated PostgreSQL Test Fixture** to restore full test automation across all 88 backend tests before executing database migrations or feature logic changes.
