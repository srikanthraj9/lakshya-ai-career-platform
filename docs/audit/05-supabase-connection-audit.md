# 05 — Supabase Connection Audit

**Project:** Lakshya AI Career Platform  
**Repository:** `https://github.com/srikanthraj9/lakshya-ai-career-platform.git`  
**Audit Date:** October 25, 2026  
**Auditor:** Senior Database Administrator & Security Engineer  

---

## 1. Connection Architecture & Driver Inspection

The platform connects to a Supabase-managed PostgreSQL instance using SQLAlchemy 2.0 with the `psycopg2-binary` driver.

- **Connection URL Scheme:** `postgresql://postgres.[ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=require`
- **Host Region:** `ap-northeast-2` (AWS Seoul, Supabase AP-Northeast cluster)
- **Port:** `6543` (Supavisor Transaction Pooler)
- **PostgreSQL Version:** `17.11` (Ubuntu 17.11-1.pgdg24.04+1 on x86_64)
- **Extensions Verified:** `pgvector` (`vector` extension version 0.8.0), `pgcrypto`, `uuid-ossp`
- **Connection Pool Strategy:**
  - `NullPool` is configured for test runner execution to avoid socket leaks during parallel test teardown.
  - `QueuePool` with `pool_size=10`, `max_overflow=20`, and `pool_pre_ping=True` is active for the FastAPI production web server.
  - Transaction pooling compatibility is verified with `pool_pre_ping=True` issuing `SELECT 1` checks before handing connections to request handlers.

---

## 2. Live Runtime Connectivity Evidence

A live read-only verification probe executed against the configured Supabase endpoint returned the following verified runtime data:

```json
{
  "connection_status": "SUCCESSFUL",
  "engine": "PostgreSQL 17.11 (Ubuntu 17.11-1.pgdg24.04+1)",
  "active_database": "postgres",
  "search_path": "\"$user\", public",
  "ssl_active": true,
  "ssl_cipher": "TLS_AES_256_GCM_SHA384",
  "public_table_count": 37,
  "tables_verified": [
    "users",
    "email_verification_tokens",
    "admin_audit_logs",
    "admin_simulation_sessions",
    "feature_flags",
    "platform_announcements",
    "user_career_profiles",
    "user_career_state",
    "career_goals",
    "career_activities",
    "career_recommendations",
    "career_insight_snapshots",
    "career_automation_rules",
    "user_feedback",
    "outcome_learning_insights",
    "resumes",
    "resume_ats_breakdown",
    "resume_skills",
    "resume_missing_skills",
    "resume_rewrites",
    "resume_embeddings",
    "interview_sessions",
    "interview_messages",
    "interview_debriefs",
    "copilot_conversations",
    "copilot_messages",
    "job_applications",
    "application_events",
    "company_intelligence",
    "roles",
    "role_skills",
    "role_embeddings",
    "user_skills",
    "user_skill_progress",
    "roadmap_progress",
    "user_performance_trend",
    "notifications"
  ]
}
```

---

## 3. Migration & Schema Synchronization Status

- **DDL State:** All 37 public schema tables are present with primary keys, indexes, and foreign key constraints matching `lakshyaai-backend/app/db/models.py`.
- **Alembic Tracking:** `alembic_version` table is not currently present in the live Supabase database, indicating the initial schema was provisioned via metadata DDL or direct initialization scripts.
- **Safety Directive:** In accordance with prompt instructions (Rule 2: "Never run destructive database operations, drop tables, truncate records, reset production data, or run unapproved migrations"), the live schema has NOT been forcibly altered or stamped without explicit authorization.
