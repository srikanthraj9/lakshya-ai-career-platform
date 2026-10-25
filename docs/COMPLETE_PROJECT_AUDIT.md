# Lakshya AI — Comprehensive Project-Wide Audit & Problem Discovery Report

**Audit Type:** Complete Project-Wide System Audit (Audit-Only)  
**Execution Date:** 2026-10-18  
**Scope:** Frontend (React + Vite + TypeScript), Backend (FastAPI + Python 3.12), Database (PostgreSQL 17 / Supabase + SQLAlchemy), AI/LLM Services, DevOps, Security, Testing, Performance  
**Audit Rule:** Strict Audit-Only. Zero application code modifications, zero destructive SQL/DDL operations, zero credentials exposed.

---

## 1. Executive Summary

A comprehensive, evidence-based architectural and quality audit of the entire Lakshya AI career platform was conducted across nine quality dimensions and eleven end-to-end user workflows.

### Key Audit Highlights:
1. **Total Unique Findings:** **28 unique issues** classified across four severity tiers:
   - **P0 — Critical:** 5 issues
   - **P1 — High:** 11 issues
   - **P2 — Medium:** 9 issues
   - **P3 — Low:** 3 issues
2. **Evidence Status Distribution:**
   - **CONFIRMED:** 27 issues (directly verified in source code, configuration, or reproducible safe tests)
   - **UNRESOLVED EXTERNAL:** 1 issue (active credential rotation in vendor dashboards)
   - **NOT A DEFECT:** 0 issues
3. **AI Implementation Reality:**
   - **Heuristic / Simulated AI:** Mock interview evaluation, interview question generation, and career roadmaps are **100% hardcoded heuristics or static dictionaries**, despite platform marketing claiming deep neural/LLM capabilities.
   - **Disconnected Context:** The AI Career Copilot never injects the candidate's resume, skills, or target role into LLM prompts (`CopilotContextEngine` is unused dead code in the chat route).
   - **Fractured LLM Architecture:** Providers are split inconsistently across services: Copilot only checks OpenRouter; Voice STT only checks OpenAI Whisper; Voice scoring checks OpenRouter; Resume feedback checks OpenAI/OpenRouter; and EmbeddingEngine falls back silently to SHA256 token hashing.
4. **Security & Governance:**
   - Registration automatically grants `super_admin` role to anyone claiming an `ADMIN_EMAILS` address without requiring email verification.
   - Super Admin View-As (Candidate Simulation) is completely broken for core workflows because `get_current_user` does not resolve `X-Simulation-Token`.
   - Historical git commits retain plaintext credentials that must be revoked in external provider consoles.
   - Zero Supabase Row Level Security (RLS) policies exist across all 37 database tables.
5. **Database & Infrastructure:**
   - No versioned database migrations exist (`alembic.ini` is an empty 0-byte file; no `alembic/` directory).
   - Imperative DDL (`ALTER TABLE`) is executed on application boot against the transaction-mode pooler port 6543.
   - Backend Docker container fails to install `pdflatex`, breaking LaTeX resume PDF export in Docker environments.
   - Resumes are stored on the local container disk without cloud object storage (S3/GCS).

---

## 2. Quality Dimension Audit Findings

### Dimension A: Security and Privacy
1. **SEC-01 (P0 / UNRESOLVED EXTERNAL): Active Secret Exposure in Git History**
   - *Affected:* Git commit history (`26ca82f`, historical commits, `.env` files).
   - *Evidence:* Plaintext credentials (Google OAuth Client Secret, Gmail SMTP App Password, Supabase Database Password, and JWT Secret) were committed in historical commits prior to the P0 sanitization.
   - *Impact:* Potential compromise of email gateway, database cluster, and Google Cloud services if repository is shared.
   - *Remediation:* Revoke and rotate all credentials in Google Cloud Console, Google Account Security, and Supabase Dashboard. Perform coordinated git history scrubbing after team alignment.

2. **SEC-02 (P0 / CONFIRMED): Automatic Super Admin Privilege Escalation on Registration Without Email Verification**
   - *Affected:* [lakshyaai-backend/app/api/routes/auth.py:108-115, 149-195](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/api/routes/auth.py#L108-L115)
   - *Evidence:* During registration, if the supplied email matches `settings.ADMIN_EMAILS`, the user is immediately created with `role="super_admin"`. The `login` endpoint does not require `is_email_verified=True`. An attacker registering with an admin email immediately gains super admin privileges without verifying mailbox ownership.
   - *Impact:* Critical authentication and privilege escalation vulnerability.
   - *Remediation:* Enforce email verification prior to login for admin accounts, or require explicit manual elevation via CLI or database seeds.

3. **SEC-03 (P1 / CONFIRMED): Zero Supabase Row Level Security (RLS) Policies**
   - *Affected:* Supabase PostgreSQL schema (all 37 tables).
   - *Evidence:* Grep for `ROW LEVEL SECURITY` and `CREATE POLICY` returned zero results. All data authorization is handled solely by FastAPI backend logic.
   - *Impact:* If Supabase PostgREST, GraphQL, or client-side anon keys are exposed, tables are unprotected at the database layer.
   - *Remediation:* Enable RLS on all tables and create explicit tenant-isolation policies (`auth.uid() = user_id`).

4. **SEC-04 (P2 / CONFIRMED): Insecure Fallback JWT Secret & Missing Refresh Token Flow**
   - *Affected:* [lakshyaai-backend/app/core/security.py:7, 28-33](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/core/security.py#L7)
   - *Evidence:* `SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")`. Tokens expire in 60 minutes with no refresh endpoint. On expiration, the frontend forcibly triggers `window.location.href = "/login"`.
   - *Impact:* Weak default signature key; abrupt session terminations causing client data loss.
   - *Remediation:* Require strong non-empty `SECRET_KEY` on startup and implement a rotating refresh token flow.

---

### Dimension B: Frontend and User Experience
5. **ARCH-01 / BUG-02 (P0 / CONFIRMED): View-As Candidate Simulation Scoping Completely Broken**
   - *Affected:* [lakshyaai-backend/app/core/dependencies.py:14-48](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/core/dependencies.py#L14-L48)
   - *Evidence:* `get_current_user` inspects only the bearer JWT and ignores `X-Simulation-Token`. When an admin views as a candidate, candidate endpoints query by `current_user.id` (the admin's ID), rendering the admin's empty state.
   - *Impact:* Super admin View-As mode is non-functional for inspecting candidate data.
   - *Remediation:* Update `get_current_user` to inspect `X-Simulation-Token` and return the simulated target user while preserving actor auditing.

6. **FE-01 (P1 / CONFIRMED): Unpersisted Voice Interview Session & Data Loss**
   - *Affected:* [src/components/interview/VoiceInterviewSession.tsx:119-171](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/src/components/interview/VoiceInterviewSession.tsx#L119-L171), [src/pages/InterviewStudioPage.tsx:92-95](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/src/pages/InterviewStudioPage.tsx#L92-L95)
   - *Evidence:* In `handleStartSession`, `selectedMode === "voice"` bypasses `interviewService.start()`. Audio transcripts and AI replies are stored only in React state and discarded upon navigation.
   - *Impact:* Candidates cannot view past voice interview debriefs or scores.
   - *Remediation:* Create persistent `InterviewSession` records for voice interviews and save question/reply pairs to `InterviewMessage`.

7. **FE-02 (P2 / CONFIRMED): ESLint Failures Across Frontend Codebase**
   - *Affected:* Multiple frontend context, service, and page files.
   - *Evidence:* `npm run lint` returned 65 problems (49 errors, 16 warnings), including explicit `any` usage, empty blocks, and React Fast Refresh export violations.
   - *Impact:* Degraded code quality and potential silent regressions.
   - *Remediation:* Run `npm run lint -- --fix` and resolve remaining TypeScript typing warnings.

8. **FE-03 (P2 / CONFIRMED): Hardcoded Readiness Metrics in Frontend Context**
   - *Affected:* [src/context/CareerContext.tsx:100-123](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/src/context/CareerContext.tsx#L100-L123)
   - *Evidence:* `roadmapScore` is hardcoded to 40, `jobMatchScore` to 85, and missing skills fallback to `["Docker", "Redis", "Kubernetes", "CI/CD"]`.
   - *Impact:* Frontend readiness cards show desynchronized metrics that contradict backend calculations.
   - *Remediation:* Read readiness breakdown directly from backend `/api/intelligence` endpoint.

---

### Dimension C: Backend and Business Logic
9. **BUG-01 / BUG-06 (P1 / CONFIRMED): Race Condition in Interview Session Submissions**
   - *Affected:* [lakshyaai-backend/app/services/interview/session_manager.py:84-171](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/services/interview/session_manager.py#L84-L171)
   - *Evidence:* `next_interview_step` queries the session without row-level locking (`with_for_update()`). Fast double-clicks or concurrent network retries submit the same question index twice and corrupt session scores.
   - *Impact:* Duplicate interview messages and inconsistent final scores.
   - *Remediation:* Wrap answer submission in a transaction with `with_for_update()` and add idempotency check on question index.

10. **PERF-01 (P2 / CONFIRMED): Blocking Synchronous HTTP Requests Inside Async Route Handlers**
    - *Affected:* [app/services/llm/client.py:77](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/services/llm/client.py#L77), [app/services/jobs/job_provider.py:47](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/services/jobs/job_provider.py#L47), [app/services/voice/speech_to_text.py:24](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/services/voice/speech_to_text.py#L24)
    - *Evidence:* Synchronous `requests.post()` and `requests.get()` are executed directly in request paths with timeouts up to 30-60s.
    - *Impact:* Worker thread starvation under concurrent traffic.
    - *Remediation:* Migrate external HTTP calls to `httpx.AsyncClient` or run inside `asyncio.to_thread()`.

11. **LOG-01 (P2 / CONFIRMED): Verbose `print()` Dumping Sensitive Payload Data in Production**
    - *Affected:* [app/services/copilot/chat_service.py:76, 90, 95, 98](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/services/copilot/chat_service.py#L76)
    - *Evidence:* Raw `print()` calls output entire prompt conversation structures and API responses to stdout.
    - *Impact:* Exposure of sensitive candidate resume data in server logs.
    - *Remediation:* Replace raw `print()` with structured logging at DEBUG level with payload masking.

---

### Dimension D: Database and Data Integrity
12. **DATA-01 (P0 / CONFIRMED): Missing Alembic Migrations & Unsafe Startup DDL on Pooler**
    - *Affected:* [lakshyaai-backend/app/main.py:20-67](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/main.py#L20-L67), `alembic.ini`
    - *Evidence:* `alembic.ini` is an empty 0-byte file; no `alembic/` folder exists. Startup hook executes `ALTER TABLE` and `create_all` against Supabase transaction pooler port 6543.
    - *Impact:* Uncontrolled database schema evolution, migration locks, and deployment failure in multi-replica environments.
    - *Remediation:* Initialize Alembic, generate baseline migration script, remove imperative DDL from `main.py`, and run migrations using session-mode `DIRECT_URL`.

13. **DATA-02 (P1 / CONFIRMED): Missing Vector Distance Index on Embedding Tables**
    - *Affected:* [lakshyaai-backend/app/db/models.py:382-456](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/db/models.py#L382-L456)
    - *Evidence:* `ResumeEmbedding.embedding` and `RoleEmbedding.embedding` define `Vector(1536)` without an HNSW index.
    - *Impact:* Sequential table scans during similarity queries, leading to severe latency degradation as datasets scale.
    - *Remediation:* Add `Index("idx_resume_embeddings_hnsw", ResumeEmbedding.embedding, postgresql_using="hnsw", postgresql_ops={"embedding": "vector_cosine_ops"})`.

14. **DATA-03 (P1 / CONFIRMED): Foreign Key Cascades Missing on Core Models**
    - *Affected:* [lakshyaai-backend/app/db/models.py:1143-1256](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/db/models.py#L1143-L1256)
    - *Evidence:* Relationships lack `cascade="all, delete"` or explicit `ondelete="CASCADE"`.
    - *Impact:* Potential integrity constraint errors during user deletion.
    - *Remediation:* Audit all child relationships and apply explicit cascading delete rules.

15. **DATA-04 (P1 / CONFIRMED): Synthetic Fake Data Injected on New User Career Overview**
    - *Affected:* [lakshyaai-backend/app/services/career_intelligence_service.py:18-49](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/services/career_intelligence_service.py#L18-L49)
    - *Evidence:* When a new user registers without a resume or interview, the service injects hardcoded fake data: ATS score 78.0, 8 default skills, 75.0 interview score, and 94.0 match for "TechCorp".
    - *Impact:* Obscures onboarding needs and presents misleading evaluations to new candidates.
    - *Remediation:* Return authentic empty states with 0 scores and clear onboarding prompts.

---

### Dimension E: AI and LLM Functionality
16. **AI-01 (P1 / CONFIRMED): Mock Interview Answer Evaluation is 100% Heuristic (Faked AI)**
    - *Affected:* [lakshyaai-backend/app/services/interview/evaluation_engine.py:11-55](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/services/interview/evaluation_engine.py#L11-L55)
    - *Evidence:* Technical score is computed from word count and a 6-keyword count (`min(keyword_hits * 12, 36) + min(max(word_count - 20, 0), 29)`). Confidence score gives +12 points if `"."` is in the text. No LLM or STAR evaluation exists.
    - *Impact:* Candidates receive unscientific, heuristic scores disguised as AI feedback.
    - *Remediation:* Integrate genuine LLM STAR rubric decomposition with structured JSON output and graceful heuristic fallback.

17. **AI-02 (P1 / CONFIRMED): Mock Interview Question Generator is Static Question Bank**
    - *Affected:* [lakshyaai-backend/app/services/interview/question_generator.py:4-78](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/services/interview/question_generator.py#L4-L78)
    - *Evidence:* Returns 3 static questions per difficulty from a hardcoded bank of 9 questions.
    - *Impact:* Lack of dynamic questioning based on candidate resume or target job requirements.
    - *Remediation:* Use LLM question generator grounded in candidate skills and job description.

18. **AI-03 (P1 / CONFIRMED): Career Roadmap Generation is Static Dictionary**
    - *Affected:* [lakshyaai-backend/app/services/roadmap/roadmap_engine.py:4-221](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/services/roadmap/roadmap_engine.py#L4-L221)
    - *Evidence:* `ROLE_ROADMAPS` maps 4 fixed tracks to predefined steps.
    - *Impact:* Roadmaps do not adapt to candidate's actual skill gaps.
    - *Remediation:* Dynamically construct roadmaps tailored to the candidate's detected missing skills.

19. **AI-04 (P1 / CONFIRMED): Career Copilot Ignores Candidate Profile & Resume Context**
    - *Affected:* [lakshyaai-backend/app/api/routes/copilot.py:155-163](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/api/routes/copilot.py#L155-L163)
    - *Evidence:* Endpoint passes only `request.messages` to the LLM. `CopilotContextEngine` (`build_profile`) is never called. System prompt is generic ChatGPT.
    - *Impact:* The Copilot acts as an ungrounded chat assistant rather than a personalized career mentor.
    - *Remediation:* Inject `CopilotContextEngine.build_profile()` into the system prompt context.

20. **AI-05 (P1 / CONFIRMED): Silent Fallback to SHA256 Token Hashing for Embeddings**
    - *Affected:* [lakshyaai-backend/app/services/resume/embedding_engine.py:89-125](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/services/resume/embedding_engine.py#L89-L125)
    - *Evidence:* When no API key is set, it computes SHA256 hashes of words mod 1536 instead of true neural embeddings.
    - *Impact:* Vector similarity degrades to pseudo-random hash overlaps without error warning.
    - *Remediation:* Explicitly raise an error or flag uncalibrated embeddings rather than silently faking them.

21. **AI-06 (P2 / CONFIRMED): Fractured LLM Provider Configuration**
    - *Affected:* `LLMClient`, `CareerCopilotService`, `speech_to_text.py`, `voice_scoring.py`
    - *Evidence:* Copilot requires `OPENROUTER_API_KEY`; Voice STT requires `OPENAI_API_KEY`; Voice scoring requires `OPENROUTER_API_KEY`; `LLMClient` supports both.
    - *Impact:* Inconsistent setup where configuring one provider breaks other features.
    - *Remediation:* Standardize all AI features on a unified provider interface.

---

### Dimension F: Testing and Quality Assurance
22. **TEST-01 (CONFIRMED RESOLVED / VERIFIED): Isolated Test Database Harness**
    - *Status:* **RESOLVED & VERIFIED** in Phase P1-01.
    - *Evidence:* `tests/__init__.py` establishes an in-memory SQLite test harness with zero network egress. All 99 backend tests execute and pass in 4.39s.
    - *Limitation:* PostgreSQL-specific behavior (e.g. pgvector HNSW index scans, transaction isolation levels) is not executed in SQLite in-memory tests and requires a local or CI PostgreSQL 17 container.

23. **TEST-02 (P2 / CONFIRMED): Missing End-to-End Test Suite for Voice & OAuth Workflows**
    - *Affected:* `tests/` and `src/test/`
    - *Evidence:* No automated tests exercise Google OAuth callback or voice audio processing end-to-end.
    - *Impact:* Regressions in OAuth and media processing can go undetected.
    - *Remediation:* Add integration mocks covering OAuth exchange and WebM audio ingestion.

---

### Dimension G: DevOps and Deployment
24. **DEVOPS-01 (P0 / CONFIRMED): Missing LaTeX Compiler in Backend Production Docker Container**
    - *Affected:* [lakshyaai-backend/Dockerfile:14-18](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/Dockerfile#L14-L18)
    - *Evidence:* Dockerfile does not install `texlive-latex-base` or `pdflatex`. LaTeX PDF compilation (`compile_latex_to_pdf`) fails inside Docker.
    - *Impact:* Resume rewrite PDF export crashes in production container.
    - *Remediation:* Add `texlive-latex-base` and `texlive-fonts-recommended` to Dockerfile `apt-get install`.

25. **DEVOPS-02 (P2 / CONFIRMED): Ephemeral Local Filesystem Storage for Resumes**
    - *Affected:* [lakshyaai-backend/app/services/storage/file_storage.py:11-45](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/services/storage/file_storage.py#L11-L45)
    - *Evidence:* Resumes are saved to `uploads/resumes/{user_id}/` on the container filesystem.
    - *Impact:* Uploaded resumes are lost on container restart or redeploy in cloud environments.
    - *Remediation:* Integrate S3, Google Cloud Storage, or Supabase Storage with signed download URLs.

26. **DEV-01 (P2 / CONFIRMED): Bloated Git History with Tracked Virtualenv & Unused Packages**
    - *Affected:* Git commit history, `requirements.txt:45, 64-66`
    - *Evidence:* `.venv/` was historically committed with thousands of files. Unused libraries (`pyiceberg`, `supabase`, `postgrest`) remain in `requirements.txt`.
    - *Impact:* Slow clones and unnecessary container build overhead.
    - *Remediation:* Prune unused packages from `requirements.txt`. Coordinate a git history scrub after backing up repository.

---

### Dimension H: Performance and Scalability
27. **PERF-02 (P2 / CONFIRMED): Process-Memory Cache on Jobs API Failing Multi-Worker Scale**
    - *Affected:* [lakshyaai-backend/app/services/jobs/job_provider.py:25-57](file:///c:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/services/jobs/job_provider.py#L25-L57)
    - *Evidence:* `_cache_entry` is stored in a Python global variable. Multiple Uvicorn worker processes do not share the cache, resulting in redundant outbound requests and potential rate limiting.
    - *Impact:* Unreliable job caching and increased risk of Remotive API rate limits.
    - *Remediation:* Migrate job caching to Redis or a shared database cache table.

---

### Dimension I: Documentation and Maintainability
28. **DOC-01 (P3 / CONFIRMED): Contradictory Architecture & API Documentation**
    - *Affected:* `docs/API.md`, `docs/ARCHITECTURE.md`, `README.md`
    - *Evidence:* Docs claim full AI evaluation and dynamic roadmaps, but the code implements static dictionaries and word-count heuristics.
    - *Impact:* Misleads developers, evaluators, and candidates.
    - *Remediation:* Update documentation to accurately describe current architecture and roadmap.

---

## 3. End-to-End Tracing of 11 Critical Workflows

| # | Workflow | Execution Path | Findings & Failure Points |
| :--- | :--- | :--- | :--- |
| **1** | **Registration & Authentication** | `POST /api/auth/register` -> `POST /api/auth/login` -> `GET /api/users/me` | **Critical:** Anyone registering with an `ADMIN_EMAILS` address receives `super_admin` without email verification (`SEC-02`). No refresh token exists (`SEC-04`). |
| **2** | **Candidate Profile Management** | `GET/PATCH /api/users/me`, `GET /api/onboarding` | Profile updates succeed; onboarding state correctly persists in `UserCareerProfile`. |
| **3** | **Resume Upload & Storage** | `POST /api/resumes/upload` -> `pdf_engine.py` -> `file_storage.py` | Works locally; PDF text parsed via `pdfplumber`. **Critical:** Files stored on local disk (`DEVOPS-02`); fails in ephemeral containers. |
| **4** | **ATS Scoring & Skill Gap Analysis** | `POST /api/resumes/upload` -> `ATSEngine.calculate_pro_ats` | Deterministic heuristic calculation (regex, bullet points, action verbs). Honest ATS algorithm, but marketing claims it is a neural LLM evaluator. |
| **5** | **Career Roadmap Creation** | `POST /api/roadmap/generate` -> `RoadmapEngine.generate` | **High:** 100% static hardcoded dictionary. No AI generation (`AI-03`). Progress saved to `RoadmapProgress`. |
| **6** | **Mock Interview Practice** | `POST /api/interview/start` -> `POST /api/interview/session/{id}/answer` | **High:** Evaluation is word count + 6 keywords (`AI-01`). Questions are static (`AI-02`). Submissions lack row-level locks (`BUG-01`). Voice interviews do not persist (`FE-01`). |
| **7** | **AI Career Copilot** | `POST /api/copilot/chat` -> `CareerCopilotService.chat` | **High:** Fails to inject candidate profile (`AI-04`). Hardcodes OpenRouter. Silent static fallback on failure. Raw `print()` logs prompt text (`LOG-01`). |
| **8** | **Administrator Dashboards & Audit** | `GET /api/admin/dashboard` -> `GET /api/admin/users` -> `AdminAuditLog` | Operates correctly. All administrative actions write immutable audit logs. |
| **9** | **View-As Simulation Mode** | `POST /api/admin/simulation/start` -> `X-Simulation-Token` | **Critical:** `get_current_user` does not resolve simulation token (`ARCH-01`). Admin sees own empty records instead of candidate data. |
| **10** | **Database Lifecycle & Migrations** | `main.py:create_tables` on application startup | **Critical:** Imperative DDL on transaction pooler (`DATA-01`). No Alembic migrations exist. Zero Supabase RLS policies (`SEC-03`). |
| **11** | **Production Frontend-Backend API** | Browser -> Vite proxy (dev) / Docker Nginx -> Uvicorn | Reverse proxy routing verified and working. |

---

## 4. Current Test Suite Status & Baseline Evidence

- **Backend Test Suite Discovery:** 99 tests across 26 test files.
  - **Passed:** **99**
  - **Failed:** 0
  - **Skipped:** 0
  - **Execution Time:** 4.39s (Python 3.12, isolated in-memory SQLite harness).
- **Frontend Vitest Suite Discovery:** 75 tests across 23 test files.
  - **Passed:** **75**
  - **Failed:** 0
  - **Execution Time:** ~132s (jsdom environment).
- **TypeScript Static Verification:** `tsc --noEmit` passed with 0 errors.
- **ESLint Code Quality Verification:** 65 problems (49 errors, 16 warnings).
