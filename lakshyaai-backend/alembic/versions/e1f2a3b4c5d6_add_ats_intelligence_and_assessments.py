"""add_ats_intelligence_and_assessments

Revision ID: e1f2a3b4c5d6
Revises: d9e0f1a2b3c4
Create Date: 2026-10-28 09:00:00.000000

Adds ATS Intelligence persistent structures:
- resume_analyses: Historical assessments, multi-mode scores, and model metadata
- resume_analysis_dimensions: Granular dimension-level breakdowns and weights
- resume_skill_evidence: Extracted evidence excerpts, offsets, and inference flags
- resumes: Version lineage (parent_resume_id, version_number, version_label, base_quality_score)
- resume_skills: Grounding metadata (is_inferred, extraction_source)
Enables Supabase Row-Level Security (RLS) tenant isolation on PostgreSQL targets.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'e1f2a3b4c5d6'
down_revision: Union[str, Sequence[str], None] = 'd9e0f1a2b3c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add version lineage and base quality score columns to resumes using batch mode
    with op.batch_alter_table('resumes', schema=None) as batch_op:
        batch_op.add_column(sa.Column('parent_resume_id', sa.UUID(), nullable=True))
        batch_op.add_column(sa.Column('version_number', sa.Integer(), server_default='1', nullable=False))
        batch_op.add_column(sa.Column('version_label', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('base_quality_score', sa.Float(), nullable=True))
        batch_op.create_index('ix_resumes_parent_resume_id', ['parent_resume_id'], unique=False)
        batch_op.create_foreign_key(
            'fk_resumes_parent_resume_id',
            'resumes',
            ['parent_resume_id'], ['id'],
            ondelete='SET NULL'
        )

    # 2. Add evidence and grounding flags to resume_skills using batch mode
    with op.batch_alter_table('resume_skills', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_inferred', sa.Boolean(), server_default='false', nullable=False))
        batch_op.add_column(sa.Column('extraction_source', sa.String(length=50), server_default='direct', nullable=False))

    # 3. Create resume_analyses table for assessment history
    op.create_table(
        'resume_analyses',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('resume_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('scoring_mode', sa.String(length=50), server_default='base_quality', nullable=False),
        sa.Column('target_role_id', sa.String(length=100), nullable=True),
        sa.Column('target_role_title', sa.String(length=200), nullable=True),
        sa.Column('target_job_description', sa.Text(), nullable=True),
        sa.Column('overall_score', sa.Float(), nullable=False),
        sa.Column('match_verdict', sa.String(length=50), nullable=True),
        sa.Column('algorithm_version', sa.String(length=50), server_default='v2.0-ats-intelligence', nullable=False),
        sa.Column('model_metadata', sa.JSON(), nullable=True),
        sa.Column('execution_duration_ms', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['resume_id'], ['resumes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_resume_analyses_resume_id'), 'resume_analyses', ['resume_id'], unique=False)
    op.create_index(op.f('ix_resume_analyses_user_id'), 'resume_analyses', ['user_id'], unique=False)
    op.create_index(op.f('ix_resume_analyses_scoring_mode'), 'resume_analyses', ['scoring_mode'], unique=False)
    op.create_index(op.f('ix_resume_analyses_target_role_id'), 'resume_analyses', ['target_role_id'], unique=False)
    op.create_index(op.f('ix_resume_analyses_created_at'), 'resume_analyses', ['created_at'], unique=False)

    # 4. Create resume_analysis_dimensions table
    op.create_table(
        'resume_analysis_dimensions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('analysis_id', sa.UUID(), nullable=False),
        sa.Column('dimension_key', sa.String(length=50), nullable=False),
        sa.Column('raw_score', sa.Float(), nullable=False),
        sa.Column('weighted_score', sa.Float(), nullable=False),
        sa.Column('weight_factor', sa.Float(), nullable=False),
        sa.Column('evaluation_status', sa.String(length=50), server_default='evaluated', nullable=False),
        sa.Column('diagnostic_notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['analysis_id'], ['resume_analyses.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_resume_analysis_dimensions_analysis_id'), 'resume_analysis_dimensions', ['analysis_id'], unique=False)
    op.create_index(op.f('ix_resume_analysis_dimensions_dimension_key'), 'resume_analysis_dimensions', ['dimension_key'], unique=False)

    # 5. Create resume_skill_evidence table
    op.create_table(
        'resume_skill_evidence',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('resume_id', sa.UUID(), nullable=False),
        sa.Column('skill_name', sa.String(length=100), nullable=False),
        sa.Column('excerpt_text', sa.Text(), nullable=False),
        sa.Column('section_name', sa.String(length=50), server_default='general', nullable=False),
        sa.Column('start_char_offset', sa.Integer(), nullable=True),
        sa.Column('end_char_offset', sa.Integer(), nullable=True),
        sa.Column('extraction_source', sa.String(length=50), server_default='direct', nullable=False),
        sa.Column('confidence', sa.Float(), server_default='1.0', nullable=False),
        sa.Column('is_inferred', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['resume_id'], ['resumes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_resume_skill_evidence_resume_id'), 'resume_skill_evidence', ['resume_id'], unique=False)
    op.create_index(op.f('ix_resume_skill_evidence_skill_name'), 'resume_skill_evidence', ['skill_name'], unique=False)

    # 6. Row Level Security policies for PostgreSQL targets
    bind = op.get_bind()
    if bind and bind.dialect.name == "postgresql":
        # Analyses RLS
        op.execute("ALTER TABLE public.resume_analyses ENABLE ROW LEVEL SECURITY;")
        op.execute("REVOKE ALL ON TABLE public.resume_analyses FROM anon, authenticated;")
        op.execute("""
            CREATE POLICY resume_analyses_tenant_isolation ON public.resume_analyses
                FOR ALL TO authenticated
                USING (user_id IS NOT NULL AND auth.uid() = user_id)
                WITH CHECK (user_id IS NOT NULL AND auth.uid() = user_id);
        """)

        # Dimensions RLS (linked via analysis user_id)
        op.execute("ALTER TABLE public.resume_analysis_dimensions ENABLE ROW LEVEL SECURITY;")
        op.execute("REVOKE ALL ON TABLE public.resume_analysis_dimensions FROM anon, authenticated;")
        op.execute("""
            CREATE POLICY dimensions_tenant_isolation ON public.resume_analysis_dimensions
                FOR ALL TO authenticated
                USING (EXISTS (
                    SELECT 1 FROM public.resume_analyses a
                    WHERE a.id = resume_analysis_dimensions.analysis_id
                      AND a.user_id = auth.uid()
                ));
        """)

        # Evidence RLS (linked via resume user_id)
        op.execute("ALTER TABLE public.resume_skill_evidence ENABLE ROW LEVEL SECURITY;")
        op.execute("REVOKE ALL ON TABLE public.resume_skill_evidence FROM anon, authenticated;")
        op.execute("""
            CREATE POLICY evidence_tenant_isolation ON public.resume_skill_evidence
                FOR ALL TO authenticated
                USING (EXISTS (
                    SELECT 1 FROM public.resumes r
                    WHERE r.id = resume_skill_evidence.resume_id
                      AND r.user_id = auth.uid()
                ));
        """)


def downgrade() -> None:
    bind = op.get_bind()
    if bind and bind.dialect.name == "postgresql":
        op.execute("DROP POLICY IF EXISTS evidence_tenant_isolation ON public.resume_skill_evidence;")
        op.execute("DROP POLICY IF EXISTS dimensions_tenant_isolation ON public.resume_analysis_dimensions;")
        op.execute("DROP POLICY IF EXISTS resume_analyses_tenant_isolation ON public.resume_analyses;")

    # Drop evidence
    op.drop_index(op.f('ix_resume_skill_evidence_skill_name'), table_name='resume_skill_evidence')
    op.drop_index(op.f('ix_resume_skill_evidence_resume_id'), table_name='resume_skill_evidence')
    op.drop_table('resume_skill_evidence')

    # Drop dimensions
    op.drop_index(op.f('ix_resume_analysis_dimensions_dimension_key'), table_name='resume_analysis_dimensions')
    op.drop_index(op.f('ix_resume_analysis_dimensions_analysis_id'), table_name='resume_analysis_dimensions')
    op.drop_table('resume_analysis_dimensions')

    # Drop analyses
    op.drop_index(op.f('ix_resume_analyses_created_at'), table_name='resume_analyses')
    op.drop_index(op.f('ix_resume_analyses_target_role_id'), table_name='resume_analyses')
    op.drop_index(op.f('ix_resume_analyses_scoring_mode'), table_name='resume_analyses')
    op.drop_index(op.f('ix_resume_analyses_user_id'), table_name='resume_analyses')
    op.drop_index(op.f('ix_resume_analyses_resume_id'), table_name='resume_analyses')
    op.drop_table('resume_analyses')

    # Drop resume_skills columns
    with op.batch_alter_table('resume_skills', schema=None) as batch_op:
        batch_op.drop_column('extraction_source')
        batch_op.drop_column('is_inferred')

    # Drop resumes versioning columns
    with op.batch_alter_table('resumes', schema=None) as batch_op:
        batch_op.drop_constraint('fk_resumes_parent_resume_id', type_='foreignkey')
        batch_op.drop_index('ix_resumes_parent_resume_id')
        batch_op.drop_column('base_quality_score')
        batch_op.drop_column('version_label')
        batch_op.drop_column('version_number')
        batch_op.drop_column('parent_resume_id')
