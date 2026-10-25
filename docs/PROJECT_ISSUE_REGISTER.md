# Lakshya AI — Master Project Issue Register

**Audit Date:** 2026-10-18  
**Audit Status:** Active Baseline Issue Register  
**Total Cataloged Issues:** 28 Unique Findings  

---

## Master Issue Table

| ID | Priority | Category | Evidence Status | Affected Subsystem / File | Issue Title & Description | Remediation Summary |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **P0** | Security | ACTION REQUIRED | Git History / Historical Commits | Plaintext secrets exposed in git commit history | Repository hygiene verified; manual vendor rotation & coordinated `git-filter-repo` detailed in `docs/SECURITY_RUNBOOK.md`. Pending operator action. |
| **SEC-02** | **P0** | Security | VERIFIED | `app/api/routes/auth.py:108`, `app/core/permissions.py` | Auto super_admin grant on registration without email verification | Enforced role="user" on open registration; required verified email for admin login, bootstrap elevation, and permissions. Fully verified by tests. |
| **ARCH-01** | **P0** | Architecture | VERIFIED | `app/core/dependencies.py:14`, `app/core/permissions.py` | View-As simulation token ignored by `get_current_user` | Decrypts `X-Simulation-Token`, sets `request.state.actor` to admin, scopes subject candidate as current_user, enforces read-only mutations. Fully verified. |
| **DATA-01** | **P0** | Database | PARTIALLY VERIFIED | `app/main.py:19`, `alembic.ini`, `alembic/env.py` | Unsafe imperative DDL on app boot; missing Alembic migrations | Startup DDL eliminated; Alembic migration infrastructure, initial 37-table schema revision, offline SQL generation, and remote guard VERIFIED; live PostgreSQL execution BLOCKED by environment. |
| **DEVOPS-01**| **P0** | DevOps | PARTIALLY VERIFIED | `lakshyaai-backend/Dockerfile:14` | Missing LaTeX compiler (`pdflatex`) in backend Docker container | `texlive-latex-base/recommended/extra` and `texlive-fonts-recommended` added, non-root user added, `.dockerignore` created; live build BLOCKED by missing Docker on host. |
| **AI-01** | **P1** | AI / LLM | CONFIRMED | `app/services/interview/evaluation_engine.py:11` | Mock interview evaluation is 100% hardcoded word-count heuristic | Implement genuine LLM STAR rubric decomposition with structured JSON output and fallback. |
| **AI-02** | **P1** | AI / LLM | CONFIRMED | `app/services/interview/question_generator.py:4` | Mock interview question generation is a static 9-question bank | Ground dynamic question generation in candidate resume skills and job requirements. |
| **AI-03** | **P1** | AI / LLM | CONFIRMED | `app/services/roadmap/roadmap_engine.py:4` | Career roadmap generation is a static hardcoded dictionary | Dynamically generate roadmaps personalized to candidate's detected missing skills. |
| **AI-04** | **P1** | AI / LLM | CONFIRMED | `app/api/routes/copilot.py:155` | AI Copilot chat ignores candidate profile and resume context | Inject `CopilotContextEngine.build_profile()` into system prompt context. |
| **AI-05** | **P1** | AI / LLM | CONFIRMED | `app/services/resume/embedding_engine.py:89` | Silent fallback to SHA256 token hashing for embeddings | Raise explicit error or flag uncalibrated embeddings rather than faking vectors. |
| **BUG-01** | **P1** | Backend | CONFIRMED | `app/services/interview/session_manager.py:84` | Race condition & state corruption on interview answer submissions | Add `with_for_update()` row-level lock and question index idempotency check. |
| **DATA-02** | **P1** | Database | CONFIRMED | `app/db/models.py:382, 440` | Missing HNSW vector index on pgvector embedding tables | Add HNSW vector indexes for cosine distance on `ResumeEmbedding` and `RoleEmbedding`. |
| **DATA-03** | **P1** | Database | CONFIRMED | `app/db/models.py:1143` | Missing cascading deletes on foreign key relationships | Audit all models and add explicit `cascade="all, delete"` and `ondelete="CASCADE"`. |
| **SEC-03** | **P1** | Security | CONFIRMED | Supabase PostgreSQL Schema | Zero Row Level Security (RLS) policies on all 37 database tables | Enable RLS on all tables and create explicit tenant-isolation security policies. |
| **FE-01** | **P1** | Frontend | CONFIRMED | `src/components/interview/VoiceInterviewSession.tsx` | Voice interview answers and transcripts are unpersisted | Persist voice interview sessions and messages to PostgreSQL database models. |
| **DATA-04** | **P1** | Data Integrity | CONFIRMED | `app/services/career_intelligence_service.py:18` | Synthetic fake scores injected for new users without resumes | Replace fake default scores with authentic empty states and onboarding guidance. |
| **PERF-01** | **P2** | Performance | CONFIRMED | `app/services/llm/client.py:77` | Blocking synchronous HTTP requests inside async route handlers | Migrate external requests to `httpx.AsyncClient` or offload to background threads. |
| **SEC-04** | **P2** | Security | CONFIRMED | `app/core/security.py:7` | Insecure fallback JWT secret & missing refresh token flow | Require strong non-default secret key; implement sliding refresh token endpoint. |
| **DEVOPS-02**| **P2** | DevOps | CONFIRMED | `app/services/storage/file_storage.py:11` | Ephemeral local filesystem storage for resume PDFs | Integrate cloud object storage (S3 / GCS / Supabase Storage) with signed URLs. |
| **DEV-01** | **P2** | Maintainability| CONFIRMED | Git History / `requirements.txt:45` | Bloated git history with `.venv` and unused dependencies | Prune unused packages (`pyiceberg`, `supabase-py`); scrub `.venv` from history. |
| **FE-02** | **P2** | Frontend | CONFIRMED | `src/context/CareerContext.tsx`, etc. | ESLint failure with 65 problems (49 errors, 16 warnings) | Fix explicit `any` types, empty blocks, and React Fast Refresh export warnings. |
| **FE-03** | **P2** | Frontend | CONFIRMED | `src/context/CareerContext.tsx:100` | Hardcoded readiness metrics in frontend client context | Fetch readiness breakdown dynamically from backend `/api/intelligence` endpoint. |
| **API-01** | **P2** | Backend | CONFIRMED | `app/services/jobs/job_provider.py:25` | In-memory job cache fails in multi-worker containers; no fallback | Migrate job cache to Redis/DB; add graceful fallback on Remotive API failure. |
| **LOG-01** | **P2** | Security | CONFIRMED | `app/services/copilot/chat_service.py:76` | Raw `print()` calls dumping sensitive prompt data to stdout | Replace raw `print()` with structured logging at DEBUG level with data masking. |
| **AI-06** | **P2** | AI / LLM | CONFIRMED | `app/services/voice/`, `app/services/copilot/` | Fractured LLM provider configuration across services | Unify LLM client abstraction supporting OpenAI, OpenRouter, and Gemini consistently. |
| **TEST-02** | **P2** | QA | CONFIRMED | `tests/`, `src/test/` | Missing integration tests for Google OAuth and voice audio | Add integration tests covering OAuth callback exchange and audio ingestion. |
| **DOC-01** | **P3** | Documentation | CONFIRMED | `docs/API.md`, `docs/ARCHITECTURE.md` | Contradictory claims of neural AI vs heuristic implementation | Align architecture documentation with actual implementation capabilities. |
| **DEP-01** | **P3** | Maintainability| CONFIRMED | `app/core/security.py:30` | Deprecated `datetime.utcnow()` usage in Python 3.12+ | Replace with timezone-aware `datetime.now(timezone.utc)`. |
| **DASH-01** | **P1** | Frontend/Backend | VERIFIED RESOLVED | `app/api/routes/intelligence.py`, `app/services/career_intelligence_service.py` | 404 Route Mismatch & Pydantic Validation Error on `/api/intelligence/overview` | Added `@router.get("/overview")` alias and normalized `resume.skills` objects to string list. Verified HTTP 200. |
| **DASH-02** | **P1** | Backend | VERIFIED RESOLVED | `app/api/routes/analytics.py` | Missing `/api/analytics/career-progress` endpoint required by dashboard chart | Implemented weekly progress aggregation from `UserPerformanceTrend` and `Resume`. Verified HTTP 200. |
| **DASH-03** | **P1** | Data Integrity | VERIFIED RESOLVED | `useCareerReadiness.ts`, `useDashboardData.ts`, `app/api/routes/analytics.py` | Synthetic role match formula (`45 + count * 8`) and index benchmarks (`95 - idx * 4`) | Exposed genuine `role_match_score` from `UserCareerState` via `/summary` and tied benchmarks to real `skillGrowth` counts. Verified. |
| **DASH-04** | **P2** | Frontend / UX | VERIFIED RESOLVED | `FloatingCareerCopilot.tsx`, `DashboardLayout.tsx`, `FeedbackWidget.tsx` | Missing floating Career Copilot chat trigger on dashboard command center | Created floating assistant component with live role context, quick prompts, and responsive drawer; shifted feedback widget. |
| **DASH-05** | **P2** | Frontend / UX | VERIFIED RESOLVED | `src/components/dashboard/NextBestActions.tsx` | Missing empty state for What To Do Next recommendations | Added accessible celebratory state with `CheckCircle2` when all high-priority items are complete. |

---

## Severity Summary

| Severity Tier | Count | Definition |
| :--- | :--- | :--- |
| **P0 — Critical** | **5** | Active secret exposure, privilege escalation, broken simulation mode, DDL on pooler, missing LaTeX in Docker. |
| **P1 — High** | **14** | Faked AI evaluations, static roadmaps, route mismatches, synthetic scores, race conditions, RLS absence. |
| **P2 — Medium** | **11** | Floating assistant absence, empty states, blocking I/O, weak JWT fallback, local file storage, ESLint errors. |
| **P3 — Low** | **3** | Inaccurate marketing documentation, deprecated `datetime.utcnow()`, temporary scripts. |
| **Total** | **33** | **All cataloged issues accounted for with reproducible evidence.** |
