# Lakshya AI — Master Project Context & Handover Architecture

**Document Version:** 1.0.0  
**Audit Date:** 2026-10-23  
**Status:** Authoritative Repository Baseline  
**Classification:** Internal Technical Handover Document  

---

## 1. Project Purpose & Scope

**Lakshya AI** is a full-stack, AI-driven career acceleration and readiness platform. It is engineered to guide candidates through their job search lifecycle by:
1. **Assessing Readiness:** Evaluating overall career readiness across ATS resume health, role alignment, interview performance, learning roadmap progress, and market opportunities.
2. **Resume Studio:** Parsing PDF/DOCX resumes, running ATS keyword analysis, suggesting bullet point rewrites, compiling LaTeX templates, and generating exportable PDFs.
3. **Role Alignment:** Matching candidate competencies against target industry roles (e.g. Full Stack, Backend, Frontend) and identifying missing critical skills.
4. **Career Roadmaps:** Structuring milestone-driven learning steps personalized to detected skill gaps.
5. **Interview Studio:** Simulating behavioral and technical mock interviews with question delivery, answer submission, scoring rubrics, and feedback reporting.
6. **Application Tracker:** Tracking job applications with pipeline stages, follow-up deadlines, and analytics.
7. **Job Matches:** Scraping/aggregating live and static job openings matched to user skill sets.
8. **Career Copilot:** Providing interactive chat guidance for job search, interview preparation, and skill acquisition.
9. **Administrative Control Center:** Managing users, impersonation/simulation ("View-As"), feature flags, audit logs, system health, and database telemetry.

---

## 2. Actual Technology Stack

| Layer | Declared Technologies | Actual Repository State & Verification | Evidence Classification |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React 18, TypeScript, Vite 5 | SPA with React 18.3.1, TypeScript 5.8.3, Vite 5.4.19 | `VERIFIED_IN_SOURCE`, `RUNTIME_VERIFIED` |
| **Frontend UI / Styling** | Tailwind CSS 3.4, Radix UI, Lucide | Lucide icons, Radix primitives, Tailwind CSS, Framer Motion | `VERIFIED_IN_SOURCE` |
| **Frontend State & Data** | TanStack Query v5, Context API | React Query v5.83.0, Axios client, scoped Auth/Career contexts | `VERIFIED_IN_SOURCE`, `AUTOMATED_TEST_VERIFIED` |
| **Backend Framework** | Python 3.12+, FastAPI, Uvicorn | FastAPI app mounted on `/api`, Uvicorn ASGI server | `VERIFIED_IN_SOURCE`, `RUNTIME_VERIFIED` |
| **Database & ORM** | PostgreSQL 15+, Supabase, SQLAlchemy 2.0 | SQLAlchemy 2.0 ORM with 37 tables. Connects to Supabase via pooled or direct connection | `VERIFIED_IN_SOURCE`, `RUNTIME_VERIFIED` |
| **Database Migrations** | Alembic | Alembic 1.13+ configured with safety guards; initial revision `5d3cf4891899` synthesized | `VERIFIED_IN_SOURCE` |
| **Vector Engine** | PgVector | `Vector(1536)` columns declared in `ResumeEmbedding` and `RoleEmbedding`; HNSW indexes pending | `VERIFIED_IN_SOURCE`, `ACTION_REQUIRED` |
| **AI / LLM Clients** | OpenAI, OpenRouter, Gemini | OpenRouter / OpenAI endpoints via HTTP requests; fallback to SHA-256 token hashing or heuristics | `VERIFIED_IN_SOURCE` |
| **Testing** | Vitest, Python unittest | Vitest 3.2.4 (79/79 passing), Python unittest (62/69 passing in isolated SQLite) | `AUTOMATED_TEST_VERIFIED` |
| **Deployment / Containers** | Docker, Nginx | Multi-stage Dockerfiles for frontend and backend; TeX Live installed in backend container | `VERIFIED_IN_SOURCE` |

---

## 3. Repository Structure & Key Entry Points

```
lakshya-ai-career-platform/
├── .env                              # Frontend Vite environment variables (VITE_API_BASE_URL)
├── Dockerfile                        # Frontend / production multi-stage build
├── nginx.conf                        # Production reverse proxy config (/api -> backend:10000)
├── package.json                      # Frontend scripts, dependencies, devDependencies
├── vite.config.ts                    # Vite config with /api reverse proxy to 127.0.0.1:10000
├── src/                              # Frontend source code
│   ├── main.tsx                      # Frontend DOM bootstrap
│   ├── App.tsx                       # Root routing, query provider, authenticated scope
│   ├── components/                   # UI components (dashboard, interview, layout, admin)
│   ├── context/                      # Context providers (AuthContext, CareerContext, etc.)
│   ├── hooks/                        # Custom React hooks (useCareerReadiness, useDashboardData)
│   ├── lib/                          # Utility functions (careerMetrics, queryKeys, utils)
│   ├── pages/                        # View pages (Candidate and Admin Control Center)
│   ├── services/                     # Axios API clients (api.ts, auth.ts, intelligenceService.ts)
│   └── test/                         # 24 Vitest test suites (79 unit and integration tests)
├── lakshyaai-backend/                # FastAPI backend root
│   ├── .env                          # Backend environment variables (DB URLs, JWT keys, SMTP)
│   ├── Dockerfile                    # Debian-based container with TeX Live and Python 3.12
│   ├── alembic.ini                   # Migration configuration
│   ├── requirements.txt              # Python dependencies
│   ├── alembic/                      # Migration revisions and safe runner env.py
│   ├── app/                          # Application source code
│   │   ├── main.py                   # FastAPI initialization, CORS, error handlers, lifespans
│   │   ├── api/                      # Routing layer
│   │   │   ├── router.py             # Master APIRouter mounting all sub-routes under /api
│   │   │   └── routes/               # Modular route handlers (auth, intelligence, copilot, etc.)
│   │   ├── core/                     # Core security, dependencies, permissions, release config
│   │   ├── db/                       # Database engine, session maker, Base, and 37 ORM models
│   │   └── services/                 # Business logic, engines, external integrations, admin services
│   ├── tests/                        # Backend unit & integration test suites
│   └── scripts/                      # Safe backup, restore, and seed scripts
└── docs/                             # Architecture, audit, and remediation documentation
```

---

## 4. System Architecture & Request Flows

### 4.1 Frontend-Backend Wiring
1. **Development Environment:**
   - Frontend runs on `http://127.0.0.1:5173`.
   - Backend runs on `http://127.0.0.1:10000`.
   - Requests made to `DEFAULT_API_BASE_URL` (`http://127.0.0.1:10000/api`) or relative `/api` (proxied by Vite) both reach FastAPI.
2. **Production Environment:**
   - Frontend assets served via Nginx.
   - Nginx proxies `/api/*` to `backend:10000`.
3. **Authentication Token Lifecycle:**
   - On `/api/auth/login`, backend returns `{ access_token, token_type: "bearer" }`.
   - Frontend `sessionService` stores the JWT token in `localStorage`.
   - `api.interceptors.request` automatically attaches `Authorization: Bearer <token>` to outbound requests.

### 4.2 Candidate Request Flow (e.g. Dashboard Intelligence Overview)
```
Browser UI -> useDashboardData hook -> intelligenceService.getIntelligence()
  -> GET /api/intelligence/overview (Bearer JWT)
    -> security_and_rate_limit_middleware (Request ID tracking & rate limit)
      -> get_current_user (JWT decoded, UUID validated, active/suspended checked)
        -> intelligence.py: get_intelligence_overview()
          -> CareerIntelligenceService.get_intelligence(db, user)
            -> Queries models.Resume, models.CareerGoal, models.Role, models.RoadmapProgress, models.InterviewSession
            -> Normalizes skills & missing competencies
            -> Runs RecommendationEngine.evaluate(...)
            -> Upserts models.CareerRecommendation records
            -> Returns schemas.CareerIntelligenceResponse (HTTP 200)
```

### 4.3 Simulation Mode Request Flow ("View-As")
```
Super Admin -> Starts simulation on Candidate ID
  -> Backend issues encrypted simulation token via SimulationService
  -> Frontend stores simulation state and displays ViewAsBanner
  -> Candidate endpoints receive headers:
       Authorization: Bearer <Admin_JWT>
       X-Simulation-Token: <Token>
  -> get_current_user dependency:
       1. Verifies admin JWT has role=="super_admin" and is_email_verified==True.
       2. Blocks ANY mutating HTTP method (POST, PUT, PATCH, DELETE) with HTTP 403 Forbidden.
       3. Validates simulation token timestamp, nonce, and target user ID.
       4. Sets request.state.actor = Admin User.
       5. Returns Candidate User as current_user, scoping all read queries to Candidate.
```

---

## 5. Authentication, Roles, & Permissions

The platform supports four distinct user roles stored in `models.User.role`:
1. `user` (Candidate): Default role assigned on public self-registration. Has read/write access strictly to own records.
2. `admin`: Administrative viewer. Can access `/api/admin/*` endpoints, view platform metrics and users.
3. `super_admin`: Highest privilege tier. Can bootstrap via verified email match, manage feature flags, execute DB health inspections, and initiate "View-As" candidate simulation sessions.
4. `reviewer`: Specialized role for resume/interview evaluation.

### Security Defenses Verified in Code
- **Closed Self-Registration:** Open registration (`/api/auth/register`) hardcodes `role="user"`. Admin roles cannot be obtained via registration payload.
- **Email Verification Guard:** Unverified admin accounts cannot log in or execute privileged operations.
- **Account Suspension Enforcement:** Deactivated (`is_active=False`) and suspended (`is_suspended=True`) accounts are denied access immediately at `get_current_user`.
- **Tenant Isolation:** All user queries in routes filter on `user_id == current_user.id` or are explicitly scoped via `request.state.subject`.

---

## 6. How to Run Frontend, Backend, & Tests

### Backend Local Run
```powershell
cd lakshyaai-backend
& ".\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 10000 --reload
```
Swagger UI available at: `http://127.0.0.1:10000/docs`

### Frontend Local Run
```powershell
npm run dev
```
Accessible at: `http://127.0.0.1:5173`

### Run Both Concurrently
```powershell
.\run-all.ps1
# or
run-all.bat
```

### Run Tests Safely
- **Backend Unittest Suite:**
  ```powershell
  cd lakshyaai-backend
  $env:TESTING="true"
  & ".\.venv\Scripts\python.exe" -m unittest discover -s tests -p "test_*.py"
  ```
- **Frontend Vitest Suite:**
  ```powershell
  npm run test
  ```
- **Frontend TypeScript Verification:**
  ```powershell
  npx tsc --noEmit
  ```
- **Frontend Linting:**
  ```powershell
  npm run lint
  ```

---

## 7. Known Limitations & Blockers

1. **Host Infrastructure Blockers:**
   - Docker Engine is not installed/running on the local Windows host, blocking container image compilation and live LaTeX PDF container tests.
   - PostgreSQL command-line tools (`psql`, `pg_dump`) are not installed locally on the Windows host.
2. **Safe Migration Constraints:**
   - Migrations against the remote Supabase database are intentionally fail-closed by `_assert_migration_safety` to prevent accidental production schema alterations.
3. **AI Provider Fallbacks:**
   - Without live OpenAI/OpenRouter API credentials, AI workflows fall back to deterministic algorithms, static question banks, and SHA-256 token hashing.
