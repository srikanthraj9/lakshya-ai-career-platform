"""supabase_rls_security_remediation

Revision ID: c8b9d0e1f2a3
Revises: 5d3cf4891899
Create Date: 2026-10-25 13:40:00.000000

Remediates Supabase Database Advisor findings:
1. Enables Row Level Security (RLS) on all 38 public schema tables.
2. Revokes default public/PostgREST grants from 'anon' and 'authenticated' on private user tables.
3. Protects sensitive columns on public.interview_messages.
4. Grants read-only SELECT policies to public reference/catalog tables.
5. Preserves full database privileges for database owner/backend ('postgres', 'service_role').
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8b9d0e1f2a3'
down_revision: Union[str, Sequence[str], None] = '5d3cf4891899'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# 1. User-Owned Private Tables (21 tables)
USER_OWNED_TABLES = [
    "career_activities",
    "career_automation_rules",
    "career_goals",
    "career_insight_snapshots",
    "career_recommendations",
    "copilot_conversations",
    "interview_sessions",
    "job_applications",
    "notifications",
    "outcome_learning_insights",
    "resumes",
    "roadmap_progress",
    "user_career_profiles",
    "user_career_state",
    "user_feedback",
    "user_skill_progress",
    "user_skills",
    "application_events",
    "interview_debriefs",
    "resume_rewrites",
    "user_performance_trend",
]

# 2. Child Tables Linked to Parent Owner (6 tables)
CHILD_TABLES = [
    "copilot_messages",
    "interview_messages",
    "resume_ats_breakdown",
    "resume_embeddings",
    "resume_missing_skills",
    "resume_skills",
]

# 3. Sensitive Auth, Administrative & Internal Tables (7 tables)
# Direct PostgREST access is fully denied (both anon and authenticated).
SENSITIVE_ADMIN_TABLES = [
    "users",
    "email_verification_tokens",
    "admin_audit_logs",
    "admin_simulation_sessions",
    "feature_flags",
    "platform_announcements",
    "role_embeddings",
]

# 4. Authenticated Catalog Tables (1 table)
# Requires authenticated role; anonymous access is strictly blocked.
AUTHENTICATED_CATALOG_TABLES = [
    "company_intelligence",
]

# 5. Public Reference / Catalog Tables (2 tables)
# Public read-only for candidate career exploration.
PUBLIC_CATALOG_TABLES = [
    "roles",
    "role_skills",
]

# Combined catalog list for migration accounting
CATALOG_TABLES = AUTHENTICATED_CATALOG_TABLES + PUBLIC_CATALOG_TABLES


def upgrade() -> None:
    """Apply RLS, least-privilege grants, and access policies."""
    bind = op.get_bind()
    if bind and bind.dialect.name != "postgresql":
        # RLS and grant modifications apply to PostgreSQL/Supabase.
        # SQLite in local testing does not support row-level security DDL.
        return

    # -------------------------------------------------------------------------
    # 1. SECURE USER-OWNED TABLES
    # -------------------------------------------------------------------------
    for tbl in USER_OWNED_TABLES:
        op.execute(sa.text(f"ALTER TABLE public.{tbl} ENABLE ROW LEVEL SECURITY;"))
        op.execute(sa.text(f"REVOKE ALL ON TABLE public.{tbl} FROM anon, authenticated;"))
        op.execute(sa.text(f"GRANT ALL ON TABLE public.{tbl} TO postgres, service_role;"))
        op.execute(sa.text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE schemaname = 'public' AND tablename = '{tbl}' AND policyname = 'deny_anon_access_{tbl}'
                ) THEN
                    CREATE POLICY "deny_anon_access_{tbl}" ON public.{tbl}
                    FOR ALL TO anon
                    USING (false)
                    WITH CHECK (false);
                END IF;
            END $$;
        """))

    # -------------------------------------------------------------------------
    # 2. SECURE CHILD TABLES & REMEDIATE interview_messages SENSITIVE EXPOSURE
    # -------------------------------------------------------------------------
    for tbl in CHILD_TABLES:
        op.execute(sa.text(f"ALTER TABLE public.{tbl} ENABLE ROW LEVEL SECURITY;"))
        op.execute(sa.text(f"REVOKE ALL ON TABLE public.{tbl} FROM anon, authenticated;"))
        op.execute(sa.text(f"GRANT ALL ON TABLE public.{tbl} TO postgres, service_role;"))
        op.execute(sa.text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE schemaname = 'public' AND tablename = '{tbl}' AND policyname = 'deny_anon_access_{tbl}'
                ) THEN
                    CREATE POLICY "deny_anon_access_{tbl}" ON public.{tbl}
                    FOR ALL TO anon
                    USING (false)
                    WITH CHECK (false);
                END IF;
            END $$;
        """))

    # Explicit sensitive column protection on public.interview_messages:
    # Denies both anon and direct PostgREST authenticated access to interview transcripts,
    # evaluation feedback, quantitative scores, and detected weaknesses.
    op.execute(sa.text("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies
                WHERE schemaname = 'public' AND tablename = 'interview_messages'
                  AND policyname = 'deny_direct_postgrest_interview_messages'
            ) THEN
                CREATE POLICY "deny_direct_postgrest_interview_messages" ON public.interview_messages
                FOR ALL TO authenticated
                USING (false)
                WITH CHECK (false);
            END IF;
        END $$;
    """))

    # -------------------------------------------------------------------------
    # 3. SECURE AUTHENTICATION, ADMIN & INTERNAL TABLES
    # -------------------------------------------------------------------------
    for tbl in SENSITIVE_ADMIN_TABLES:
        op.execute(sa.text(f"ALTER TABLE public.{tbl} ENABLE ROW LEVEL SECURITY;"))
        op.execute(sa.text(f"REVOKE ALL ON TABLE public.{tbl} FROM anon, authenticated;"))
        op.execute(sa.text(f"GRANT ALL ON TABLE public.{tbl} TO postgres, service_role;"))
        op.execute(sa.text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE schemaname = 'public' AND tablename = '{tbl}' AND policyname = 'deny_all_postgrest_{tbl}'
                ) THEN
                    CREATE POLICY "deny_all_postgrest_{tbl}" ON public.{tbl}
                    FOR ALL TO anon, authenticated
                    USING (false)
                    WITH CHECK (false);
                END IF;
            END $$;
        """))

    # -------------------------------------------------------------------------
    # 4. SECURE AUTHENTICATED CATALOG TABLES (AUTHENTICATED ONLY, DENY ANON)
    # -------------------------------------------------------------------------
    for tbl in AUTHENTICATED_CATALOG_TABLES:
        op.execute(sa.text(f"ALTER TABLE public.{tbl} ENABLE ROW LEVEL SECURITY;"))
        op.execute(sa.text(f"REVOKE ALL ON TABLE public.{tbl} FROM anon;"))
        op.execute(sa.text(f"REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.{tbl} FROM authenticated;"))
        op.execute(sa.text(f"GRANT SELECT ON TABLE public.{tbl} TO authenticated;"))
        op.execute(sa.text(f"GRANT ALL ON TABLE public.{tbl} TO postgres, service_role;"))
        op.execute(sa.text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE schemaname = 'public' AND tablename = '{tbl}' AND policyname = 'authenticated_read_{tbl}'
                ) THEN
                    CREATE POLICY "authenticated_read_{tbl}" ON public.{tbl}
                    FOR SELECT TO authenticated
                    USING (true);
                END IF;
            END $$;
        """))

    # -------------------------------------------------------------------------
    # 5. CONFIGURE PUBLIC REFERENCE & CATALOG TABLES (PUBLIC READ-ONLY)
    # -------------------------------------------------------------------------
    for tbl in PUBLIC_CATALOG_TABLES:
        op.execute(sa.text(f"ALTER TABLE public.{tbl} ENABLE ROW LEVEL SECURITY;"))
        op.execute(sa.text(f"REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.{tbl} FROM anon, authenticated;"))
        op.execute(sa.text(f"GRANT SELECT ON TABLE public.{tbl} TO anon, authenticated;"))
        op.execute(sa.text(f"GRANT ALL ON TABLE public.{tbl} TO postgres, service_role;"))
        op.execute(sa.text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE schemaname = 'public' AND tablename = '{tbl}' AND policyname = 'public_read_{tbl}'
                ) THEN
                    CREATE POLICY "public_read_{tbl}" ON public.{tbl}
                    FOR SELECT TO anon, authenticated
                    USING (true);
                END IF;
            END $$;
        """))

    # -------------------------------------------------------------------------
    # 6. SEQUENCE-LEVEL PRIVILEGE RESTRICTION
    # -------------------------------------------------------------------------
    op.execute(sa.text("""
        DO $$
        BEGIN
            EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;';
            EXECUTE 'GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;';
        EXCEPTION
            WHEN undefined_table THEN NULL;
            WHEN undefined_object THEN NULL;
        END $$;
    """))

    # -------------------------------------------------------------------------
    # 7. SECURE alembic_version TABLE (IF EXISTS)
    # -------------------------------------------------------------------------
    op.execute(sa.text("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'alembic_version'
            ) THEN
                ALTER TABLE public.alembic_version ENABLE ROW LEVEL SECURITY;
                REVOKE ALL ON TABLE public.alembic_version FROM anon, authenticated;
                GRANT ALL ON TABLE public.alembic_version TO postgres, service_role;
            END IF;
        END $$;
    """))


def downgrade() -> None:
    """Revert RLS and restore baseline grants safely."""
    bind = op.get_bind()
    if bind and bind.dialect.name != "postgresql":
        return

    all_tables = USER_OWNED_TABLES + CHILD_TABLES + SENSITIVE_ADMIN_TABLES + AUTHENTICATED_CATALOG_TABLES + PUBLIC_CATALOG_TABLES

    # Drop created policies
    for tbl in USER_OWNED_TABLES + CHILD_TABLES:
        op.execute(sa.text(f"DROP POLICY IF EXISTS \"deny_anon_access_{tbl}\" ON public.{tbl};"))

    op.execute(sa.text("DROP POLICY IF EXISTS \"deny_direct_postgrest_interview_messages\" ON public.interview_messages;"))

    for tbl in SENSITIVE_ADMIN_TABLES:
        op.execute(sa.text(f"DROP POLICY IF EXISTS \"deny_all_postgrest_{tbl}\" ON public.{tbl};"))

    for tbl in AUTHENTICATED_CATALOG_TABLES:
        op.execute(sa.text(f"DROP POLICY IF EXISTS \"authenticated_read_{tbl}\" ON public.{tbl};"))

    for tbl in PUBLIC_CATALOG_TABLES:
        op.execute(sa.text(f"DROP POLICY IF EXISTS \"public_read_{tbl}\" ON public.{tbl};"))

    # Disable RLS across tables
    for tbl in all_tables:
        op.execute(sa.text(f"ALTER TABLE public.{tbl} DISABLE ROW LEVEL SECURITY;"))

    op.execute(sa.text("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'alembic_version'
            ) THEN
                ALTER TABLE public.alembic_version DISABLE ROW LEVEL SECURITY;
            END IF;
        END $$;
    """))
