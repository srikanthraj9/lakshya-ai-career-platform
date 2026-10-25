# Lakshya AI — Initial Integration Audit

**Date:** October 23, 2026  
**Evaluator:** Senior Full-Stack Architect, Backend Engineer, QA Automation Engineer  
**Status:** Baseline Completed  

---

## 1. Repository Architecture Overview

Lakshya AI is structured as a full-stack career acceleration and interview intelligence platform:

* **Frontend:** React 18 SPA built with Vite, TypeScript, Tailwind CSS, Radix UI, TanStack Query, and React Router v6.
* **Backend:** FastAPI application running on Python 3.12, Uvicorn, and SQLAlchemy 2 ORM.
* **Database & Persistence:** Supabase PostgreSQL with `pgvector` vector extension for resume and role embedding search.
* **AI/LLM Provider:** Groq primary text-generation provider with automatic model fallback to OpenRouter/OpenAI.
* **Authentication:** JWT (HS256) bearer token authentication, bcrypt password hashing, and Google OAuth ID-token verification.

---

## 2. Frontend-to-Backend Connection Map

| Frontend Area | Route | Component | Service Module | Backend Endpoint | Method |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Auth** | `/login`, `/register` | `LoginPage`, `RegisterPage` | `services/auth.ts` | `/api/auth/login`, `/api/auth/register` | `POST` |
| **Command Center** | `/dashboard` | `DashboardPage` | `services/activityService.ts` | `/api/activity/dashboard` | `GET` |
| **Career Intelligence**| `/intelligence` | `CareerIntelligencePage` | `services/intelligenceService.ts`| `/api/intelligence/overview` | `GET` |
| **Application Tracker**| `/applications` | `ApplicationTrackerPage`| `services/applicationTrackerService.ts` | `/api/applications/` | `GET`, `POST` |
| **Resume Studio** | `/resume` | `ResumeStudioPage` | `services/resumeService.ts` | `/api/resumes/` | `GET`, `POST` |
| **Role Alignment** | `/roles/analyze` | `RoleAlignmentPage` | `services/roleService.ts` | `/api/roles/analyze` | `POST` |
| **Career Roadmap** | `/roadmap` | `RoadmapPage` | `services/roadmap.ts` | `/api/roadmap/generate` | `POST` |
| **Interview Studio** | `/interview` | `InterviewStudioPage` | `services/interview.ts` | `/api/interview/start`, `/api/interview/next` | `POST` |
| **Voice Interview** | `/interview/voice-ai` | `VoiceInterviewPage` | `services/voiceInterview.ts` | `/api/voice/chat` | `POST` |
| **Job Matches** | `/jobs` | `JobsPage` | `services/jobs.ts`, `services/liveJobs.ts` | `/api/jobs/recommend/{id}`, `/api/jobs/live` | `GET` |
| **Career Copilot** | `/copilot` | `CopilotPage` (`mode="career"`) | `services/copilot.ts` | `/api/copilot/chat` | `POST` |
| **General Chatbot** | `/chat` | `ChatbotPage` (`mode="general"`) | `services/copilot.ts` | `/api/copilot/chat` | `POST` |
| **Profile** | `/profile` | `ProfilePage` | `services/profileService.ts` | `/api/users/profile` | `GET`, `PUT` |

---

## 3. Discovered Integration Defects & Resolution

1. **Roadmap Generation Endpoint Mismatch:**
   - *Defect:* `roadmapService.ts` attempted to call `POST /roles/career-path`. Backend `role.py` only implemented `GET /roles/career-path/{resume_id}` while the genuine generator was `POST /roadmap/generate`.
   - *Fix:* Aligned `roadmapService.generate` to call `/roadmap/generate`. Added backwards-compatible `POST /roles/career-path` alias to `role.py` delegating to `RoadmapEngine.generate`.

2. **Absence of Dedicated General-Purpose Chatbot:**
   - *Defect:* Only Career Copilot existed, forcing all queries into resume advice and career coaching.
   - *Fix:* Added `GENERAL_SYSTEM_PROMPT` and `mode="general"` to `CareerCopilotService`. Updated `CopilotChatRequest` and `copilot.py` to support mode filtering and title tagging (`[General]`), created `ChatbotPage.tsx`, and registered `/chat` route in `App.tsx` and navigation.

3. **Backend Live Service Timeout:**
   - *Defect:* Live backend at `https://lakshya-ai-career-platform.onrender.com` timed out because container lacked non-blocking root `/` and database timeouts stalled container boot.
   - *Fix:* Added instant root `@app.get("/")`, alias `@app.get("/health")`, `connect_timeout=10` on database engine, and guarded startup seeding in `main.py`.

---

## 4. Initial Test Baseline

* **Frontend Unit & Component Tests:** 79/79 passed across 24 test files (Duration: 81.1s).
* **Frontend TypeScript Compilation:** 0 errors (`npx tsc --noEmit`).
* **Backend Unit & Integration Tests:** 150/151 passed (1 opt-in skipped, 0 failures) (Duration: 122.9s).
* **Production Bundle Emission:** Successful build (3313 modules transformed, 39.7s).
