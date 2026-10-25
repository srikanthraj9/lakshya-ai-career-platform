# Lakshya AI — Integration and Regression Test Report

**Execution Date:** October 23, 2026  
**Auditor:** QA Automation Lead  

---

## 1. Summary of Executed Test Suites

| Suite Name | Target Layer | Executed Command | Tests Ran | Passed | Failed | Skipped | Duration |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Frontend Vitest** | UI & Components | `npm run test` | 79 | 79 | 0 | 0 | 81.13s |
| **TypeScript Compiler** | Static Analysis | `npx tsc --noEmit` | N/A | Pass (0 err) | 0 | 0 | 12.4s |
| **Production Build** | Asset Bundling | `npm run build` | 3313 mods | Pass | 0 | 0 | 39.72s |
| **Backend Unittest Discovery** | Full Backend API | `python -m unittest discover` | 151 | 150 | 0 | 1 | 122.95s |
| **Copilot & General Chat** | AI Service & Mode | `python -m unittest tests.test_copilot_service` | 11 | 11 | 0 | 0 | 0.88s |
| **Roadmap Integration** | Roadmap & Alias API | `python -m unittest tests.test_roadmap_integration` | 3 | 3 | 0 | 0 | 3.62s |
| **Database Resilience** | Timeout & Scrubbing | `python -m unittest tests.test_database_resilience` | 4 | 4 | 0 | 0 | 2.02s |
| **Health & Readiness** | System Probes | `python -m unittest tests.security.test_health_probes` | 6 | 6 | 0 | 0 | 0.03s |
| **Groq Live Smoke** | Real Provider API | `python -m unittest tests.test_groq_live_smoke` | 1 | 1 | 0 | 0 | 0.83s |
| **Security Remediations** | RBAC, Sim Block | `python -m unittest tests.security.test_simulation_global_block` | 6 | 6 | 0 | 0 | 1.15s |

---

## 2. Detailed Findings by Layer

### Layer A: Static & Build Checks
* TypeScript compilation passed with zero errors across all components, hooks, services, and route definitions.
* Production build emitted valid chunks in `dist/assets/`, including separate lazy-loaded chunks for `CopilotPage`, `ChatbotPage`, `RoadmapPage`, `JobsPage`, and `InterviewStudioPage`.

### Layer B: Frontend Component Tests (Vitest)
* 24 test files executed with 100% pass rate.
* Tested: Authentication context, session restoration, career metrics, telemetry event sanitization, multi-user isolation, application tracking, responsive viewport scaling, and admin feature flag isolation.

### Layer C & D: Backend API Integration Tests
* 151 tests discovered across `lakshyaai-backend/tests/`.
* 150 tests passed; 1 test skipped (`test_host_weasyprint_pdf_generation`, which is an opt-in host check requiring system-level pango/cairo binaries).
* Validated: Account suspension enforcement, role escalation defense, simulation global mutation blocks (POST/PUT/PATCH/DELETE rejected with HTTP 403), and sanitization of database credentials in log output.

### Layer E: Real AI Provider Integration (Groq)
* Executed live test against `https://api.groq.com/openai/v1/chat/completions`.
* Primary model `llama-3.3-70b-versatile` returned tier-restricted 404.
* Automatic fallback to `openai/gpt-oss-120b` executed seamlessly in 834.9ms.
* Validated structured roadmap step generation and multi-turn chat completions.

### Layer F: Live Render Deployment Probing
* Frontend `https://lakshya-ai.onrender.com`: HTTP 200 OK (523.5ms). Zero leaked credentials.
* Backend `https://lakshya-ai-career-platform.onrender.com`: Read operation timed out (>10s). The container is currently hung or failing Render's startup probe. Operator redeploy required to run current hardened codebase.
