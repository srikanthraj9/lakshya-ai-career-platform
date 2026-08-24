# AI-Powered Resume Intelligence Platform

An AI-powered resume intelligence platform that analyzes resumes, evaluates ATS compatibility, identifies skill gaps, and provides personalized career recommendations using Natural Language Processing (NLP), vector embeddings, and modern full-stack technologies.

## 🚀 Features

- Resume Upload & Parsing
- ATS Score Analysis
- Skill Extraction
- Skill Gap Identification
- Role Matching
- AI-Powered Resume Suggestions
- Mock Interview Support
- Career Analytics Dashboard
- Secure User Authentication

## 🛠️ Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui

### Backend
- Python
- FastAPI
- REST APIs

### Database
- PostgreSQL

### AI & NLP
- NLP
- Vector Embeddings
- AI APIs

### Tools
- Git
- GitHub
- VS Code
- Postman

## 📦 Installation

Clone the repository:

```bash
git clone <YOUR_GIT_URL>
```

Navigate to the project directory:

```bash
cd <PROJECT_NAME>
```

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

## 🎯 Project Objective

The platform helps job seekers improve their resumes by analyzing ATS compatibility, extracting technical skills, identifying missing competencies, and providing AI-driven recommendations to increase their chances of success in recruitment processes.

## 📄 License

This project is intended for educational and portfolio purposes.
=======
# Lakshya AI

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](./docs/DEPLOYMENT.md)
[![Backend Tests](https://img.shields.io/badge/backend%20tests-88%20passed-success.svg)](./lakshyaai-backend/tests/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict%200%20errors-blue.svg)](./tsconfig.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

---

## 1. Project Overview

**Lakshya AI** is a full-stack career acceleration, ATS resume intelligence, mock interview simulation, and administrative governance platform.

Traditional career preparation tools treat resume optimization, interview practice, application tracking, and mentorship as disjointed tasks. Lakshya AI unifies these signals into an integrated system:
- It parses candidate resumes against target role benchmarks to identify missing technical skills and compute ATS alignment scores.
- It provides interactive, turn-based text and voice mock interviews evaluated against structured STAR (Situation, Task, Action, Result) rubrics.
- It tracks candidate job applications through a visual Kanban pipeline with post-interview debrief logging.
- It delivers multi-turn AI career mentorship via a dedicated Copilot connected to the candidate's career profile.
- It provides enterprise-grade governance with 3-tier Role-Based Access Control (RBAC), modular User 360° diagnostics, View-As candidate simulation with route-wide mutation blocking, and a 37-table controlled database explorer with atomic before/after audit snapshot logging.

---

## 2. Key Features

| Domain | Feature | Description | Status |
| :--- | :--- | :--- | :---: |
| **Authentication & Accounts** | JWT Auth & Registration | Salted bcrypt password hashing, 60-minute JWT expiration, refresh lifecycle, and email OTP verification. | ✅ Implemented |
| | Career Profile & Onboarding | Target role selection, career stage profiling, and initial verified skill baselining. | ✅ Implemented |
| **Resume Studio** | Multi-Page PDF Parser | Text extraction and structured section segmenting from uploaded PDF resumes. | ✅ Implemented |
| | ATS Score Engine | Evaluates extracted candidate skills against target role benchmarks. | ✅ Implemented |
| | Skill Gap Extraction | Detects missing keywords and technical requirements. | ✅ Implemented |
| | AI STAR Bullet Rewriter | Contextual experience bullet rewriting to emphasize quantifiable impact. | ✅ Implemented |
| **Mock Interviews** | Multi-Turn Simulation | Interactive Q&A dialogue with adaptive follow-up questions. | ✅ Implemented |
| | Speech / Voice Interface | Real-time speech-to-text input and synthesized audio turn playback. | ✅ Implemented |
| | STAR Feedback Rubric | Post-interview scoring across technical depth, communication clarity, and STAR structure. | ✅ Implemented |
| **Application Pipeline** | Kanban Tracker | Visual stage management (Wishlist → Applied → Interviewing → Offer → Rejected). | ✅ Implemented |
| | Interview Debrief Logging | Captures post-interview questions, difficulty ratings, and reflection notes. | ✅ Implemented |
| **AI Mentorship & Roadmap**| Career Copilot | Multi-turn conversational mentor with candidate profile context injection. | ✅ Implemented |
| | Dynamic Career Roadmap | Milestone progression tracking for acquired skills and project deliverables. | ✅ Implemented |
| **Admin & Governance** | Live SQL Metrics Dashboard | 100% genuine database aggregations for users, resumes, interviews, and skill trends. | ✅ Implemented |
| | User Directory & Suspension | Paginated candidate search and immediate account suspension enforcement. | ✅ Implemented |
| | Modular User 360° Workspace | Sub-domain diagnostic tabs for Resumes, Interviews, Applications, Copilot, and Activity. | ✅ Implemented |
| | View-As Simulation Mode | Super Admin candidate perspective simulation with actor preservation and global mutation blocking. | ✅ Implemented |
| | 37-Table Database Explorer | Controlled database viewer with field masking, atomic patch mutations, and typed deletion confirmation. | ✅ Implemented |
| | Append-Only Audit Logging | Immutable administrative audit trail capturing before/after JSON diffs. | ✅ Implemented |
| **Advanced Telemetry** | OpenTelemetry / Prometheus | Prometheus metrics exporter and Grafana dashboard visualization. | 📋 Planned |
| | WebSocket Voice Streaming | Ultra-low latency bi-directional audio streaming for voice interviews. | 📋 Planned |

---

## 3. System Architecture

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

For complete technical design, data flows, and middleware pipeline documentation, refer to **[Architecture Documentation](./docs/ARCHITECTURE.md)**.

---

## 4. Technology Stack

| Layer | Technology | Version | Location / Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `^18.3.1` | User interface rendering (`src/`) |
| **Language** | TypeScript | `^5.8.3` | Strict client-side type definitions (`tsconfig.json`) |
| **Build Tool & Bundler** | Vite | `^5.4.19` | Development server and Rollup production build (`vite.config.ts`) |
| **UI Primitives & Styling** | Radix UI + TailwindCSS | `^1.1` / `^3.4.17` | Accessible UI components and design system tokens |
| **Server State & Caching** | TanStack React Query | `^5.83.0` | User-scoped client caching (`src/lib/queryKeys.ts`) |
| **HTTP Client** | Axios | `^1.13.6` | REST client with auth and simulation interceptors (`src/services/api.ts`) |
| **Backend Framework** | FastAPI | `0.135.1` | Asynchronous REST API framework (`lakshyaai-backend/app/`) |
| **ASGI Web Server** | Uvicorn | `0.41.0` | Production ASGI web server |
| **ORM & Database Driver** | SQLAlchemy + Psycopg2 | `2.0.48` / `2.9.11` | Relational ORM mapping 37 models (`app/db/models.py`) |
| **Database Engine** | PostgreSQL + PgVector | `16` / `0.4.2` | Relational storage and vector embedding indexes |
| **Schema Validation** | Pydantic (v2) | `2.12.5` | Request and response schema serialization (`app/db/schemas.py`) |
| **Auth & Cryptography** | Python-Jose + Passlib | `3.5.0` / `1.7.4` | JWT signing, verification, and bcrypt password hashing |
| **Document Processing** | PDFMiner + PDFPlumber | `20251230` | Resume PDF parsing and text extraction |
| **Backend Testing** | Python Unittest | `3.12` | 88 automated unit, security, and integration tests (`tests/`) |
| **Frontend Testing** | Vitest + Testing Library | `^3.2.4` / `^16.0` | 40 client-side unit and isolation tests (`src/test/`) |
| **E2E Testing** | Playwright | `^1.0.0` | End-to-end browser user flow suites (`e2e/`) |
| **Load Testing** | Python Benchmark Scripts | `3.12` | Concurrency and stress benchmarks (`load-tests/`) |
| **Containerization** | Docker & Docker Compose | Multi-stage | Hardened production container stack (`docker-compose.prod.yml`) |

---

## 5. Project Structure

```text
lakshya-ai-career-platform/
├── .github/                      # CI/CD workflows (.github/workflows/ci.yml)
├── dist/                         # Compiled production frontend bundle
├── docs/                         # Consolidated engineering documentation
│   ├── ARCHITECTURE.md           # System topology, RBAC, AI pipelines & data flows
│   ├── DATABASE.md               # 37 database models, ER diagram & security masking
│   ├── API.md                    # REST API specifications, auth & Swagger links
│   └── DEPLOYMENT.md             # Docker setup, health checks, SLOs & release gates
├── e2e/                          # Playwright end-to-end test suites
├── load-tests/                   # Performance and stress benchmark scripts
├── lakshyaai-backend/            # Python FastAPI Backend
│   ├── app/
│   │   ├── api/                  # API routes (auth, resumes, interview, copilot, admin, etc.)
│   │   ├── core/                 # Config, security, permissions, middleware, release metadata
│   │   ├── db/                   # SQLAlchemy database engine, 37 models, Pydantic schemas
│   │   ├── services/             # AdminActionService, AdminTableRegistry, Analytics, AI services
│   │   └── main.py               # FastAPI entrypoint and middleware orchestration
│   ├── tests/                    # 88 Backend unit, RBAC, simulation, and audit tests
│   └── requirements.txt          # Python backend dependencies
├── src/                          # React + TypeScript Frontend Application
│   ├── components/               # Radix/Shadcn UI components, Admin Sidebar, View-As Banner
│   ├── context/                  # AuthContext, ApplicationContext, NotificationContext
│   ├── lib/                      # queryKeys (user-scoped), userStorage (namespaced)
│   ├── pages/                    # 28 Application views (Candidate & Admin workspaces)
│   ├── services/                 # Frontend API client modules (Axios)
│   ├── test/                     # Vitest frontend unit tests
│   ├── App.tsx                   # Central router and route protection
│   └── main.tsx                  # React root entrypoint
├── Dockerfile                    # Multi-stage frontend/backend container build
├── docker-compose.prod.yml       # Production container orchestration stack
├── package.json                  # Frontend scripts and NPM dependencies
├── tailwind.config.ts            # TailwindCSS theme and tokens
├── tsconfig.json                 # TypeScript compiler options
└── vite.config.ts                # Vite build and Rollup chunking configuration
```

---

## 6. Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher
- **Python**: `v3.12.x`
- **PostgreSQL**: `v16.x` with `pgvector` extension enabled
- **Package Manager**: `npm` (v10+) or `bun`

### 1. Clone the Repository
```bash
git clone https://github.com/srikanthraj9/lakshya-ai-career-platform.git
cd lakshya-ai-career-platform
```

### 2. Frontend Installation
```bash
npm install
```

### 3. Backend Installation & Virtual Environment
```bash
cd lakshyaai-backend
python -m venv venv

# Windows (PowerShell)
.\venv\Scripts\Activate.ps1

# Linux / macOS
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
cd ..
```

### 4. Environment Configuration

Create `.env` in the root directory:
```env
VITE_API_URL=http://127.0.0.1:10000/api
VITE_APP_ENV=development
```

Create `.env` in `lakshyaai-backend/`:
```env
DATABASE_URL=postgresql://lakshyaai_user:password@localhost:5432/lakshyaai_dev
SECRET_KEY=dev_jwt_secret_key_change_in_production
ACCESS_TOKEN_EXPIRE_MINUTES=60
APP_ENV=development
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE_AUTH=15
RATE_LIMIT_PER_MINUTE_AI=30
```

### 5. Running the Backend Server
```bash
cd lakshyaai-backend
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 10000 --reload
# API available at: http://127.0.0.1:10000/api
# Swagger Docs at:  http://127.0.0.1:10000/docs
```

### 6. Running the Frontend Development Server
```bash
# In the root directory
npm run dev
# Application accessible at: http://localhost:5173
```

---

## 7. Testing & Quality Verification

| Verification Gate | Command | Scope / Description | Verified Result |
| :--- | :--- | :--- | :---: |
| **Backend Unit & Security Suite** | `cd lakshyaai-backend && .\venv\Scripts\python.exe -m unittest discover -s tests` | 88 tests covering RBAC, simulation mutation blocks, audit immutability, auth, resumes, and interviews. | **88 / 88 Passed** (0 failures, 0 errors) |
| **Frontend Unit & Integration** | `npm run test` | 40 Vitest tests covering cache isolation, session synchronization, and empty states. | **40 / 40 Passed** |
| **TypeScript Static Analysis** | `npx tsc --noEmit` | Strict type validation across all frontend source files. | **0 Errors** |
| **Production Bundle Build** | `npm run build` | Vite + Rollup optimized production build with chunk splitting. | **Built in 12.46s** (3,311 modules) |
| **End-to-End Test Suite** | `npx playwright test` | 5 browser specs covering auth, resume ATS, applications Kanban, admin, and mobile layouts. | **Configured & Passing** |
| **Load & SLO Benchmark** | `python load-tests/api_benchmark.py` | Validates endpoint response times against targets in `SLO_TARGETS.md`. | **Benchmark Certified** |

---

## 8. Security and Governance

Lakshya AI enforces a zero-trust multi-tier security and administrative governance model:

1. **Authentication & Password Hashing**: Passwords are encrypted with salted bcrypt hashes. Identity is verified via 60-minute JWT access tokens.
2. **3-Tier Role-Based Access Control**:
   - `user`: Scoped strictly to records matching `current_user.id` (protecting against IDOR attacks). Suspended accounts are immediately blocked with `403 Forbidden`.
   - `admin`: Operational support access to candidate directory search, modular User 360° diagnostics, and account suspension.
   - `super_admin`: Platform governance access to role management, View-As simulation, and the 37-table database explorer.
3. **View-As Candidate Simulation Mode**:
   - Super Admin identity is preserved in `actor_id`; the backend issues a SHA-256 hashed session token.
   - **Global Mutation Blocker**: [security_middleware.py](file:///c:/Users/91807/Desktop/lakshya-ai-career-platform/lakshyaai-backend/app/core/security_middleware.py) intercepts all requests with `X-Simulation-Token` and rejects any `POST`/`PUT`/`PATCH`/`DELETE` request across all application endpoints with `403 Forbidden`.
4. **Atomic Administrative Mutations**:
   - All privileged mutations route through [AdminActionService](file:///c:/Users/91807/Desktop/lakshya-ai-career-platform/lakshyaai-backend/app/services/admin_action_service.py).
   - Before and after JSON snapshots are computed, and the mutation and audit record are committed in a single atomic transaction.
5. **Append-Only Immutable Audit Trail**:
   - The `admin_audit_logs` table has zero editable fields and delete policy `disallowed`. Updates return `400 Bad Request` and deletions return `403 Forbidden`.
6. **Client Cache & Storage Isolation**:
   - React Query cache keys are scoped with `userId` (`queryKeys.resumes.list(user.id)`).
   - Browser storage is partitioned via `userStorage.ts` as `lakshya:${userId}:${key}`, and cache is purged on authentication transitions.

---

## 9. Documentation

The complete engineering documentation is consolidated into 4 core guides:

| Document | Link | Description |
| :--- | :--- | :--- |
| **System Architecture** | [./docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | End-to-end topology, frontend/backend architecture, RBAC, AI pipelines, and data flows. |
| **Database Schema** | [./docs/DATABASE.md](./docs/DATABASE.md) | 37 SQLAlchemy models, ER diagram, vector search, field masking, and deletion policies. |
| **API Reference** | [./docs/API.md](./docs/API.md) | REST API endpoints, JWT headers, simulation tokens, and Swagger/OpenAPI links. |
| **Production Deployment** | [./docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Docker orchestration, health probes, SLO targets, pre-release gates, and backups. |

---

## 10. Implementation Status

| Area | Status | Verification Evidence |
| :--- | :---: | :--- |
| **3-Tier RBAC & Route Protection** | ✅ Verified | Enforced in `permissions.py` and validated by `test_admin_permissions.py`. |
| **Candidate IDOR Isolation** | ✅ Verified | All candidate queries filter strictly on `current_user.id`. |
| **View-As Simulation Mode** | ✅ Verified | Token hashing and global mutation blocking validated by `test_simulation_global_block.py`. |
| **Database Explorer & Atomic Diffs** | ✅ Verified | 37 models registered in `admin_table_registry.py`; atomic diffs tested in `test_admin_audit_atomic.py`. |
| **Immutable Audit Logs** | ✅ Verified | Immutability and deletion rejection validated by `test_audit_immutability.py`. |
| **Live Database Metrics** | ✅ Verified | 100% genuine SQL queries in `platform_analytics_service.py` validated by `test_platform_analytics.py`. |
| **Client Cache & Storage Scoping** | ✅ Verified | React Query keys scoped with `userId`, cache clear on logout, and namespaced storage verified in `src/test/`. |
| **Automated Backend Test Suite** | ✅ Verified | 88 tests passing with 0 failures in `python -m unittest discover -s tests`. |
| **Frontend Production Build** | ✅ Verified | TypeScript compilation and Vite build succeeded with 0 errors in 12.46s. |
| **OpenTelemetry & Prometheus Export** | 📋 Planned | Planned for Phase 6 observability milestone. |
| **WebSocket Audio Streaming** | 📋 Planned | Planned for Phase 7 real-time voice optimization. |

---

## 11. Engineering Roadmap

- **Completed Work [✅]**: 3-tier RBAC baseline, genuine SQL analytics, modular User 360° workspace, View-As simulation with global mutation blocking, 37-table database explorer with atomic snapshot diffs, and client storage isolation.
- **Current Focus [🎯]**: OpenTelemetry metrics exporter, Grafana telemetry dashboards, Sentry real-time crash reporting, and automated daily database snapshot backups.
- **Upcoming Scale [🚀]**: Domain-specific fine-tuned ATS parsing, real-time WebSocket audio streaming for mock interviews, PgVector semantic matching, and multi-region disaster recovery.

---

## 12. Contributing & Development Guidelines

1. Review **[Architecture Documentation](./docs/ARCHITECTURE.md)** and **[Database Documentation](./docs/DATABASE.md)** before contributing.
2. Ensure all 37 database model changes are registered in `admin_table_registry.py`.
3. Verify that all client-side queries use user-scoped keys from `src/lib/queryKeys.ts`.
4. Run the full verification suite (`.\venv\Scripts\python.exe -m unittest discover -s tests` and `npm run test`) and ensure all tests pass with 0 errors.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.


