# Lakshya AI — Project Stabilization and Cleanup Audit Report

**Date:** 2026-10-15  
**Version:** 1.0  
**Status:** Audit Complete — Pre-cleanup Baseline  
**Target:** Safe Stabilization and Removal of Confirmed Unnecessary Code

---

## 1. Executive Summary

This report establishes the complete architectural audit and inventory for stabilizing the **Lakshya AI Career Platform**. The project has reached its current feature stage; further development is halted in favor of stabilization, removal of verified dead code and duplicate implementations, cleaning unnecessary configuration and git tracking artifacts, and eliminating sensitive logging.

The audit was executed with zero speculative changes. All items have been cross-checked across:
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Lucide icons, 28 router pages, 22 service modules.
- **Backend:** FastAPI, SQLAlchemy 2.0, Pydantic, PostgreSQL/pgvector, Auth/RBAC, 20 router modules, 19 services.
- **Infrastructure & Deployment:** Multi-stage Dockerfile, Nginx reverse proxy, Render deployment configuration, GitHub Actions workflows.
- **Tests & Quality Assurance:** Frontend Vitest suite (75 tests passing across 23 files), Backend pytest security & isolated suite (14 tests passing).

---

## 2. Architecture & Module Purpose Mapping

| Module / Layer | Primary Purpose | Runtime Dependencies | Audit Status |
| :--- | :--- | :--- | :--- |
| `src/pages/` (28 active pages) | Route endpoints for Career Copilot, Resume Studio, Mock Interview, Job Tracker, Roadmap, Admin Explorer, Auth flows. | React Router DOM, TanStack Query, Radix UI | 28 active pages verified; 1 redundant stub (`ResumeDetailPage.tsx`) identified. |
| `src/services/` (22 services) | Client-side API facades for backend endpoints, localStorage token persistence, interceptors. | Axios, `@/services/api` | All 22 services actively imported and invoked by components/pages. |
| `src/components/ui/` (49 shadcn components) | Base UI primitive library built on Radix UI. | `@radix-ui/*`, `clsx`, `tailwind-merge` | 21 components actively used; 28 unimported primitives identified. |
| `src/components/system/` | System fallbacks & loaders | Redundant duplication of root `src/components/` | 4 unimported duplicates identified. |
| `lakshyaai-backend/app/api/routes/` | 20 FastAPI REST routers exposing auth, resumes, interviews, copilot, intelligence, admin. | FastAPI, SQLAlchemy session, Pydantic schemas | All 20 routes registered in `app/api/router.py`. |
| `lakshyaai-backend/app/services/` | Core business logic: ATS scoring, LLM streaming, career intelligence, audit logging, RBAC. | OpenRouter / Gemini API, SQLAlchemy models | All services active. Debug print statements identified for removal. |
| `lakshyaai-backend/scripts/` | Database backup, restore, and environment validation CLI utilities. | `app.core.config`, `subprocess` | Required for operational disaster recovery and tested by `test_disaster_recovery.py`. |
| Root & Deployment | Dockerfile (frontend + backend), Nginx proxy config, Render web service config, CI workflows. | Docker, Nginx, Node.js, Python 3.12 | Verified compatible with production reverse proxy routing. |

---

## 3. Classification of Findings

Findings are strictly classified into three categories:
1. **Safe to Remove:** Confirmed unnecessary, unimported, zero runtime calls, redundant lockfiles, or git index cache bloat.
2. **Needs Verification:** Potentially unused, but could be dynamic, template-driven, or part of upcoming UI expansions.
3. **Must Preserve:** Required for runtime functionality, security, test suites, deployment, or database integrity.

---

### Category A: Safe to Remove (Confirmed Unnecessary)

#### 1. Dead & Redundant Frontend Source Files
- **`src/pages/ResumeDetailPage.tsx`**:
  - *Proof:* Contains only `export { default } from "./ResumeViewPage";`. `src/App.tsx` routes directly to `ResumeViewPage` at `/resumes/:id`. Zero imports across the entire repository.
- **`src/components/system/` (4 files)**:
  - `src/components/system/AppErrorBoundary.tsx`: Duplicate of `src/components/ErrorBoundary.tsx`. 0 usages.
  - `src/components/system/ErrorState.tsx`: 0 usages across codebase.
  - `src/components/system/LoadingState.tsx`: 0 usages across codebase.
  - `src/components/system/PageLoader.tsx`: Duplicate of `src/components/PageLoader.tsx`. 0 usages.
- **`src/components/NavLink.tsx`**:
  - *Proof:* Custom wrapper around `react-router-dom` `NavLink`. Zero imports across all components and pages (all navigation uses standard `Link` or `NavLink`).
- **`src/components/shared/PageHeader.tsx`**:
  - *Proof:* Shared page header component with zero imports. All 28 pages implement semantic in-page headers or dashboard shells.
- **`src/components/resume/ResumeReferenceList.tsx`**:
  - *Proof:* Zero imports in `src/` (resume views use `ResumeViewPage` and subcomponents directly).

#### 2. Dead Backend Utilities
- **`lakshyaai-backend/app/utils/file_utils.py`**:
  - *Proof:* 0 bytes empty file. Not imported anywhere. File storage logic is handled in `app/services/storage/file_storage.py`.
- **`lakshyaai-backend/app/utils/text_utils.py`**:
  - *Proof:* 0 bytes empty file. Not imported anywhere. Text extraction is handled in `app/services/resume/text_extractor.py`.

#### 3. Redundant Lockfiles
- **`bun.lock` (167 KB)** and **`bun.lockb` (245 KB)**:
  - *Proof:* Project is an `npm` workspace. `Dockerfile` uses `RUN npm ci`, CI runs `npm ci`, and `package-lock.json` is maintained. Bun lockfiles are obsolete artifacts.

#### 4. Git Index Tracking Bloat (Repository Hygiene)
- **`lakshyaai-backend/venv/` (7,903 tracked files)**:
  - *Proof:* Virtual environment files were mistakenly staged/tracked into git history, despite `venv/` being in `.gitignore`. Untracking from git index (`git rm -r --cached`) reduces git repository bloat without deleting the developer's local virtualenv.
- **`lakshyaai-backend/**/__pycache__/*.pyc` (6,559 tracked files)**:
  - *Proof:* Compiled Python bytecode was tracked into git. Every test run touches `.pyc` files, causing 100+ git dirty modifications. Untracking from git index allows `.gitignore` (`*.pyc`, `__pycache__/`) to work properly.

#### 5. Debugging Statements & Sensitive Logging
- **`src/services/auth.ts` lines 9 & 22**:
  - `console.log("Register response:", res.data)` and `console.log("Login response:", res.data)` print JWT access tokens and user profile objects to the browser console. Must be removed for security and log cleanliness.
- **`lakshyaai-backend/app/services/copilot/chat_service.py` line 27**:
  - `print(f"[Copilot] OPENROUTER_API_KEY loaded: ... preview: {key_preview}")` prints API key fragments to standard output.
- **`lakshyaai-backend/app/services/resume/embedding_engine.py` lines 19-20**:
  - `print("Embedding array shape: ...")` and `print("Embedding array values: ...")` leak debug vectors to stdout.
- **`lakshyaai-backend/app/services/role/career_intelligence_engine.py` lines 62-63**:
  - `print("Array shape: ...")` stdout print.

#### 6. Requirements Encoding
- **`lakshyaai-backend/requirements.txt`**:
  - *Proof:* Currently encoded in UTF-16LE with BOM (generated via PowerShell `pip freeze > requirements.txt`). Fails on standard Linux build environments. Must be re-saved as standard UTF-8 without BOM.

---

### Category B: Needs Verification (Preserve for Stability)

#### 1. Unused Shadcn UI Component Primitives
- 28 primitive components in `src/components/ui/` (e.g., `accordion.tsx`, `calendar.tsx`, `command.tsx`, `dialog.tsx`, `drawer.tsx`, `menubar.tsx`, `popover.tsx`, etc.) are part of the standard Shadcn UI design system.
- *Assessment:* While unimported today, removing Shadcn primitives creates high risk of breaking if dynamic UI widgets or modular dialogs are added or if shared types are imported. **Recommendation:** Preserve in place. They have zero runtime cost if unimported (tree-shaken by Vite during bundle build).

#### 2. Dependencies in `package.json`
- `date-fns`, `@hookform/resolvers`, `zod`:
  - *Assessment:* Although not explicitly imported in active `src/` modules, removing them from `package.json` can trigger breaking package resolution changes in `package-lock.json`. **Recommendation:** Leave dependencies intact in `package.json` during stabilization to prevent dependency drift.

---

### Category C: Must Preserve (Do Not Touch)

1. **All 28 Routed Pages:**
   - `AdminAnalyticsPage.tsx`, `AdminAuditsPage.tsx`, `AdminCandidateExplorerPage.tsx`, `AdminDatabasePage.tsx`, `AdminLogsPage.tsx`, `AdminSettingsPage.tsx`, `AdminUsersPage.tsx`, `ApplicationTrackerPage.tsx`, `CareerCopilotPage.tsx`, `CareerIntelligencePage.tsx`, `DashboardPage.tsx`, `ForgotPasswordPage.tsx`, `InterviewRoomPage.tsx`, `InterviewSetupPage.tsx`, `LandingPage.tsx`, `LoginPage.tsx`, `OnboardingPage.tsx`, `ProfilePage.tsx`, `RegisterPage.tsx`, `ResetPasswordPage.tsx`, `ResumeAnalyzePage.tsx`, `ResumeMatchPage.tsx`, `ResumeRewritePage.tsx`, `ResumeStudioPage.tsx`, `ResumeViewPage.tsx`, `RoadmapPage.tsx`, `SkillsGapPage.tsx`, `VerifyEmailPage.tsx`.
2. **All 22 Frontend Service Modules:**
   - Active API client abstraction layer in `src/services/`.
3. **All 20 Backend Route Controllers:**
   - `activity.py`, `admin.py`, `applications.py`, `auth.py`, `copilot.py`, `feedback.py`, `health.py`, `intelligence.py`, `interview.py`, `notifications.py`, `onboarding.py`, `portfolio.py`, `recommendations.py`, `resume.py`, `roadmap.py`, `role.py`, `simulation.py`, `system.py`, `users.py`, `voice.py`.
4. **All Database Models & Migrations:**
   - SQLAlchemy declarative models in `app/db/models.py`. Zero schema changes or table deletions.
5. **Operational Scripts:**
   - `backup_database.py`, `restore_database.py`, `validate_environment.py`.
6. **Docker and CI/CD:**
   - `Dockerfile`, `nginx.conf`, `.github/workflows/`, and `render.yaml`.
7. **User Changes & README:**
   - Preserve all user documentation and existing commits.

---

## 4. Planned Safe Execution Steps

1. **Delete Confirmed Dead Files:**
   - `src/pages/ResumeDetailPage.tsx`
   - `src/components/system/` (4 files)
   - `src/components/NavLink.tsx`
   - `src/components/shared/PageHeader.tsx`
   - `src/components/resume/ResumeReferenceList.tsx`
   - `lakshyaai-backend/app/utils/file_utils.py`
   - `lakshyaai-backend/app/utils/text_utils.py`
   - `bun.lock`, `bun.lockb`
2. **Git Index Hygiene:**
   - Untrack `lakshyaai-backend/venv/` and `__pycache__` from git index cache.
3. **Encoding Fix:**
   - Re-encode `lakshyaai-backend/requirements.txt` to UTF-8 without BOM.
4. **Clean Debug Logging:**
   - Remove token console logs in `src/services/auth.ts`.
   - Remove stdout debug prints in `chat_service.py`, `embedding_engine.py`, `career_intelligence_engine.py`.
5. **Verification & Testing (Phase 4):**
   - TypeScript compilation check (`npx tsc --noEmit`).
   - Frontend test suite execution (`npx vitest run`).
   - Frontend production build (`npm run build`).
   - Backend test suite execution (`pytest`).
6. **Compile Final Report (Phase 5).**
