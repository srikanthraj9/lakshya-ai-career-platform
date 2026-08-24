import logging
from typing import Optional, List
from uuid import UUID
from sqlalchemy.orm import Session
from app.db import models

logger = logging.getLogger("lakshyaai.admin.feature_flags")

# Default system flags seeded on startup
DEFAULT_FLAGS = [
    {
        "key": "voice_interview",
        "name": "Voice Interview Studio",
        "description": "Real-time AI voice mock interview practice with audio evaluation",
        "is_enabled": True,
        "target_roles": ["user", "admin", "super_admin"],
    },
    {
        "key": "live_jobs",
        "name": "Live Job Feeds",
        "description": "Real-time aggregated career opportunity feeds with auto-match",
        "is_enabled": True,
        "target_roles": ["user", "admin", "super_admin"],
    },
    {
        "key": "career_intelligence",
        "name": "Career Intelligence Engine",
        "description": "Autonomous signal evaluation, momentum metrics, and next-best-actions",
        "is_enabled": True,
        "target_roles": ["user", "admin", "super_admin"],
    },
    {
        "key": "application_tracker",
        "name": "Application Pipeline & Debriefs",
        "description": "Kanban pipeline, interview debrief logging, and outcome learning loops",
        "is_enabled": True,
        "target_roles": ["user", "admin", "super_admin"],
    },
    {
        "key": "ai_copilot",
        "name": "AI Career Copilot",
        "description": "Conversational career mentor and real-time guidance workspace",
        "is_enabled": True,
        "target_roles": ["user", "admin", "super_admin"],
    },
    {
        "key": "resume_ai_optimize",
        "name": "STAR Resume AI Optimization",
        "description": "Diagnostic bullet rewriting and LaTeX generation",
        "is_enabled": True,
        "target_roles": ["user", "admin", "super_admin"],
    },
]


class FeatureFlagService:
    @staticmethod
    def seed_default_flags(db: Session):
        for flag_def in DEFAULT_FLAGS:
            existing = db.query(models.FeatureFlag).filter(models.FeatureFlag.key == flag_def["key"]).first()
            if not existing:
                flag = models.FeatureFlag(
                    key=flag_def["key"],
                    name=flag_def["name"],
                    description=flag_def["description"],
                    is_enabled=flag_def["is_enabled"],
                    target_roles=flag_def["target_roles"],
                )
                db.add(flag)
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            logger.warning(f"Feature flags seed skipped or already present: {e}")

    @staticmethod
    def is_feature_enabled(db: Session, key: str, user_role: str = "user") -> bool:
        try:
            flag = db.query(models.FeatureFlag).filter(models.FeatureFlag.key == key).first()
            if not flag:
                return True  # Safe fallback: enabled by default
            if not flag.is_enabled:
                return False
            allowed_roles = flag.target_roles or ["user", "admin", "super_admin"]
            return user_role in allowed_roles
        except Exception:
            return True  # Graceful fallback: do not block features on query error
