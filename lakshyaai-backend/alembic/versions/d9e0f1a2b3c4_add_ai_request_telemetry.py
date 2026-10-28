"""add_ai_request_telemetry

Revision ID: d9e0f1a2b3c4
Revises: c8b9d0e1f2a3
Create Date: 2026-10-25 17:45:00.000000

Adds ai_request_telemetry table for privacy-preserving AI request duration,
status, model, and token metrics tracking without storing prompt or response payloads.
Enables Row-Level Security (RLS) consistent with Supabase security policy.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'd9e0f1a2b3c4'
down_revision: Union[str, Sequence[str], None] = 'c8b9d0e1f2a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create ai_request_telemetry table
    op.create_table(
        'ai_request_telemetry',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('request_id', sa.String(length=100), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('feature_type', sa.String(length=50), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('model_name', sa.String(length=100), nullable=False),
        sa.Column('duration_ms', sa.Float(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('error_category', sa.String(length=100), nullable=True),
        sa.Column('prompt_tokens', sa.Integer(), nullable=True),
        sa.Column('completion_tokens', sa.Integer(), nullable=True),
        sa.Column('total_tokens', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # 2. Create performance & analytics indexes
    op.create_index(op.f('ix_ai_request_telemetry_request_id'), 'ai_request_telemetry', ['request_id'], unique=False)
    op.create_index(op.f('ix_ai_request_telemetry_timestamp'), 'ai_request_telemetry', ['timestamp'], unique=False)
    op.create_index(op.f('ix_ai_request_telemetry_feature_type'), 'ai_request_telemetry', ['feature_type'], unique=False)
    op.create_index(op.f('ix_ai_request_telemetry_status'), 'ai_request_telemetry', ['status'], unique=False)
    op.create_index(op.f('ix_ai_request_telemetry_user_id'), 'ai_request_telemetry', ['user_id'], unique=False)

    # 3. Enable RLS on PostgreSQL targets
    bind = op.get_bind()
    if bind and bind.dialect.name == "postgresql":
        op.execute("ALTER TABLE public.ai_request_telemetry ENABLE ROW LEVEL SECURITY;")
        op.execute("REVOKE ALL ON TABLE public.ai_request_telemetry FROM anon, authenticated;")
        op.execute("""
            CREATE POLICY telemetry_tenant_isolation ON public.ai_request_telemetry
                FOR SELECT TO authenticated
                USING (user_id IS NOT NULL AND auth.uid() = user_id);
        """)


def downgrade() -> None:
    bind = op.get_bind()
    if bind and bind.dialect.name == "postgresql":
        op.execute("DROP POLICY IF EXISTS telemetry_tenant_isolation ON public.ai_request_telemetry;")
    
    op.drop_index(op.f('ix_ai_request_telemetry_user_id'), table_name='ai_request_telemetry')
    op.drop_index(op.f('ix_ai_request_telemetry_status'), table_name='ai_request_telemetry')
    op.drop_index(op.f('ix_ai_request_telemetry_feature_type'), table_name='ai_request_telemetry')
    op.drop_index(op.f('ix_ai_request_telemetry_timestamp'), table_name='ai_request_telemetry')
    op.drop_index(op.f('ix_ai_request_telemetry_request_id'), table_name='ai_request_telemetry')
    op.drop_table('ai_request_telemetry')
