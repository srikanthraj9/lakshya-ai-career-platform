# Lakshya AI — Master Next Phase Development Plan

**Document Version:** 1.0.0  
**Audit Date:** 2026-10-23  
**Status:** Recommended Engineering Implementation Roadmap  
**Classification:** Strategic Development Roadmap  

---

## 1. Development Principles & Phasing Strategy

To ensure platform stability, enterprise security, and authentic AI intelligence, future engineering work should strictly follow this risk-ordered progression:
1. **Tier 1: Security, Credential Hygiene, & Data Integrity (P0)** — Mitigate credential exposure, implement RLS, eliminate synthetic score fabrication.
2. **Tier 2: Infrastructure & Database Validation (P0/P1)** — Test migrations against staging PostgreSQL, add pgvector HNSW indexes, verify Docker builds.
3. **Tier 3: Core Application Workflows & Bug Fixes (P1)** — Fix interview submission race condition, persist voice interview sessions, fix backend test SQLite harness.
4. **Tier 4: Genuine AI Intelligence & LLM Grounding (P1)** — Replace static dictionaries and heuristics with real, context-aware LLM prompts, structured JSON schemas, and safe fallbacks.
5. **Tier 5: Frontend Quality, Linting, & Reliability (P2)** — Resolve 65 ESLint errors, clean up legacy fallback constants, optimize async HTTP I/O.

---

## 2. Phase-by-Phase Execution Roadmap

### Phase 1: Security Invalidation & History Scrubbing (Week 1)
- **Goal:** Eliminate historical credential leakage and protect database tenant boundaries.
- **Milestones:**
  1. **Manual Secret Rotation (`SEC-01`):** Operator rotates Supabase database password, Google OAuth 2.0 client secrets, and Gmail SMTP application passwords in their respective provider dashboards.
  2. **Git Packfile Scrubbing (`SEC-01`):** Execute coordinated `git-filter-repo` protocol outlined in `docs/SECURITY_RUNBOOK.md` to purge `.env` files from repository history.
  3. **Row-Level Security (`SEC-03`):** Author an Alembic migration enabling PostgreSQL RLS on all 37 database tables, restricting queries to `auth.uid() == user_id`.
  4. **Data Integrity Cleanup (`DATA-04`):** Refactor `CareerIntelligenceService.get_intelligence()` to return `None` for unmeasured categories rather than injecting fake 78% / 75% defaults.

### Phase 2: Database Staging & Docker Infrastructure (Week 2)
- **Goal:** Validate migration execution, enable vector indexing, and verify containerized compilation.
- **Milestones:**
  1. **Staging Database Provisioning (`DATA-01`):** Stand up a dedicated PostgreSQL 15+ staging instance with the `vector` extension enabled.
  2. **Live Alembic Upgrade:** Execute `alembic upgrade head` against staging PostgreSQL, verifying clean creation of all 37 platform tables.
  3. **PgVector HNSW Indexes (`DATA-02`):** Author and apply migration adding HNSW cosine indexes on `ResumeEmbedding` and `RoleEmbedding`.
  4. **Docker & LaTeX Verification (`DEVOPS-01`):** Run Docker build in a CI runner with Docker Engine to verify `pdflatex` compilation and container non-root security.

### Phase 3: Core Workflow Stabilization & Test Harness Repair (Week 3)
- **Goal:** Eliminate runtime race conditions and achieve 100% test pass rate across all suites.
- **Milestones:**
  1. **Interview Answer Locking (`BUG-01`):** Wrap answer submissions in `session_manager.py` with `db.query(models.InterviewSession).with_for_update()` and add question idempotency.
  2. **Voice Interview Persistence (`FE-01`):** Connect `VoiceInterviewSession.tsx` to backend voice and interview endpoints, persisting spoken transcripts and evaluations to `models.InterviewAnswer`.
  3. **Backend Test Harness Fix:** Update `TestSimulationGlobalMutationBlock.setUpClass` in `tests/security/test_simulation_global_block.py` to ensure SQLite tables are created before session creation, restoring 100% backend unittest pass rate (69/69).

### Phase 4: Genuine AI Service Integrations (Week 4)
- **Goal:** Transform hardcoded dictionaries and heuristics into authentic, context-aware AI evaluations.
- **Milestones:**
  1. **STAR Rubric Interview Evaluator (`AI-01`):** Replace word-count heuristic in `evaluation_engine.py` with an LLM prompt decomposing answers into Situation, Task, Action, and Result with Pydantic JSON schema validation.
  2. **Context-Grounded Question Generator (`AI-02`):** Replace 9-question bank in `question_generator.py` with dynamic generation grounded in candidate resume skills and target role requirements.
  3. **Dynamic Personalized Roadmaps (`AI-03`):** Replace 2-role static dictionary in `roadmap_engine.py` with personalized roadmap synthesis targeting candidate-specific skill gaps.
  4. **Copilot Context Injection (`AI-04`):** Integrate `CopilotContextEngine.build_profile()` into `CareerCopilotService` system prompt, providing candidate background awareness.
  5. **Eliminate SHA-256 Vector Fallback (`AI-05`):** Remove silent SHA-256 token hashing in `embedding_engine.py`; flag uncalibrated vectors explicitly.

### Phase 5: Frontend Quality, Async Performance, & Telemetry (Week 5)
- **Goal:** Eliminate lint failures, non-blocking network I/O, and polish user experience.
- **Milestones:**
  1. **ESLint Cleanup (`FE-02`):** Fix 65 problems (49 errors, 16 warnings), replacing `any` types, adding proper error handling to empty blocks, and separating component exports.
  2. **Async HTTP Migration (`PERF-01`):** Replace synchronous `requests.post()` in `client.py` and `chat_service.py` with `httpx.AsyncClient` with connection pooling and timeouts.
  3. **Python 3.12 UTC Modernization (`DEP-01`):** Replace deprecated `datetime.utcnow()` with timezone-aware `datetime.now(timezone.utc)` across all backend modules.
  4. **Log Data Masking (`LOG-01`):** Replace raw `print()` statements in Copilot service with structured `logger.debug()` calls that mask candidate personal data.

---

## 3. Risk Assessment & Mitigation Matrix

| Identified Risk | Severity | Likelihood | Impact on System | Recommended Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| **Accidental Production DB Mutation** | Critical | Low | Schema loss or table locking on Supabase pooler | Retain hardened `_assert_migration_safety` in `alembic/env.py` distinguishing staging from remote production; require `CONFIRM_PROD_MIGRATION=true` |
| **Git Force-Push Divergence** | High | Medium | Team branch synchronization conflicts | Coordinated maintenance window; provide clean clone instructions |
| **External LLM Latency & Outages** | High | High | Slow interview evaluation or copilot timeout | Centralized `GroqProvider` with connection pooling, 30s timeout, bounded 429/503 retries, non-retryable 400/401/403, and deterministic fallbacks |
| **Misleading User Interfaces** | High | Medium | Candidates make career decisions based on fake scores | Remove hardcoded defaults; render truthful empty states and onboarding guidance |
| **RLS Query Rejections** | Medium | Medium | Legitimate backend queries rejected | Test RLS policies thoroughly on staging PostgreSQL before enabling on production |
