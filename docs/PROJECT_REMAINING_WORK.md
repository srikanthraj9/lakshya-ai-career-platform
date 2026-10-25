# Lakshya AI — Master Remaining Work Backlog

**Document Version:** 2.0.0  
**Audit Date:** 2026-10-23  
**Status:** Post-Remediation Reconciliation (Resolved Items Cataloged)  
**Classification:** Engineering Implementation Specifications  

---

## 1. Outstanding Work Requiring External Infrastructure or Human Authorization

### TASK-SEC-01: Git History Secret Scrubbing & Coordinated Credential Invalidation
- **Priority:** P0 (Highest)
- **Why It Matters:** Historical commits `1fcef6f`, `58d7914`, and `704c767` contain committed `.env` files with Supabase database passwords, Google OAuth client secrets, and Gmail SMTP application credentials. While current Git index is clean and local secrets are safeguarded, repository clones retain plaintext credentials in their object database.
- **Specific Affected Modules:** `.git` commit history, Supabase project settings, Google Cloud Console, Google Account SMTP app passwords.
- **Acceptance Criteria:**
  1. All 3 vendor credentials (Supabase DB password, Google OAuth client secret, Gmail SMTP app password) are rotated in their respective provider consoles.
  2. Coordinated `git-filter-repo` execution purges all historical instances of `.env` files from Git packfiles.
  3. Cleaned repository is force-pushed to remote with developer key verification and collaborator coordination.
- **Dependencies:** Human operator authorization and vendor web console access.
- **Risk of Implementation:** High (force push rewrites commit hashes; team members must re-clone).
- **Test Strategy:** Execute `git log -S "password"` to verify zero credentials remain in history.

### TASK-INFRA-01: Provision Isolated Staging PostgreSQL & Execute Alembic Migrations
- **Priority:** P0
- **Why It Matters:** Initial Alembic migration `5d3cf4891899_initial_schema.py` has been verified via offline SQL generation, and the safety guardrail prevents destructive operations against remote poolers, but the migration must be verified on an isolated staging PostgreSQL database with `pgvector` enabled.
- **Specific Affected Modules:** `lakshyaai-backend/alembic/`, `alembic.ini`, staging database instance.
- **Acceptance Criteria:**
  1. Dedicated staging PostgreSQL database instance provisioned.
  2. `CREATE EXTENSION IF NOT EXISTS vector;` executed cleanly.
  3. `alembic upgrade head` completes with 0 errors and creates all 37 platform tables.
  4. `alembic downgrade base` and re-upgrade tested cleanly.
- **Dependencies:** Staging PostgreSQL environment.
- **Risk of Implementation:** Low on staging; high on production.
- **Test Strategy:** Migration test script checking table count and schema columns against `Base.metadata`.

### TASK-INFRA-02: Add HNSW Vector Indexes to Embedding Tables
- **Priority:** P1
- **Why It Matters:** `ResumeEmbedding` and `RoleEmbedding` store 1536-dimensional vectors. Without approximate nearest neighbor (ANN) indexes, similarity search defaults to sequential scans ($O(N)$), degrading latency as resumes scale.
- **Specific Affected Modules:** `lakshyaai-backend/app/db/models.py:382, 440`, Alembic migrations.
- **Acceptance Criteria:**
  1. HNSW index definitions added to `ResumeEmbedding` and `RoleEmbedding` models using cosine distance:
     ```python
     Index("idx_resume_embeddings_hnsw", ResumeEmbedding.embedding, postgresql_using="hnsw", postgresql_with={"m": 16, "ef_construction": 64}, postgresql_ops={"embedding": "vector_cosine_ops"})
     ```
  2. New Alembic migration generated and verified against staging PostgreSQL.
- **Dependencies:** Staging PostgreSQL with `pgvector`.
- **Risk of Implementation:** Low.
- **Test Strategy:** Verify query execution plans (`EXPLAIN ANALYZE`) show `Index Scan using idx_resume_embeddings_hnsw`.

### TASK-INFRA-03: Docker Container Build & LaTeX PDF Engine Live Verification
- **Priority:** P1
- **Why It Matters:** Backend `Dockerfile` was updated to install `texlive-latex-base/extra` for PDF compilation and unprivileged user execution, but requires a live Docker build verification in a runner with an active Docker daemon.
- **Specific Affected Modules:** `lakshyaai-backend/Dockerfile`, `Dockerfile`, `docker-compose.yml`.
- **Acceptance Criteria:**
  1. Docker container builds cleanly without cache errors.
  2. Running container compiles a sample LaTeX resume template to PDF using `pdflatex`.
  3. Resulting container runs under unprivileged `appuser` (UID 1001).
- **Dependencies:** Host or CI Docker engine.
- **Risk of Implementation:** Low.
- **Test Strategy:** CI workflow executing `docker build -t lakshyaai-backend:test lakshyaai-backend` followed by a resume export test.

### TASK-SEC-02: PostgreSQL Row-Level Security (RLS) Implementation
- **Priority:** P1
- **Why It Matters:** Currently, tenant isolation relies on application-level filtering (`WHERE user_id = current_user.id`). While fully verified in backend security test matrices, database-level defense-in-depth is desirable for production PostgreSQL.
- **Specific Affected Modules:** PostgreSQL Schema, all 37 database tables.
- **Acceptance Criteria:**
  1. `ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;` applied to all candidate-facing tables.
  2. Tenant isolation policies configured using `auth.uid()` or session role variables.
  3. Service role bypass allowed only for administrative backend queries.
- **Dependencies:** PostgreSQL migration runner on staging.
- **Risk of Implementation:** Medium (improperly configured RLS can reject legitimate application queries).
- **Test Strategy:** Automated tenant penetration script attempting cross-user `SELECT`/`UPDATE` directly on DB.

---

## 2. Completed & Verified Tasks (Archived from Backlog)

| Task ID | Component | Summary of Implementation & Verification | Verification Evidence |
| :--- | :--- | :--- | :--- |
| **TASK-TEST-01** | Backend Tests | Fixed SQLite table pre-creation across test harnesses; added Groq adapter tests in `test_groq_provider.py`, opt-in live smoke test in `test_groq_live_smoke.py`, and Copilot async tests in `test_copilot_service.py`. | 138 unittests discovered (137 passed, 1 opt-in skipped, 100% pass rate) |
| **TASK-DATA-01** | Intelligence | Eradicated synthetic 78 ATS / 75 interview / 94 job match defaults; unmeasured metrics return `None`/`null`; dynamic weighted readiness calculated solely on measured signals. | `career_intelligence_service.py`, `CareerContext.tsx`, Vitest tests passing |
| **TASK-CORE-01** | Session Manager | Added `with_for_update()` row-level database locking and question index idempotency checks preventing duplicate submissions. | `app/services/interview/session_manager.py` verified; tests passing |
| **TASK-CORE-02** | Voice Interviews | Added `session_id` binding and persisted speech transcripts/replies into `InterviewMessage` and `InterviewSession`. | `routes/voice.py`, `voiceInterview.ts`, `VoiceInterviewSession.tsx` verified |
| **TASK-AI-01** | Evaluation Engine | Implemented STAR rubric LLM evaluation with JSON schema validation; removed punctuation bonus; added explicit `is_ai_evaluated` flag. | `app/services/interview/evaluation_engine.py` verified |
| **TASK-AI-02** | Question Generator| Implemented multi-role offline bank (7 tracks) + dynamic candidate skill & JD grounded LLM generation. | `app/services/interview/question_generator.py` verified |
| **TASK-AI-03** | Roadmap Engine | Expanded from 2 static tracks to 7 comprehensive tracks + dynamic LLM personalization grounded in detected skill gaps. | `app/services/roadmap/roadmap_engine.py`, `schemas.py` verified |
| **TASK-AI-04** | Copilot Chat | Injected candidate target role, verified skills, ATS score, and skill gaps into system prompt; implemented prompt injection defense; strict user isolation. | `app/services/copilot/chat_service.py` verified |
| **TASK-AI-05** | Embeddings | Eliminated silent SHA-256 fallback masquerading as semantic vectors; returns empty embedding if unconfigured; added explicit `generate_labeled_fallback`. | `app/services/resume/embedding_engine.py` verified |
| **TASK-AI-06** | Groq Integration | Integrated Groq as primary LLM (`llama-3.3-70b-versatile`) with centralized `GroqProvider`, connection pooling, 429/503 bounded retries, non-retryable 400/401/403, and opt-in live smoke harness. | `tests/test_groq_provider.py` (9/9 passed), `tests/test_copilot_service.py` (9/9 passed) |
| **TASK-FE-01** | Frontend Linting | Resolved all 49 ESLint errors (down to 0 errors); replaced explicit `any` with typed interfaces; fixed hook dependencies. | `npm run lint` exited 0 (0 errors, 14 warnings) |
| **TASK-FE-02** | CareerContext | Aligned `CareerContext.tsx` with dynamic weighted calculation; eliminated legacy fallback constants. | `CareerContext.tsx` verified; Vitest passing (79/79) |
| **TASK-PERF-01**| Performance | Upgraded `/api/copilot/chat` to `async def` and replaced synchronous `httpx.Client` with non-blocking `httpx.AsyncClient` with 30s timeout and 502 error mapping. | `app/services/copilot/chat_service.py`, `routes/copilot.py`, `tests/test_copilot_service.py` (9/9 passed) |
| **TASK-DEP-01** | Deprecations | Replaced deprecated `datetime.utcnow()` with `datetime.now(timezone.utc)` across `security.py` and `schemas.py`. | Test logs verified clean of timestamp deprecation warnings |
