# 🎯 Lakshya AI — Career Intelligence & Acceleration Platform

<p align="center">
  <img src="https://img.shields.io/badge/version-3.1.0--rc-blue.svg?style=for-the-badge" alt="Version 3.1.0-rc" />
  <img src="https://img.shields.io/badge/FastAPI-0.135.1-009688.svg?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-18.3.1-61DAFB.svg?style=for-the-badge&logo=react&logoColor=black" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-Strict_0_Errors-3178C6.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript Strict" />
  <img src="https://img.shields.io/badge/PostgreSQL-16_|_Supabase-336791.svg?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Backend_Tests-88_Passed-success.svg?style=for-the-badge" alt="88 Tests Passed" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge" alt="MIT License" />
</p>

---

## 📌 Table of Contents

- [Overview](#-overview)
- [System Architecture](#-system-architecture)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Quick Start Guide](#-quick-start-guide)
  - [Prerequisites](#prerequisites)
  - [One-Click Startup](#1-one-click-startup-recommended)
  - [Manual Setup (Step-by-Step)](#2-manual-setup-step-by-step)
  - [Environment Variables](#3-environment-configuration)
- [Default Access Endpoints](#-default-access-endpoints)
- [Security, RBAC & Governance](#-security-rbac--governance)
- [Project Directory Structure](#-project-directory-structure)
- [Testing & Quality Verification](#-testing--quality-verification)
- [Engineering Documentation](#-engineering-documentation)
- [License](#-license)

---

## 🌟 Overview

**Lakshya AI** is a production-grade, AI-driven career acceleration and talent governance platform. While traditional tools treat resume optimization, interview practice, application tracking, and mentorship as disjointed tasks, Lakshya AI unifies these signals into an integrated, data-driven ecosystem:

- **ATS Resume Intelligence**: Parses PDF resumes, compares candidate skill sets against role benchmarks, computes match scores, and rewrites bullet points into quantifiable STAR impact statements.
- **Adaptive Mock Interviews**: Multi-turn text and voice simulations featuring contextual follow-up probing and evaluation against structured STAR rubrics.
- **Application Kanban Pipeline**: End-to-end visual pipeline (Wishlist → Applied → Interviewing → Offer → Rejected) with interview debrief logs and analytics.
- **AI Career Copilot**: Context-aware conversational mentor with automated candidate profile injection for tailored roadmaps and skill acquisition.
- **Enterprise Governance**: 3-tier Role-Based Access Control (RBAC), User 360° diagnostics, Super Admin View-As simulation with route-wide mutation blocking, 37-table database explorer, and append-only audit logging.

---

## 🏛️ System Architecture

```mermaid
graph TD
    Client["React 18 + Vite SPA Client<br/>(TailwindCSS, Radix UI, TanStack Query)"]
    Proxy["Vite Reverse Proxy<br/>(:5173/api -> :10000/api)"]
    FastAPI["FastAPI ASGI Backend Server<br/>(:10000)"]
    
    Security["Security & Rate Limiting Middleware<br/>(JWT, X-Simulation-Token, CORS)"]
    Router["API Router<br/>(Auth, Resumes, Interviews, Copilot, Admin)"]
    
    DB[(PostgreSQL 16 / Supabase<br/>37 Relational & Audit Tables)]
    AI["AI Services & LLM Gateway<br/>(Groq Llama-3.3-70b / OpenAI)"]
    OAuth["OAuth 2.0 / OIDC<br/>(Google Authentication)"]
    Storage["PDF Uploads & Resume Storage<br/>(PDFMiner & PDFPlumber)"]

    Client -->|HTTP / REST + JWT| Proxy
    Proxy -->|Proxied Requests| FastAPI
    FastAPI --> Security
    Security --> Router
    Router --> DB
    Router --> AI
    Router --> OAuth
    Router --> Storage
```

---

## 🚀 Key Features

### 📄 1. Resume Studio & ATS Intelligence
- **Multi-Page PDF Parsing**: Extracts text, metadata, and structured sections from uploaded resumes using `pdfminer.six` and `pdfplumber`.
- **ATS Score Engine**: Matches extracted technical and behavioral competencies against target role requirements.
- **Skill Gap Extraction**: Pinpoints missing domain skills, tools, and certifications.
- **AI STAR Bullet Rewriter**: Re-engineers resume bullet points into impact-focused **Situation-Task-Action-Result** statements powered by LLMs.

### 🎙️ 2. Interactive Mock Interview Hub
- **Multi-Turn Simulations**: Adaptive technical and behavioral interview sessions that formulate dynamic follow-ups based on candidate responses.
- **Speech & Audio Interaction**: Real-time browser speech-to-text input and synthesized voice playback.
- **STAR Feedback Rubric**: Evaluates responses across technical depth, communication clarity, problem-solving, and structured delivery.

### 📊 3. Application Kanban Tracker & Debrief
- **Drag-and-Drop Workflow**: Manage applications across `Wishlist`, `Applied`, `Interviewing`, `Offer`, and `Rejected` stages.
- **Interview Debrief Logging**: Capture questions asked, difficulty ratings, key takeaways, and reflection notes immediately after interviews.
- **Application Analytics**: Track conversion rates, response timelines, and interview pass rates.

### 🤖 4. AI Career Copilot & Dynamic Roadmaps
- **Profile Context Injection**: Conversations automatically factor in target role, current experience level, and identified skill gaps.
- **Step-by-Step Learning Roadmaps**: Actionable milestone paths with curated project ideas and learning resources.

### 🛡️ 5. Enterprise Governance & Administration
- **Live SQL Analytics**: 100% genuine database aggregations for users, resumes, interviews, and platform trends.
- **User 360° Diagnostic Workspace**: View complete sub-domain candidate telemetry (Resumes, Interviews, Applications, Copilot Sessions, Audit Activity).
- **View-As Simulation Mode**: Allows Super Admins to view candidate accounts while enforcing a **global mutation blocker** that denies all write operations (`POST`, `PUT`, `PATCH`, `DELETE`).
- **37-Table Database Explorer**: Controlled administrative database browser with field masking, atomic patch mutations, and typed confirmation on deletions.
- **Append-Only Audit Trail**: Immutable system audit logs capturing before-and-after JSON diffs for administrative actions.

---

## 💻 Tech Stack

| Domain | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | React `^18.3.1` | Modern component-driven single-page application |
| **Language (Frontend)** | TypeScript `^5.8.3` | Strict client-side typing with 0 compiler errors |
| **Build & Dev Tool** | Vite `^5.4.19` | Fast HMR dev server and Rollup production bundler |
| **UI Components & Styles** | TailwindCSS + Radix UI | Accessible UI primitives styled with design tokens |
| **Client State & Caching** | TanStack React Query `^5.83.0` | Cache management with user-scoped cache keys |
| **HTTP Client** | Axios `^1.13.6` | Interceptors for JWT auth, simulation tokens, and error handling |
| **Backend Framework** | FastAPI `0.135.1` | High-performance Python async ASGI web framework |
| **ASGI Server** | Uvicorn `0.41.0` | Production-ready ASGI server |
| **Database & ORM** | PostgreSQL 16 + SQLAlchemy `2.0.48` | Relational ORM mapping 37 models via connection pooling |
| **Database Cloud** | Supabase PostgreSQL | Cloud-hosted PostgreSQL instance with IPv4 pooler |
| **Data Validation** | Pydantic (v2) `2.12.5` | Fast serialization and request/response validation |
| **AI / LLM Gateway** | Groq API (`llama-3.3-70b-versatile`) | High-speed LLM inference for resume analysis & mock interview |
| **Document Processing** | PDFMiner + PDFPlumber | Deep PDF text extraction and layout parsing |
| **Security & Auth** | Passlib (bcrypt) + Python-Jose | 60-minute JWTs with cryptographic signing |

---

## ⚡ Quick Start Guide

### Prerequisites
- **Node.js**: `v20.x` or higher
- **Python**: `v3.12.x`
- **PostgreSQL**: Local instance or Supabase account
- **Git**

---

### 1. One-Click Startup (Recommended)

Run both the frontend and backend servers simultaneously using the provided starter scripts:

**Windows (PowerShell):**
```powershell
.\run-all.ps1
```

**Windows (Command Prompt / Batch):**
```cmd
run-all.bat
```

---

### 2. Manual Setup (Step-by-Step)

#### Step 2.1: Clone the Repository
```bash
git clone https://github.com/srikanthraj9/lakshya-ai-career-platform.git
cd lakshya-ai-career-platform
```

#### Step 2.2: Backend Setup
```bash
cd lakshyaai-backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the FastAPI server
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 10000 --reload
```

#### Step 2.3: Frontend Setup
Open a separate terminal in the root directory:
```bash
# Install frontend dependencies
npm install

# Start Vite development server
npm run dev
```

---

### 3. Environment Configuration

#### Root / Frontend Environment (`.env`)
```env
# Application Environment
VITE_APP_ENV=development

# Backend REST API Base URL
VITE_API_BASE_URL=http://127.0.0.1:10000/api

# Telemetry Mode: console | production | noop
VITE_TELEMETRY_MODE=console
```

#### Backend Environment (`lakshyaai-backend/.env`)
```env
# Application Configuration
APP_NAME=LakshyaAI
DEBUG=True
FRONTEND_URL=http://127.0.0.1:5173

# JWT Authentication
SECRET_KEY=your-super-secret-jwt-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Database Configuration (PostgreSQL / Supabase or SQLite)
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres

# AI / Groq LLM Configuration
GROQ_API_KEY=your_groq_api_key_here
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_MODEL=llama-3.3-70b-versatile

# Google OAuth 2.0 (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://127.0.0.1:10000/api/auth/google/callback
```

---

## 🌐 Default Access Endpoints

| Service | URL | Notes |
| :--- | :--- | :--- |
| **Frontend Application** | [http://127.0.0.1:5173](http://127.0.0.1:5173) | Main user interface |
| **Backend REST API** | [http://127.0.0.1:10000/api](http://127.0.0.1:10000/api) | Base API endpoint |
| **Interactive Swagger Docs** | [http://127.0.0.1:10000/docs](http://127.0.0.1:10000/docs) | OpenAPI interactive documentation |
| **ReDoc API Documentation** | [http://127.0.0.1:10000/redoc](http://127.0.0.1:10000/redoc) | Alternative formatted API reference |
| **API Health & Readiness** | [http://127.0.0.1:10000/api/health](http://127.0.0.1:10000/api/health) | Liveness & readiness probes |

---

## 🔒 Security, RBAC & Governance

Lakshya AI enforces zero-trust architectural principles across the entire application:

1. **3-Tier Role-Based Access Control (RBAC)**:
   - `user`: Standard candidate access. Queries strictly enforce ownership (`WHERE user_id = current_user.id`), preventing Insecure Direct Object References (IDOR).
   - `admin`: Support & moderation access. User directory search, User 360° telemetry inspection, and account suspension controls.
   - `super_admin`: Platform governance access. Role assignments, View-As simulation, and 37-table database explorer access.

2. **View-As Simulation & Global Mutation Blocker**:
   - Super Admins can simulate any candidate account without logging out or overriding security tokens.
   - Any request carrying an `X-Simulation-Token` is strictly blocked by backend middleware from executing any write action (`POST`, `PUT`, `PATCH`, `DELETE`), preventing accidental state tampering.

3. **Append-Only Immutable Audit Trail**:
   - Privileged operations compute before/after JSON diffs.
   - Administrative mutations and audit log insertions are committed atomically.
   - Deletion of records in `admin_audit_logs` is explicitly rejected at the ORM and database layers.

4. **Client-Side Cache & Session Isolation**:
   - React Query cache entries are prefixed with candidate IDs (`queryKeys.resumes.list(user.id)`).
   - Local storage keys are namespaced per user (`lakshya:${userId}:${key}`).
   - Logout events instantly flush all in-memory and local client caches.

---

## 📁 Project Directory Structure

```text
lakshya-ai-career-platform/
├── .github/                      # CI/CD GitHub Actions workflows
├── dist/                         # Compiled production frontend bundle
├── docs/                         # Engineering documentation & architecture guides
│   ├── ARCHITECTURE.md           # System architecture, RBAC & AI pipelines
│   ├── DATABASE.md               # 37 database models, ER diagram & field masking
│   ├── API.md                    # REST API documentation & Swagger details
│   ├── DEPLOYMENT.md             # Docker setup, health checks & SLO targets
│   └── SECURITY_RUNBOOK.md       # Security policies & audit protocols
├── e2e/                          # Playwright end-to-end test suites
├── load-tests/                   # Performance & stress benchmark scripts
├── lakshyaai-backend/            # Python FastAPI Backend
│   ├── app/
│   │   ├── api/                  # API route handlers (auth, resumes, interview, copilot, admin)
│   │   ├── core/                 # Config, security, permissions, rate limiting middleware
│   │   ├── db/                   # SQLAlchemy models (37 tables), Pydantic schemas, database engine
│   │   ├── services/             # Admin, AI, Resume, Analytics, and Health services
│   │   └── main.py               # FastAPI entrypoint, middleware, and CORS configuration
│   ├── tests/                    # 88 automated backend test suites
│   ├── requirements.txt          # Python backend package dependencies
│   └── .env                      # Backend environment variables
├── src/                          # React + TypeScript Frontend Application
│   ├── components/               # Radix/Shadcn UI component library
│   ├── context/                  # AuthContext, ApplicationContext, NotificationContext
│   ├── lib/                      # User-scoped queryKeys and namespaced userStorage
│   ├── pages/                    # 28 application pages (Dashboard, Resume, Mock Interview, Admin)
│   ├── services/                 # Axios client instance and API endpoint services
│   ├── test/                     # Vitest frontend unit tests
│   ├── App.tsx                   # Central router & protected route wrappers
│   └── main.tsx                  # React DOM mount point
├── run-all.ps1                   # Single-command launch script (PowerShell)
├── run-all.bat                   # Single-command launch script (CMD)
├── Dockerfile                    # Containerization build recipe
├── docker-compose.prod.yml       # Production container orchestration
├── package.json                  # Frontend scripts and NPM dependencies
├── tailwind.config.ts            # TailwindCSS design token configurations
├── tsconfig.json                 # TypeScript compiler options
└── vite.config.ts                # Vite dev server proxy & Rollup build config
```

---

## 🧪 Testing & Quality Verification

| Test Suite | Execution Command | Scope / Coverage | Status |
| :--- | :--- | :--- | :---: |
| **Backend Unit & Security** | `cd lakshyaai-backend && .\.venv\Scripts\python.exe -m unittest discover -s tests` | 88 tests covering RBAC, simulation mutation blocks, audit immutability, and API flows | **88 / 88 Passed** |
| **Frontend Unit Tests** | `npm run test` | 40 Vitest tests for cache isolation, session synchronization, and UI states | **40 / 40 Passed** |
| **TypeScript Validation** | `npx tsc --noEmit` | Strict static type checks across all frontend modules | **0 Errors** |
| **Production Build** | `npm run build` | Vite + Rollup optimized production compilation with chunk splitting | **Success** |
| **E2E Browser Tests** | `npx playwright test` | End-to-end browser user flows (Auth, Resume ATS, Kanban, Admin) | **Configured** |

---

## 📚 Engineering Documentation

Detailed technical documentation is available in the [`docs/`](./docs) directory:

- [System Architecture Guide](./docs/ARCHITECTURE.md) — Comprehensive technical overview, component topology, and data flows.
- [Database Schema & Models](./docs/DATABASE.md) — Documentation for 37 SQLAlchemy database models, relationships, and masking rules.
- [API Reference Guide](./docs/API.md) — Complete REST API endpoint reference, request/response formats, and authentication headers.
- [Deployment & Operations Guide](./docs/DEPLOYMENT.md) — Docker deployment, health monitoring, backup procedures, and SLO verification.
- [Security Runbook](./docs/SECURITY_RUNBOOK.md) — Incident response, RBAC enforcement, and vulnerability mitigation protocols.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for complete details.

---

<p align="center">
  <b>Lakshya AI</b> — Built with ❤️ for modern job seekers, career coaches, and talent platforms.
</p>
