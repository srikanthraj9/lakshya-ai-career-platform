# 🏗️ Lakshya AI — System Architecture & Data Flows

This document provides a comprehensive overview of the system architecture, component topology, 3-tier Role-Based Access Control (RBAC), View-As candidate simulation, AI intelligence pipelines, and core data flows of Lakshya AI.

---

## 1. System Topology & High-Level Architecture

```text
                           Candidate / Administrator
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │    React 18 SPA Frontend      │
                      │  TypeScript + Vite + Tailwind │
                      └───────────────┬───────────────┘
                                      │
                                REST APIs + JWT
                                X-Simulation-Token
                                      │
                      ┌───────────────▼───────────────┐
                      │      FastAPI ASGI Server      │
                      │  (Middleware Pipeline + RBAC) │
                      └───────────────┬───────────────┘
                                      │
                ┌─────────────────────┼─────────────────────┐
                ▼                     ▼                     ▼
      ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
      │  PostgreSQL 16   │  │   AI Engine &    │  │  Storage Engine  │
      │   + PgVector     │  │   LLM Gateway    │  │  & Client Cache  │
      │ 37 Relational DB │  │ ATS, Audio, STAR │  │ PDF Binaries &   │
      │  & Audit Tables  │  │ Structured JSON  │  │ User-Scoped Cache│
      └──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## 2. Frontend Architecture & Client State Isolation

- **Framework & Tooling**: React 18 with TypeScript, Vite 5.4 bundler, TailwindCSS, and Radix UI accessible primitives.
- **Routing & Route Guards** (`src/App.tsx`):
  - **Public Routes**: `/login`, `/register`, `/verify-email`, `/onboarding`
  - **Candidate Workspaces**: `/dashboard`, `/resume`, `/interview`, `/applications`, `/copilot`, `/roadmap`, `/profile`
  - **Admin & Governance Center**: `/admin`, `/admin/users`, `/admin/users/:id` (User 360), `/admin/analytics`, `/admin/database` (Super Admin)
- **Client Cache Isolation** (`src/lib/queryKeys.ts`):
  - All TanStack React Query cache keys are strictly scoped with `userId`: `queryKeys.resumes.list(user.id)`.
  - On login, logout, or session transition, `AuthContext.tsx` cancels all in-flight queries and clears the browser query cache.
- **Namespaced Browser Storage** (`src/lib/userStorage.ts`):
  - All candidate storage writes route through `setUserStorage(userId, key, value)` to produce `lakshya:${userId}:${key}` keys, preventing cross-user data leakage on shared machines.

---

## 3. Backend Architecture & Middleware Pipeline

Built on Python 3.12 + FastAPI 0.135 + Uvicorn ASGI + SQLAlchemy 2.0.

### Middleware Execution Pipeline (`app/core/security_middleware.py`)
1. **CORS Headers**: Validates origins, allowed headers, and methods.
2. **Request Tracing**: Injects and propagates `X-Request-ID` across all log entries.
3. **Sliding-Window Rate Limiting**: Enforces 15 req/min on authentication routes and 30 req/min on AI endpoints.
4. **Global View-As Simulation Blocker**: Intercepts requests containing `X-Simulation-Token`. If the HTTP method is `POST`, `PUT`, `PATCH`, or `DELETE` (except `/api/admin/simulation/end`), it immediately rejects the request with `403 Forbidden`.
5. **Security Headers**: Injects `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `X-XSS-Protection: 1; mode=block`.

---

## 4. Security, 3-Tier RBAC & Governance

```
                          ┌───────────────────────────┐
                          │    AUTHENTICATED ACTOR    │
                          │   (JWT Identity Token)    │
                          └─────────────┬─────────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        ▼                               ▼                               ▼
  Candidate / User               Support Admin                     Super Admin
  (`role = 'user'`)             (`role = 'admin'`)            (`role = 'super_admin'`)
  ─────────────────             ──────────────────            ────────────────────────
  • Access to own data only     • Candidate user directory    • Full platform governance
  • Filtered by current_user.id • Paginated search & filters  • View-As candidate simulation
  • Blocked from admin routes   • Modular User 360° view      • 37-table database explorer
    (403 Forbidden)             • Suspend / activate accounts • User role promotion/demotion
  • Suspended users blocked     • Read-only audit log views   • Feature flag toggles
    from candidate actions      • Blocked from Super Admin    • Atomic DB mutations + diffs
                                  operations (403)
```

### Key Security Safeguards
1. **Actor-Preserved View-As Simulation**:
   - Super Admin identity is preserved in `actor_id`; session token is SHA-256 hashed and stored in `admin_simulation_sessions`.
   - Global mutation blocking guarantees read-only candidate perspective across all routes.
2. **Atomic Administrative Mutations**:
   - All database updates pass through `AdminActionService`.
   - Before and after JSON snapshots are captured, and the record update and audit log entry are committed in a single atomic database transaction.
3. **Append-Only Immutable Audit Trail**:
   - `admin_audit_logs` has zero editable fields and delete policy `disallowed`. Updates return `400 Bad Request` and deletions return `403 Forbidden`.

---

## 5. AI Intelligence Pipelines

```
[Candidate Input] ──> [AI Gateway (Rate Limiter + Context Ingestion)]
                             │
       ┌─────────────────────┼─────────────────────┐
       ▼                     ▼                     ▼
[Resume ATS Engine]  [Mock Voice Simulator]  [Copilot AI Mentor]
 • PDF text parsing   • Q&A turn generation   • Multi-turn chat
 • Skill extraction   • Speech-to-speech      • Career context
 • Benchmark gap math • STAR rubric scoring   • Dynamic milestones
```

- **ATS Scoring Engine**: Extracts skills from uploaded PDF resumes and compares them against target role benchmarks to calculate match percentages and identify missing skills.
- **Mock Voice Interview Simulator**: Generates role-specific questions, transcribes candidate speech, handles follow-up turns, and evaluates performance against STAR (Situation, Task, Action, Result) criteria.
- **Career Copilot**: Conversational mentorship assistant with injected career profile context and one-click conversion of recommendations to roadmap milestones.

---

## 6. Core Application Data Flows

### Flow 1: Candidate Login & State Isolation
```text
Candidate -> Login Form -> POST /api/auth/login -> FastAPI verifies bcrypt hash
  -> Returns JWT & user profile -> AuthContext clears old query cache
  -> Namespaces localStorage (lakshya:{userId}:*) -> Redirects to /dashboard
```

### Flow 2: Resume Upload & ATS Parsing
```text
Candidate -> Drops PDF -> POST /api/resumes/upload (Rate Limit 30/min)
  -> PDFPlumber extracts raw text -> Matches against Role benchmark skills
  -> Computes ATS score & missing skill gaps -> Transactional save to PostgreSQL
  -> Returns structured ATS report -> Updates user-scoped TanStack Query cache
```

### Flow 3: Super Admin View-As Simulation & Read-Only Protection
```text
Super Admin -> Clicks "View-As Candidate" -> POST /api/admin/simulation/start
  -> Backend hashes SHA-256 token -> Frontend receives sim_token & shows top banner
  -> Navigates candidate views with X-Simulation-Token -> GET requests succeed
  -> Super Admin attempts mutation (e.g. DELETE /api/resumes/123)
  -> SecurityMiddleware detects mutating HTTP verb + X-Simulation-Token
  -> Rejects immediately with 403 Forbidden -> Candidate data remains pristine
```

### Flow 4: Atomic Database Mutation & Audit Snapshot
```text
Super Admin -> Edits record in Database Explorer -> PATCH /api/admin/database/tables/users/{id}
  -> AdminActionService validates editable fields -> Captures before_snapshot
  -> Applies mutation -> Captures after_snapshot -> Computes JSON diff
  -> Commits update and admin_audit_logs record in a single atomic transaction
```
