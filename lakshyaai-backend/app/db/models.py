from sqlalchemy import (
    Column,
    String,
    Text,
    Float,
    Boolean,
    Integer,
    DateTime,
    ForeignKey,
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
    is_active = Column(Boolean, default=True)

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
