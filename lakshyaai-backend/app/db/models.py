from sqlalchemy import (
    Column,
    String,
    Text,
    Float,
    Boolean,
    Integer,
    DateTime,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.types import JSON
from pgvector.sqlalchemy import Vector
import uuid

from app.db.database import Base


# =========================
# USERS
# =========================

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    full_name = Column(String)
    role = Column(String(50), default="user", nullable=False)  # user, admin, super_admin
    is_active = Column(Boolean, default=True, nullable=False)
    is_suspended = Column(Boolean, default=False, nullable=False)
    suspended_reason = Column(Text, nullable=True)
    is_email_verified = Column(Boolean, default=False, nullable=False)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    last_activity_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    resumes = relationship(
        "Resume",
        back_populates="user",
        cascade="all, delete"
    )

    career_state = relationship(
        "UserCareerState",
        back_populates="user",
        cascade="all, delete",
        uselist=False,
    )

    career_profile = relationship(
        "UserCareerProfile",
        back_populates="user",
        cascade="all, delete",
        uselist=False,
    )

    verification_tokens = relationship(
        "EmailVerificationToken",
        back_populates="user",
        cascade="all, delete",
    )

    skills = relationship(
        "UserSkill",
        back_populates="user",
        cascade="all, delete",
    )

    interview_sessions = relationship(
        "InterviewSession",
        back_populates="user",
        cascade="all, delete",
    )

    copilot_conversations = relationship(
        "CopilotConversation",
        back_populates="user",
        cascade="all, delete",
    )

    resume_rewrites = relationship(
        "ResumeRewrite",
        back_populates="user",
        cascade="all, delete",
    )

    activities = relationship(
        "CareerActivity",
        back_populates="user",
        cascade="all, delete",
    )

    roadmap_progress_records = relationship(
        "RoadmapProgress",
        back_populates="user",
        cascade="all, delete",
    )

    notifications = relationship(
        "Notification",
        back_populates="user",
        cascade="all, delete",
    )

    career_goals = relationship(
        "CareerGoal",
        back_populates="user",
        cascade="all, delete",
    )

    career_recommendations = relationship(
        "CareerRecommendation",
        back_populates="user",
        cascade="all, delete",
    )

    automation_rules = relationship(
        "CareerAutomationRule",
        back_populates="user",
        cascade="all, delete",
    )

    insight_snapshots = relationship(
        "CareerInsightSnapshot",
        back_populates="user",
        cascade="all, delete",
    )

    job_applications = relationship(
        "JobApplication",
        back_populates="user",
        cascade="all, delete",
    )

    application_events = relationship(
        "ApplicationEvent",
        back_populates="user",
        cascade="all, delete",
    )

    interview_debriefs = relationship(
        "InterviewDebrief",
        back_populates="user",
        cascade="all, delete",
    )

    outcome_insights = relationship(
        "OutcomeLearningInsight",
        back_populates="user",
        cascade="all, delete",
    )


# =========================
# EMAIL VERIFICATION TOKENS
# =========================

class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    token_hash = Column(String(128), index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="verification_tokens")


# =========================
# USER CAREER PROFILES
# =========================

class UserCareerProfile(Base):
    __tablename__ = "user_career_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        unique=True,
        nullable=False,
    )
    onboarding_current_step = Column(Integer, default=1, nullable=False)
    onboarding_completed = Column(Boolean, default=False, nullable=False)

    career_stage = Column(String, nullable=True)
    primary_goals = Column(JSON, default=list)
    education_level = Column(String, nullable=True)
    specialization = Column(String, nullable=True)
    graduation_year = Column(String, nullable=True)
    college = Column(String, nullable=True)
    experience_level = Column(String, nullable=True)
    target_role = Column(String, nullable=True)
    is_exploring_roles = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="career_profile")


# =========================
# USER SKILLS (NORMALIZED)
# =========================

class UserSkill(Base):
    __tablename__ = "user_skills"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    skill_name = Column(String, index=True, nullable=False)
    skill_category = Column(String, nullable=True)
    source = Column(String, default="onboarding", nullable=False)
    confidence = Column(Float, default=1.0, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="skills")



# =========================
# ROLES
# =========================

class Role(Base):
    __tablename__ = "roles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, index=True)
    title = Column(String, index=True)
    category = Column(String, default="Software Engineering")
    demand_level = Column(String, default="Medium")
    core_skills = Column(JSON, default=list)
    advanced_skills = Column(JSON, default=list)
    description = Column(Text)
    average_salary = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    skills = relationship(
        "RoleSkill",
        back_populates="role",
        cascade="all, delete"
    )

    embeddings = relationship(
        "RoleEmbedding",
        back_populates="role",
        cascade="all, delete"
    )


# =========================
# RESUMES
# =========================

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True
    )

    original_filename = Column(String)
    file_name = Column(String, index=True)
    file_path = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String, default="application/pdf", nullable=True)

    parsed_text = Column(Text)
    extracted_text = Column(Text)

    ats_score = Column(Float)

    overall_feedback = Column(Text)

    # ✅ REQUIRED FIELD FOR ANALYTICS
    uploaded_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    updated_at = Column(
        DateTime(timezone=True),
        onupdate=func.now()
    )

    user = relationship(
        "User",
        back_populates="resumes"
    )

    skills = relationship(
        "ResumeSkill",
        back_populates="resume",
        cascade="all, delete"
    )

    embeddings = relationship(
        "ResumeEmbedding",
        back_populates="resume",
        cascade="all, delete"
    )

    ats_breakdown = relationship(
        "ResumeATSBreakdown",
        back_populates="resume",
        cascade="all, delete",
        uselist=False
    )

    missing_skills = relationship(
        "ResumeMissingSkill",
        back_populates="resume",
        cascade="all, delete"
    )


# =========================
# RESUME SKILLS
# =========================

class ResumeSkill(Base):
    __tablename__ = "resume_skills"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    resume_id = Column(
        UUID(as_uuid=True),
        ForeignKey("resumes.id", ondelete="CASCADE"),
        index=True
    )

    skill_name = Column(String, index=True)

    skill_category = Column(String)

    confidence_score = Column(Float)

    resume = relationship(
        "Resume",
        back_populates="skills"
    )


# =========================
# RESUME EMBEDDINGS
# =========================

class ResumeEmbedding(Base):
    __tablename__ = "resume_embeddings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    resume_id = Column(
        UUID(as_uuid=True),
        ForeignKey("resumes.id", ondelete="CASCADE"),
        index=True
    )

    embedding = Column(Vector(1536))

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    resume = relationship(
        "Resume",
        back_populates="embeddings"
    )


# =========================
# ROLE SKILLS
# =========================

class RoleSkill(Base):
    __tablename__ = "role_skills"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    role_id = Column(
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="CASCADE"),
        index=True
    )

    skill_name = Column(String, index=True)

    skill_category = Column(String)

    weight = Column(Float, default=1.0)

    importance_level = Column(Integer, default=3)

    role = relationship(
        "Role",
        back_populates="skills"
    )


# =========================
# ROLE EMBEDDINGS
# =========================

class RoleEmbedding(Base):
    __tablename__ = "role_embeddings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    role_id = Column(
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="CASCADE"),
        index=True
    )

    embedding = Column(Vector(1536))

    role = relationship(
        "Role",
        back_populates="embeddings"
    )


# =========================
# USER PERFORMANCE TREND
# =========================

class UserPerformanceTrend(Base):
    __tablename__ = "user_performance_trend"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True
    )

    resume_id = Column(
        UUID(as_uuid=True),
        ForeignKey("resumes.id", ondelete="CASCADE"),
        index=True
    )

    ats_score = Column(Float)

    role_alignment_score = Column(Float)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True
    )

    user = relationship("User")

    resume = relationship("Resume")


# =========================
# USER SKILL PROGRESS
# =========================

class UserSkillProgress(Base):
    __tablename__ = "user_skill_progress"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True
    )

    skill_name = Column(String, index=True)

    frequency = Column(Integer, default=1)

    last_seen = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    user = relationship("User")


# =========================
# USER CAREER STATE
# =========================

class UserCareerState(Base):
    __tablename__ = "user_career_state"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        unique=True,
        nullable=False,
    )

    best_role = Column(String, nullable=False, default="")
    score = Column(Float, nullable=False, default=0.0)
    confidence = Column(String, nullable=False, default="Low")

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user = relationship("User", back_populates="career_state")


# =========================
# RESUME ATS BREAKDOWN
# =========================

class ResumeATSBreakdown(Base):
    __tablename__ = "resume_ats_breakdown"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    resume_id = Column(
        UUID(as_uuid=True),
        ForeignKey("resumes.id", ondelete="CASCADE"),
        index=True
    )

    skill_score = Column(Float)

    keyword_score = Column(Float)

    section_score = Column(Float)

    format_score = Column(Float)

    action_verb_score = Column(Float)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    resume = relationship(
        "Resume",
        back_populates="ats_breakdown"
    )


# =========================
# RESUME MISSING SKILLS
# =========================

class ResumeMissingSkill(Base):
    __tablename__ = "resume_missing_skills"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    resume_id = Column(
        UUID(as_uuid=True),
        ForeignKey("resumes.id", ondelete="CASCADE"),
        index=True
    )

    skill_name = Column(String, index=True)

    skill_category = Column(String)

    importance = Column(Integer, default=3)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    resume = relationship(
        "Resume",
        back_populates="missing_skills"
    )


# =========================
# INTERVIEW SESSIONS
# =========================

class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    role = Column(String, nullable=False)
    difficulty = Column(String, default="medium", nullable=False)
    mode = Column(String, default="technical", nullable=False)
    status = Column(String, default="in_progress", nullable=False)  # in_progress, completed
    current_index = Column(Integer, default=0, nullable=False)
    total_questions = Column(Integer, default=5, nullable=False)
    questions = Column(JSON, default=list)

    overall_score = Column(Float, nullable=True)
    technical_score = Column(Float, nullable=True)
    communication_score = Column(Float, nullable=True)
    confidence_score = Column(Float, nullable=True)
    feedback_summary = Column(Text, nullable=True)
    strengths = Column(JSON, default=list)
    weaknesses = Column(JSON, default=list)

    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="interview_sessions")
    messages = relationship(
        "InterviewMessage",
        back_populates="session",
        cascade="all, delete",
        order_by="InterviewMessage.created_at",
    )


# =========================
# INTERVIEW MESSAGES
# =========================

class InterviewMessage(Base):
    __tablename__ = "interview_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("interview_sessions.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    sender = Column(String, nullable=False)  # ai, user
    content = Column(Text, nullable=False)
    feedback = Column(Text, nullable=True)
    score = Column(Float, nullable=True)
    question_index = Column(Integer, default=0, nullable=False)
    strengths = Column(JSON, default=list)
    weaknesses = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    session = relationship("InterviewSession", back_populates="messages")


# =========================
# CAREER COPILOT CHAT
# =========================

class CopilotConversation(Base):
    __tablename__ = "copilot_conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    title = Column(String, default="Career Advice", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="copilot_conversations")
    messages = relationship(
        "CopilotMessage",
        back_populates="conversation",
        cascade="all, delete",
        order_by="CopilotMessage.created_at",
    )


class CopilotMessage(Base):
    __tablename__ = "copilot_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("copilot_conversations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    role = Column(String, nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    conversation = relationship("CopilotConversation", back_populates="messages")


# =========================
# RESUME REWRITES (LATEX)
# =========================

class ResumeRewrite(Base):
    __tablename__ = "resume_rewrites"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    resume_id = Column(
        UUID(as_uuid=True),
        ForeignKey("resumes.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title = Column(String, default="Optimized Resume", nullable=False)
    latex_content = Column(Text, nullable=False)
    preview_text = Column(Text, nullable=True)
    structured_data = Column(JSON, default=dict)
    pdf_path = Column(String, nullable=True)
    tex_path = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="resume_rewrites")


# =========================
# CAREER ACTIVITIES (PERSISTENCE)
# =========================

class CareerActivity(Base):
    __tablename__ = "career_activities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    client_event_id = Column(String(128), index=True, nullable=True)
    activity_type = Column(String(64), index=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    activity_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "client_event_id", name="uq_user_client_event_activity"),
    )

    user = relationship("User", back_populates="activities")


# =========================
# ROADMAP PROGRESS (PERSISTENCE)
# =========================

class RoadmapProgress(Base):
    __tablename__ = "roadmap_progress"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    role = Column(String(255), nullable=False)
    experience_level = Column(String(64), nullable=False)
    completed_steps = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "role", "experience_level", name="uq_user_roadmap_role_exp"),
    )

    user = relationship("User", back_populates="roadmap_progress_records")


# =========================
# NOTIFICATIONS (PERSISTENCE)
# =========================

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    client_event_id = Column(String(128), index=True, nullable=True)
    type = Column(String(64), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    action_url = Column(String(500), nullable=True)
    action_text = Column(String(100), nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "client_event_id", name="uq_user_client_event_notification"),
    )

    user = relationship("User", back_populates="notifications")


# =========================
# CAREER GOALS (PERSISTENCE)
# =========================

class CareerGoal(Base):
    __tablename__ = "career_goals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    target_role = Column(String(255), nullable=False)
    target_company = Column(String(255), nullable=True)
    target_salary = Column(String(100), nullable=True)
    target_date = Column(DateTime(timezone=True), nullable=True)
    target_readiness_score = Column(Float, default=90.0, nullable=False)
    priority = Column(String(50), default="high", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="career_goals")


# =========================
# CAREER RECOMMENDATIONS (ORCHESTRATION)
# =========================

class CareerRecommendation(Base):
    __tablename__ = "career_recommendations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    client_event_id = Column(String(128), index=True, nullable=True)
    recommendation_type = Column(String(64), index=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    source_module = Column(String(64), nullable=False)
    target_module = Column(String(64), nullable=False)
    priority = Column(String(32), default="medium", nullable=False)  # critical, high, medium, opportunity
    impact_score = Column(Float, default=10.0, nullable=False)
    confidence_score = Column(Float, default=85.0, nullable=False)
    urgency_score = Column(Float, default=0.7, nullable=False)
    status = Column(String(32), default="active", nullable=False)  # active, completed, dismissed, expired, superseded
    action_url = Column(String(500), nullable=True)
    action_label = Column(String(100), nullable=True)
    recommendation_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("user_id", "client_event_id", name="uq_user_client_event_rec"),
    )

    user = relationship("User", back_populates="career_recommendations")


# =========================
# CAREER AUTOMATION RULES
# =========================

class CareerAutomationRule(Base):
    __tablename__ = "career_automation_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    trigger_type = Column(String(64), nullable=False)  # high_match_job, roadmap_completed, readiness_changed, etc.
    condition_config = Column(JSON, default=dict)
    action_type = Column(String(64), nullable=False)  # create_notification, create_recommendation, create_activity
    action_config = Column(JSON, default=dict)
    is_enabled = Column(Boolean, default=True, nullable=False)
    last_triggered_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="automation_rules")


# =========================
# CAREER INSIGHT SNAPSHOTS (MOMENTUM)
# =========================

class CareerInsightSnapshot(Base):
    __tablename__ = "career_insight_snapshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    readiness_score = Column(Float, nullable=False)
    resume_score = Column(Float, nullable=True)
    roadmap_progress = Column(Float, nullable=True)
    interview_score = Column(Float, nullable=True)
    job_readiness = Column(Float, nullable=True)
    skill_coverage = Column(Float, nullable=True)
    snapshot_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="insight_snapshots")


# =========================
# JOB APPLICATIONS (EXECUTION)
# =========================

class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    company_name = Column(String(255), nullable=False)
    job_title = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    salary_range = Column(String(100), nullable=True)
    job_url = Column(String(500), nullable=True)
    job_source = Column(String(64), default="manual", nullable=False)
    external_job_id = Column(String(128), nullable=True)
    source_job_id = Column(UUID(as_uuid=True), nullable=True)
    stage = Column(String(64), default="wishlist", nullable=False)  # wishlist, applied, screening, interviewing, offer, closed
    status = Column(String(64), default="active", nullable=False)  # active, offer_accepted, offer_declined, rejected, withdrawn, expired
    applied_date = Column(DateTime(timezone=True), nullable=True)
    last_status_change = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    resume_version_id = Column(UUID(as_uuid=True), nullable=True)
    match_score_at_application = Column(Float, default=0.0, nullable=False)
    notes = Column(Text, nullable=True)
    next_step_date = Column(DateTime(timezone=True), nullable=True)
    next_step_notes = Column(String(255), nullable=True)
    outcome_notes = Column(Text, nullable=True)
    application_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="job_applications")
    events = relationship("ApplicationEvent", back_populates="application", cascade="all, delete", order_by="ApplicationEvent.created_at.desc()")
    debriefs = relationship("InterviewDebrief", back_populates="application", cascade="all, delete", order_by="InterviewDebrief.created_at.desc()")


# =========================
# APPLICATION EVENTS (TIMELINE)
# =========================

class ApplicationEvent(Base):
    __tablename__ = "application_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id = Column(
        UUID(as_uuid=True),
        ForeignKey("job_applications.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    event_type = Column(String(64), nullable=False)
    previous_stage = Column(String(64), nullable=True)
    new_stage = Column(String(64), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    event_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    application = relationship("JobApplication", back_populates="events")
    user = relationship("User", back_populates="application_events")


# =========================
# COMPANY INTELLIGENCE
# =========================

class CompanyIntelligence(Base):
    __tablename__ = "company_intelligence"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), index=True, nullable=False)
    company_name_normalized = Column(String(255), unique=True, index=True, nullable=False)
    domain = Column(String(255), nullable=True)
    logo_url = Column(String(500), nullable=True)
    tech_stack = Column(JSON, default=list)
    interview_stages = Column(JSON, default=list)
    hiring_culture_notes = Column(Text, nullable=True)
    salary_benchmarks = Column(JSON, default=dict)
    common_questions = Column(JSON, default=list)
    data_source = Column(String(100), default="lakshya_verified", nullable=False)
    source_url = Column(String(500), nullable=True)
    confidence_score = Column(Float, default=90.0, nullable=False)
    last_verified_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now(), nullable=False)


# =========================
# INTERVIEW DEBRIEFS (LEARNING)
# =========================

class InterviewDebrief(Base):
    __tablename__ = "interview_debriefs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    application_id = Column(
        UUID(as_uuid=True),
        ForeignKey("job_applications.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    company_name = Column(String(255), nullable=False)
    round_type = Column(String(100), nullable=False)  # Screening, Technical Coding, System Design, Behavioral, Hiring Manager
    date = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    difficulty_rating = Column(Integer, default=3, nullable=False)
    technical_score = Column(Float, nullable=True)
    communication_score = Column(Float, nullable=True)
    problem_solving_score = Column(Float, nullable=True)
    system_design_score = Column(Float, nullable=True)
    confidence_score = Column(Float, nullable=True)
    questions_asked = Column(JSON, default=list)
    candidate_reflection = Column(Text, nullable=True)
    identified_weaknesses = Column(JSON, default=list)
    outcome = Column(String(50), default="pending", nullable=False)  # passed, rejected, pending
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="interview_debriefs")
    application = relationship("JobApplication", back_populates="debriefs")


# =========================
# OUTCOME LEARNING INSIGHTS
# =========================

class OutcomeLearningInsight(Base):
    __tablename__ = "outcome_learning_insights"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    insight_type = Column(String(64), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    metric_value = Column(Float, default=0.0, nullable=False)
    data_points = Column(JSON, default=dict)
    source_count = Column(Integer, default=1, nullable=False)
    confidence_score = Column(Float, default=85.0, nullable=False)
    fingerprint = Column(String(128), index=True, nullable=True)
    valid_until = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="outcome_insights")


# =========================
# ADMIN AUDIT LOGS (GOVERNANCE)
# =========================

class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    action_type = Column(String(64), index=True, nullable=False)  # VIEW_USER, SUSPEND_USER, ACTIVATE_USER, CHANGE_ROLE, TOGGLE_FEATURE, DATABASE_MUTATION, etc.
    target_user_id = Column(UUID(as_uuid=True), index=True, nullable=True)
    resource_type = Column(String(64), nullable=True)
    resource_id = Column(String(128), nullable=True)
    action_metadata = Column(JSON, default=dict)
    before_data = Column(JSON, nullable=True)
    after_data = Column(JSON, nullable=True)
    diff = Column(JSON, nullable=True)
    reason = Column(Text, nullable=True)
    severity = Column(String(32), default="info", nullable=False)  # info, warning, critical
    confirmation_value = Column(String(255), nullable=True)
    simulation_session_id = Column(UUID(as_uuid=True), nullable=True)
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(String(255), nullable=True)
    request_id = Column(String(128), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    admin_user = relationship("User", foreign_keys=[admin_user_id])


# =========================
# ADMIN SIMULATION SESSIONS (VIEW-AS GOVERNANCE)
# =========================

class AdminSimulationSession(Base):
    __tablename__ = "admin_simulation_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    target_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    token_hash = Column(String(128), index=True, unique=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    ended_reason = Column(String(128), nullable=True)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(String(255), nullable=True)

    admin_user = relationship("User", foreign_keys=[admin_user_id])
    target_user = relationship("User", foreign_keys=[target_user_id])


# =========================
# FEATURE FLAGS (PLATFORM CONTROLS)
# =========================

class FeatureFlag(Base):
    __tablename__ = "feature_flags"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    is_enabled = Column(Boolean, default=True, nullable=False)
    target_roles = Column(JSON, default=list)  # ["user", "admin", "super_admin"]
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now(), nullable=False)


# =========================
# PLATFORM ANNOUNCEMENTS
# =========================

class PlatformAnnouncement(Base):
    __tablename__ = "platform_announcements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(32), default="info", nullable=False)  # info, success, warning, maintenance
    target_audience = Column(String(32), default="all", nullable=False)  # all, users, admins
    is_active = Column(Boolean, default=True, nullable=False)
    starts_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now(), nullable=False)

# =========================
# USER FEEDBACK (BETA / OPS LOOP)
# =========================

class UserFeedback(Base):
    __tablename__ = "user_feedback"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    feedback_type = Column(String(32), nullable=False)  # helpful, unhelpful, issue, idea
    module = Column(String(64), nullable=True)  # resume, interview, roadmap, intelligence, etc.
    message = Column(Text, nullable=True)
    metadata_json = Column(JSON, default=dict)
    status = Column(String(32), default="new", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", foreign_keys=[user_id])






