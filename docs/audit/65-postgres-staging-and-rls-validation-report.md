# Lakshya AI — PostgreSQL Staging, Schema & Row-Level Security (RLS) Validation Report

**Document ID:** `docs/audit/65-postgres-staging-and-rls-validation-report.md`  
**Date:** 2026-10-28  
**Scope:** PostgreSQL Dialect Review, Migration Verification, Schema Integrity, Row-Level Security (RLS), Rollback Readiness, and Staging Infrastructure  
**Target Platform:** `lakshya-ai-career-platform`  
**Evaluation Status:** SCHEMA & RLS VERIFIED — AWAITING STAGING DB PROVISIONING

---

## 1. Executive Summary

This report establishes the technical validation for database schema additions, Alembic migration integrity, Row-Level Security (RLS) policies, and rollback readiness for the **Resume Intelligence Studio** initiative (Phases 2 through 6).

The schema changes introduce persistent storage for multi-mode ATS assessments, dimension breakdowns, character-offset grounded skill evidence, and resume version lineage. All migration code supports both SQLite (for rapid local developer workflows and automated testing) and PostgreSQL with Supabase RLS (for staging and production).

---

## 2. Infrastructure Discovery & Staging Status

### Local Environment Inspection
- **Container Runtime:** `docker` and `podman` cmdlets were inspected. No container daemon is installed on the host.
- **Local PostgreSQL Service:** `psql`, `pg_ctl`, and Windows Service registry (`Get-Service -Name *postgres*`) were inspected. No PostgreSQL service or binary is installed on the local system.
- **Staging Database Configuration:** The platform maintains a staging configuration template in [`.env.staging.example`](file:///C:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/.env.staging.example):
  ```ini
  ENVIRONMENT=staging
  DATABASE_URL=postgresql://staging_user:staging_secure_password@staging-db.internal:5432/lakshyaai_staging
  ```
- **Live Production Database Isolation:** In accordance with non-negotiable safety rules, the production Supabase database was **never modified, connected to, or migrated**.

### Staging Prerequisite
An isolated staging PostgreSQL 15+ database with the `pgvector` extension must be provisioned by the operations team to execute live staging deployment.

---

## 3. Migration Chain & Reversibility Review

### Migration Revisions
The migration history in [`lakshyaai-backend/alembic/versions/`](file:///C:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/alembic/versions/) forms an unbroken, linear chain:

```text
<base>
  │
  ▼
5d3cf4891899 (initial_schema)
  │
  ▼
c8b9d0e1f2a3 (supabase_rls_security_remediation)
  │
  ▼
d9e0f1a2b3c4 (add_ai_request_telemetry)
  │
  ▼
e1f2a3b4c5d6 (head, add_ats_intelligence_and_assessments)
```

### Forward Migration: `e1f2a3b4c5d6`
1. **Resumes Version Lineage (Batch Alter):**
   - `parent_resume_id`: `UUID`, nullable, foreign key references `resumes.id` (`ON DELETE SET NULL`).
   - `version_number`: `Integer`, `server_default='1'`, non-nullable.
   - `version_label`: `String(100)`, nullable.
   - `base_quality_score`: `Float`, nullable.
   - Index: `ix_resumes_parent_resume_id`.
2. **Resume Skills Provenance (Batch Alter):**
   - `is_inferred`: `Boolean`, `server_default='false'`, non-nullable.
   - `extraction_source`: `String(50)`, `server_default='direct'`, non-nullable.
3. **Resume Analyses (New Table):**
   - Columns: `id` (PK, UUID), `resume_id` (FK -> `resumes.id`, cascade), `user_id` (FK -> `users.id`, cascade), `scoring_mode` (`base_quality` or `job_match`), `target_role_id`, `target_role_title`, `target_job_description`, `overall_score`, `match_verdict`, `algorithm_version`, `model_metadata` (JSON), `execution_duration_ms`, `created_at`.
   - Indexes: `ix_resume_analyses_resume_id`, `ix_resume_analyses_user_id`, `ix_resume_analyses_scoring_mode`, `ix_resume_analyses_created_at`.
4. **Resume Analysis Dimensions (New Table):**
   - Columns: `id` (PK, UUID), `analysis_id` (FK -> `resume_analyses.id`, cascade), `dimension_key`, `raw_score`, `weighted_score`, `weight_factor`, `evaluation_status`, `diagnostic_notes`.
   - Indexes: `ix_resume_analysis_dimensions_analysis_id`, `ix_resume_analysis_dimensions_dimension_key`.
5. **Resume Skill Evidence (New Table):**
   - Columns: `id` (PK, UUID), `resume_id` (FK -> `resumes.id`, cascade), `skill_name`, `excerpt_text`, `section_name`, `start_char_offset`, `end_char_offset`, `extraction_source`, `confidence`, `is_inferred`, `created_at`.
   - Indexes: `ix_resume_skill_evidence_resume_id`, `ix_resume_skill_evidence_skill_name`.

### Rollback / Downgrade Validation
Downgrade logic drops all added policies, drops tables in strict reverse-dependency order (`resume_skill_evidence` $\rightarrow$ `resume_analysis_dimensions` $\rightarrow$ `resume_analyses`), drops foreign keys and indexes, and restores `resumes` and `resume_skills` to their pre-migration state.

Tested via [`tests/test_migration_integrity.py`](file:///C:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/tests/test_migration_integrity.py):
- Upgrade: `d9e0f1a2b3c4` $\rightarrow$ `e1f2a3b4c5d6` (**SUCCESS**)
- Downgrade: `e1f2a3b4c5d6` $\rightarrow$ `d9e0f1a2b3c4` (**SUCCESS**)
- Re-upgrade: `d9e0f1a2b3c4` $\rightarrow$ `e1f2a3b4c5d6` (**SUCCESS**)

---

## 4. Row-Level Security (RLS) Architecture & Tenant Isolation

For PostgreSQL targets, `e1f2a3b4c5d6` automatically configures Supabase Row-Level Security:

### 1. `resume_analyses`
```sql
ALTER TABLE public.resume_analyses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.resume_analyses FROM anon, authenticated;

CREATE POLICY resume_analyses_tenant_isolation ON public.resume_analyses
    FOR ALL TO authenticated
    USING (user_id IS NOT NULL AND auth.uid() = user_id)
    WITH CHECK (user_id IS NOT NULL AND auth.uid() = user_id);
```

### 2. `resume_analysis_dimensions`
```sql
ALTER TABLE public.resume_analysis_dimensions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.resume_analysis_dimensions FROM anon, authenticated;

CREATE POLICY dimensions_tenant_isolation ON public.resume_analysis_dimensions
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.resume_analyses a
        WHERE a.id = resume_analysis_dimensions.analysis_id
          AND a.user_id = auth.uid()
    ));
```

### 3. `resume_skill_evidence`
```sql
ALTER TABLE public.resume_skill_evidence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.resume_skill_evidence FROM anon, authenticated;

CREATE POLICY evidence_tenant_isolation ON public.resume_skill_evidence
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.resumes r
        WHERE r.id = resume_skill_evidence.resume_id
          AND r.user_id = auth.uid()
    ));
```

### Application-Level Authorization Defense-in-Depth
In addition to database RLS policies, the FastAPI backend enforces strict tenant isolation in Python:
- All `/api/resumes/*` endpoints verify `resume.user_id == current_user.id`.
- Attempts to query another user's assessment ID return `HTTP 404 Not Found` or `HTTP 403 Forbidden`.
- Client-supplied user IDs in request bodies are ignored in favor of authenticated JWT claims (`current_user.id`).

> [!IMPORTANT]
> **Validation Status Distinction:**
> - **Isolated Architecture & Migration Tests:** **PASSED** (Schema, foreign keys, batch alteration, and RLS policy definitions verified in `test_migration_integrity.py` and `test_supabase_rls_architecture.py`).
> - **Application-Level Authorization:** **PASSED** (FastAPI backend strictly enforces tenant isolation and ownership checks across all endpoints).
> - **Actual PostgreSQL Database-Level RLS Execution:** **REMAINS UNTESTED** (Awaiting provisioning of an isolated PostgreSQL 15+ database instance to test multi-role query denial at the PostgreSQL kernel level).

---

## 5. Fail-Closed Database Guards

Two independent safeguards prevent accidental production mutations:

1. **`app/db/database.py` Guard:**
   - Detects test contexts (`TESTING=true`, `PYTEST_CURRENT_TEST`, unittest runner) and forces `test_isolated.db`.
   - When `ENVIRONMENT=staging`, explicitly prohibits connection strings resolving to production Supabase or unconfigured defaults.
2. **`alembic/env.py` Guard:**
   - Detects remote hosts, `supabase.com`, and `pooler.supabase`.
   - Refuses migration execution unless explicit confirmation flags (`CONFIRM_STAGING_MIGRATION` or `CONFIRM_PROD_MIGRATION`) are provided.

---

## 6. Staging Execution Instructions for Operations

Once an isolated PostgreSQL staging database is provisioned:

```bash
# 1. Populate .env.staging
DATABASE_URL=postgresql://staging_user:password@staging-host:5432/lakshyaai_staging
ENVIRONMENT=staging
CONFIRM_STAGING_MIGRATION=true

# 2. Apply migration to staging
cd lakshyaai-backend
.venv\Scripts\alembic -c alembic.ini upgrade head

# 3. Verify current revision
.venv\Scripts\alembic -c alembic.ini current

# 4. Run automated E2E browser smoke tests against staging
.venv\Scripts\python tests/e2e_browser_test.py
```

For complete staging deployment blueprints, regression test metrics, and production release plans, see [`docs/audit/66-staging-deployment-and-production-readiness-report.md`](file:///C:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/docs/audit/66-staging-deployment-and-production-readiness-report.md).
