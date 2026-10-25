# Lakshya AI — Audit Execution Summary

**Execution Date:** 2026-10-18  
**Audit Role:** Senior Software Architect, Security Engineer, Backend Engineer, Frontend Engineer, Database Engineer, QA Engineer, DevOps Engineer, AI Engineer  
**Audit Mandate:** Strict Audit-Only. Zero code edits, zero destructive database changes, zero credentials exposed.

---

## 1. Files & Subsystems Inspected

| Subsystem | Scope / Directory | Key Files Inspected |
| :--- | :--- | :--- |
| **Authentication & Core Security** | `lakshyaai-backend/app/core/`, `app/api/routes/` | `auth.py`, `dependencies.py`, `permissions.py`, `security.py`, `security_middleware.py`, `config.py` |
| **Database & Schema Modeling** | `lakshyaai-backend/app/db/`, `alembic.ini` | `models.py` (all 37 ORM models), `database.py`, `schemas.py`, `admin_table_registry.py` |
| **AI / LLM & Career Intelligence** | `lakshyaai-backend/app/services/` | `evaluation_engine.py`, `question_generator.py`, `session_manager.py`, `chat_service.py`, `context_engine.py`, `embedding_engine.py`, `ats_engine.py`, `roadmap_engine.py`, `career_intelligence_engine.py`, `career_intelligence_service.py` |
| **Resume & Document Processing** | `lakshyaai-backend/app/services/resume/` | `pdf_engine.py`, `latex_compiler.py`, `rewrite_engine.py`, `file_storage.py`, `skill_extractor.py` |
| **Voice & Speech Processing** | `lakshyaai-backend/app/services/voice/` | `speech_to_text.py`, `voice_scoring.py`, `question_generator.py`, `chat_service.py`, `routes/voice.py` |
| **Administrative Control Center** | `lakshyaai-backend/app/api/routes/admin.py` | `admin.py`, `admin_service.py`, `admin_action_service.py`, `simulation_service.py`, `audit_service.py` |
| **DevOps & Containers** | Root & Backend Root | `Dockerfile`, `lakshyaai-backend/Dockerfile`, `nginx.conf`, `requirements.txt`, `package.json`, `run-all.ps1` |
| **Frontend Architecture & UX** | `src/` | `App.tsx`, `AuthContext.tsx`, `CareerContext.tsx`, `CareerIntelligenceContext.tsx`, `api.ts`, `auth.ts`, `InterviewStudioPage.tsx`, `VoiceInterviewSession.tsx`, `JobsPage.tsx`, `RoadmapPage.tsx` |
| **Documentation & Previous Audits**| `docs/` | `REPAIR_EXECUTION_REPORT.md`, `P1_RECONCILIATION.md`, `PROJECT_AUDIT_REPORT.md`, `PROJECT_FIX_ROADMAP.md` |

---

## 2. Commands & Tests Actually Executed

| # | Command Executed | Purpose | Result / Evidence |
| :--- | :--- | :--- | :--- |
| **1** | `.\.venv\Scripts\python.exe -m unittest discover -s tests -p "test_*.py" -t .` | Full Backend Test Discovery | **99 / 99 Passed** (4.39s, isolated in-memory SQLite harness, zero network egress) |
| **2** | `npm run test` (`vitest run`) | Full Frontend Test Suite | **75 / 75 Passed** across 23 test files (~132s, jsdom) |
| **3** | `npx tsc --noEmit` | Frontend Static TypeScript Validation | **Exit Code 0** (0 type errors) |
| **4** | `npm run lint` (`eslint .`) | Frontend Code Quality & Static Analysis | **Exit Code 1** (65 problems: 49 errors, 16 warnings) |
| **5** | Python ORM Model Inspector (`audit_models.py`) | Inspect 37 models, foreign keys, cascades & indexes | Discovered 37 models; verified missing vector indexes and FK cascades |
| **6** | `git log --all --name-only -n 5` & git history checks | Check for historical commit secret tracking | Confirmed historical tracking of `.env` and `.venv/` in commit history |
| **7** | `Get-Command pdflatex` | Check host vs container LaTeX compiler availability | Host has MiKTeX `pdflatex.exe`; backend Docker container lacks LaTeX binary |
| **8** | Uvicorn & Vite daemon health probes (`/api/health`, `/api/health/ready`) | Live service connection verification | Direct and reverse proxy `/api/health` and `/api/health/ready` returned HTTP 200 OK |

---

## 3. Confirmed Issues by Severity

- **P0 — Critical (5 Findings):**
  1. `SEC-01`: Active third-party credentials exposed in git commit history (Google OAuth, Gmail SMTP, Supabase).
  2. `SEC-02`: Automatic `super_admin` role assignment during registration without email verification.
  3. `ARCH-01`: View-As candidate simulation token ignored by `get_current_user`, breaking simulation scoping.
  4. `DATA-01`: Unsafe imperative DDL on app boot against transaction pooler; missing Alembic migrations.
  5. `DEVOPS-01`: Missing `pdflatex` / `texlive` compiler in backend production Docker container.

- **P1 — High (11 Findings):**
  6. `AI-01`: Mock interview answer evaluation is 100% hardcoded word-count heuristic (faked AI).
  7. `AI-02`: Mock interview question generator is a static 9-question bank.
  8. `AI-03`: Career roadmap generation is a static hardcoded dictionary.
  9. `AI-04`: Career Copilot chat ignores candidate profile, skills, and resume context.
  10. `AI-05`: Silent fallback to SHA256 token hashing for embeddings on missing API keys.
  11. `BUG-01`: Race condition & state corruption on concurrent interview answer submissions.
  12. `DATA-02`: Missing HNSW cosine distance vector index on embedding tables (`ResumeEmbedding`, `RoleEmbedding`).
  13. `DATA-03`: Missing cascading deletes on foreign key relationships.
  14. `SEC-03`: Zero Supabase Row Level Security (RLS) policies on all 37 database tables.
  15. `FE-01`: Voice interview answers and transcripts are unpersisted.
  16. `DATA-04`: Synthetic fake data injected on new user career overview.

- **P2 — Medium (9 Findings):**
  17. `PERF-01`: Blocking synchronous HTTP calls inside async route handlers.
  18. `SEC-04`: Insecure fallback JWT secret (`supersecretkey`) and missing refresh token flow.
  19. `DEVOPS-02`: Ephemeral local filesystem storage for resume PDFs.
  20. `DEV-01`: Bloated git history with tracked `.venv/` and unused dependencies (`pyiceberg`, `supabase-py`).
  21. `FE-02`: ESLint failure with 65 problems (49 errors, 16 warnings).
  22. `FE-03`: Hardcoded readiness metrics in frontend client context.
  23. `API-01`: In-memory job cache fails in multi-worker containers; no fallback on external API outage.
  24. `LOG-01`: Raw `print()` calls dumping sensitive prompt data to stdout.
  25. `AI-06`: Fractured LLM provider configuration across services.

- **P3 — Low (3 Findings):**
  26. `TEST-02`: Missing integration tests for Google OAuth callback and voice WebM audio ingestion.
  27. `DOC-01`: Inaccurate marketing documentation claiming neural AI where heuristic code exists.
  28. `DEP-01`: Deprecated `datetime.utcnow()` usage in Python 3.12+.

---

## 4. Important Features Not Implemented or Not Verified

1. **Genuine AI Mock Interview Evaluation:** Faked via word count and 6 keywords.
2. **Dynamic Skill-Gap Roadmap Generation:** Static dictionary mapping 4 tracks to fixed steps.
3. **Context-Grounded Career Copilot:** `CopilotContextEngine` is disconnected from `/api/copilot/chat`.
4. **Persistent Voice Interview Practice:** Voice interview audio/transcripts are never saved to database.
5. **Live End-to-End Google OAuth:** Unexercised without live credentials and domain callback configuration.

---

## 5. Tests Skipped or Blocked

- **Remote Database Mutation Tests:** Strictly blocked from executing against live Supabase database to avoid shared state pollution. All 99 backend tests execute safely in the isolated in-memory test harness.
- **Live Docker Multi-Container Network Test:** Blocked because Docker is unavailable on the local Windows environment (`docker: command not recognized`).

---

## 6. External Checks Remaining Outstanding

1. **Third-Party Credential Revocation & Rotation:**
   - Google Cloud Console: Revoke OAuth Client Secret.
   - Google Account Security: Revoke Gmail SMTP Application Password.
   - Supabase Dashboard: Rotate database user password.
2. **Git History Scrubbing:** Coordinated execution of `git filter-repo` across team repositories after remote backup.

---

## 7. Recommended First Repair Task

### Recommended Task: **Task 1.1 — Fix Simulation Token Scoping in Auth Dependencies (`ARCH-01`)**

**Why this must be first:**
1. **Immediate Architectural Impact:** View-As / Candidate Simulation is a core administrative governance feature that is currently completely broken because `get_current_user` ignores `X-Simulation-Token`.
2. **Zero Schema Risk:** Does not require database migrations or DDL changes.
3. **High Security Significance:** Fixes tenant scoping while preserving existing strict read-only mutation blocks (`403 Forbidden`).
4. **Verified Test Harness Available:** `test_simulation.py` and `test_simulation_global_block.py` are already passing in the test suite and can immediately validate the fix without regression risk.
