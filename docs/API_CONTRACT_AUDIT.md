# Lakshya AI — Environment and API Contract Audit

**Date:** October 23, 2026  
**Auditor:** DevSecOps & Security Lead  

---

## 1. Sanitized Environment-Variable Matrix

| Variable Name | Component | Required / Optional | Purpose | Configuration Location | Secret Classification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Backend | Required | Main connection to Supabase PostgreSQL | `.env`, Render Secrets | **CONFIDENTIAL (Credentials)** |
| `DIRECT_URL` | Backend | Optional | Direct connection to Supabase DB (session pooler bypass) | `.env`, Render Secrets | **CONFIDENTIAL (Credentials)** |
| `SECRET_KEY` | Backend | Required | HMAC key for JWT signature creation and validation | `.env`, Render Secrets | **CONFIDENTIAL (Secret Key)** |
| `ALGORITHM` | Backend | Optional | JWT signing algorithm (default `HS256`) | `.env` / Default | Public / Standard |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Backend | Optional | Lifetime of bearer tokens (default `60` mins) | `.env` / Default | Public / Config |
| `GROQ_API_KEY` | Backend | Required | Primary LLM generation key | `.env`, Render Secrets | **CONFIDENTIAL (Vendor Key)** |
| `GROQ_MODEL` | Backend | Optional | Configured primary Groq model (`llama-3.3-70b-versatile`) | `.env`, `render.yaml` | Public / Config |
| `OPENROUTER_API_KEY` | Backend | Optional | Fallback LLM provider key | `.env`, Render Secrets | **CONFIDENTIAL (Vendor Key)** |
| `GOOGLE_CLIENT_ID` | Backend | Optional | Google OAuth 2.0 Client ID | `.env`, Render Secrets | Public / OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Backend | Optional | Google OAuth 2.0 Client Secret | `.env`, Render Secrets | **CONFIDENTIAL (OAuth Secret)** |
| `SMTP_HOST` | Backend | Optional | Hostname for SMTP notifications | `.env`, Render Secrets | Public / Network Host |
| `SMTP_PORT` | Backend | Optional | Port for SMTP (default `587`) | `.env`, Render Secrets | Public / Network Port |
| `SMTP_USER` | Backend | Optional | Authenticated email sender | `.env`, Render Secrets | Public / Identifier |
| `SMTP_PASSWORD` | Backend | Optional | App password for SMTP delivery | `.env`, Render Secrets | **CONFIDENTIAL (Password)** |
| `CORS_ORIGINS` | Backend | Required | Whitelisted origins for browser CORS preflight | `.env`, `render.yaml` | Public / Domain List |
| `PORT` | Backend | Required | Port assigned by hosting provider (default `10000`) | Render Env, Default | Public / Runtime Port |
| `VITE_API_BASE_URL` | Frontend | Required | Base URL targeting the backend API | `.env`, `render.yaml` | Public / API Origin |
| `VITE_APP_ENV` | Frontend | Optional | Frontend environment tag (`staging`/`production`) | `.env`, `render.yaml` | Public / Config |

---

## 2. API Contract Inventory & Verification

### Authentication & Core System
* `GET /` -> HTTP 200: Lightweight root online status.
* `GET /api/health` -> HTTP 200: Liveness probe (does not touch DB).
* `GET /api/health/ready` -> HTTP 200 (Healthy DB) / HTTP 503 (Degraded DB).
* `POST /api/auth/register` -> HTTP 200: Rejects privileged roles (`ADMIN`); forces `CANDIDATE`.
* `POST /api/auth/login` -> HTTP 200: Rejects deactivated and suspended accounts (HTTP 403).
* `GET /api/users/me` -> HTTP 200: Returns authenticated user profile; requires valid Bearer token.

### Career Copilot & General Chatbot
* `POST /api/copilot/chat`
  - Input: `{"messages": [{"role": "user", "content": "..."}], "conversation_id": "...", "mode": "career" | "general"}`
  - Output: `{"reply": "...", "conversation_id": "..."}`
  - Verified: In `"career"` mode, candidate context is attached to the prompt. In `"general"` mode, open conversational guidelines are applied.
* `GET /api/copilot/conversations?mode=career|general`
  - Output: List of user conversations filtered by mode. General conversations are tagged with `[General]` title prefix for transparent schema compatibility.

### Career Roadmap
* `POST /api/roadmap/generate` & `POST /api/roles/career-path`
  - Input: `{"target_role": "...", "experience_level": "...", "current_skills": [...]}`
  - Output: `{"roadmap": [{"step": "...", "resources": [...], "duration": "..."}], "track": "...", "is_personalized": true}`
  - Verified: Real-time Groq LLM personalization with automatic model fallback.
* `POST /api/roadmap/progress` & `GET /api/roadmap/progress`
  - Input/Output: Persisted array of completed milestone indices.

### Interviews & Audio Processing
* `POST /api/interview/start` -> Initializes interview session with 5 curated questions.
* `POST /api/interview/next` -> Submits candidate answer, returns immediate feedback and next question.
* `GET /api/interview/report/{session_id}` -> Returns STAR rubric analysis and score breakdown.
* `POST /api/voice/chat` -> Multipart audio upload (`.webm`, `.wav`) transcribed and evaluated.

---

## 3. Secret Exposure Audit

* **Client JavaScript Bundles:** Inspected `dist/assets/*.js`. Zero occurrences of `DATABASE_URL`, `JWT_SECRET`, `GROQ_API_KEY`, or `client_secret`.
* **API Error Payloads:** Inspected exception handlers. Database exceptions are scrubbed with regex `re.sub(r"://([^:]+):([^@]+)@", r"://\1:***@", str(e))` before logging. Zero database credentials returned to client browsers.
