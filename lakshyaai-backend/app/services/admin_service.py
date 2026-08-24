import logging
import os
import math
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.db import models, schemas
from app.services.audit_service import AuditService

logger = logging.getLogger("lakshyaai.admin.service")

BOOTSTRAP_ADMIN_EMAILS = [
    email.strip().lower()
    for email in os.getenv(
        "ADMIN_EMAILS",
        "srikanthuppalapati09@gmail.com,admin@lakshya.ai",
    ).split(",")
    if email.strip()
]


class AdminService:
    @staticmethod
    def bootstrap_admin_users(db: Session):
        """Idempotently elevate configured bootstrap emails to super_admin."""
        for email in BOOTSTRAP_ADMIN_EMAILS:
            user = db.query(models.User).filter(func.lower(models.User.email) == email).first()
            if user:
                if user.role != "super_admin":
                    user.role = "super_admin"
                    db.commit()
                    logger.info(f"[AdminBootstrap] Bootstrapped {email} to super_admin role.")

    @staticmethod
    def list_users(
        db: Session,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        role: Optional[str] = None,
        is_suspended: Optional[bool] = None,
    ) -> schemas.AdminUserListResponse:
        query = db.query(models.User)

        if search:
            s = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    models.User.email.ilike(s),
                    models.User.full_name.ilike(s),
                )
            )

        if role:
            query = query.filter(models.User.role == role)

        if is_suspended is not None:
            query = query.filter(models.User.is_suspended == is_suspended)

        total = query.count()
        offset = (page - 1) * page_size
        users = query.order_by(models.User.created_at.desc()).offset(offset).limit(page_size).all()

        user_items = []
        for u in users:
            # Check for career profile
            cp = db.query(models.UserCareerProfile).filter(models.UserCareerProfile.user_id == u.id).first()
            apps_count = db.query(func.count(models.JobApplication.id)).filter(models.JobApplication.user_id == u.id).scalar() or 0
            interviews_count = db.query(func.count(models.InterviewSession.id)).filter(models.InterviewSession.user_id == u.id).scalar() or 0
            latest_resume = db.query(models.Resume).filter(models.Resume.user_id == u.id).order_by(models.Resume.created_at.desc()).first()

            user_items.append(
                schemas.AdminUserListItem(
                    id=u.id,
                    email=u.email,
                    full_name=u.full_name,
                    role=u.role or "user",
                    is_active=u.is_active,
                    is_suspended=u.is_suspended,
                    suspended_reason=u.suspended_reason,
                    is_email_verified=u.is_email_verified,
                    onboarding_completed=cp.onboarding_completed if cp else False,
                    target_role=cp.target_role if cp else None,
                    ats_score=latest_resume.ats_score if latest_resume else None,
                    readiness_score=85.0 if latest_resume else 50.0,
                    applications_count=apps_count,
                    interviews_count=interviews_count,
                    last_activity_at=u.last_activity_at or u.created_at,
                    created_at=u.created_at,
                )
            )

        total_pages = max(1, math.ceil(total / page_size))
        return schemas.AdminUserListResponse(
            users=user_items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    @staticmethod
    def get_user_detail(db: Session, user_id: UUID) -> Optional[schemas.AdminUserDetailResponse]:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            return None

        cp = db.query(models.UserCareerProfile).filter(models.UserCareerProfile.user_id == user.id).first()
        user_skills = [
            s.skill_name for s in db.query(models.UserSkill).filter(models.UserSkill.user_id == user.id).all()
        ]
        resumes_count = db.query(func.count(models.Resume.id)).filter(models.Resume.user_id == user.id).scalar() or 0
        latest_resume = db.query(models.Resume).filter(models.Resume.user_id == user.id).order_by(models.Resume.created_at.desc()).first()
        interviews_count = db.query(func.count(models.InterviewSession.id)).filter(models.InterviewSession.user_id == user.id).scalar() or 0
        latest_interview = db.query(models.InterviewSession).filter(models.InterviewSession.user_id == user.id).order_by(models.InterviewSession.created_at.desc()).first()
        apps_count = db.query(func.count(models.JobApplication.id)).filter(models.JobApplication.user_id == user.id).scalar() or 0
        goals_count = db.query(func.count(models.CareerGoal.id)).filter(models.CareerGoal.user_id == user.id, models.CareerGoal.is_active == True).scalar() or 0
        recs_count = db.query(func.count(models.CareerRecommendation.id)).filter(models.CareerRecommendation.user_id == user.id).scalar() or 0

        ats_score = latest_resume.ats_score if latest_resume else None
        readiness_score = 88.0 if ats_score and ats_score > 80 else (65.0 if ats_score else 45.0)

        profile_dict = None
        if cp:
            profile_dict = {
                "career_stage": cp.career_stage,
                "target_role": cp.target_role,
                "education_level": cp.education_level,
                "specialization": cp.specialization,
                "experience_level": cp.experience_level,
                "primary_goals": cp.primary_goals or [],
            }

        return schemas.AdminUserDetailResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role or "user",
            is_active=user.is_active,
            is_suspended=user.is_suspended,
            suspended_reason=user.suspended_reason,
            is_email_verified=user.is_email_verified,
            onboarding_completed=cp.onboarding_completed if cp else False,
            target_role=cp.target_role if cp else None,
            career_profile=profile_dict,
            skills=user_skills,
            resumes_count=resumes_count,
            latest_ats_score=ats_score,
            interviews_count=interviews_count,
            latest_interview_score=latest_interview.overall_score if latest_interview else None,
            applications_count=apps_count,
            active_goals_count=goals_count,
            recommendations_count=recs_count,
            readiness_score=readiness_score,
            created_at=user.created_at,
            last_activity_at=user.last_activity_at or user.created_at,
        )

    @staticmethod
    def suspend_user(
        db: Session,
        admin_user: models.User,
        target_user_id: UUID,
        reason: str,
    ) -> Optional[models.User]:
        user = db.query(models.User).filter(models.User.id == target_user_id).first()
        if not user:
            return None

        user.is_suspended = True
        user.suspended_reason = reason
        db.commit()

        AuditService.log_action(
            db=db,
            admin_user_id=admin_user.id,
            action_type="SUSPEND_USER",
            target_user_id=user.id,
            resource_type="user",
            resource_id=str(user.id),
            metadata={"reason": reason, "target_email": user.email},
        )
        return user

    @staticmethod
    def activate_user(
        db: Session,
        admin_user: models.User,
        target_user_id: UUID,
    ) -> Optional[models.User]:
        user = db.query(models.User).filter(models.User.id == target_user_id).first()
        if not user:
            return None

        user.is_suspended = False
        user.suspended_reason = None
        db.commit()

        AuditService.log_action(
            db=db,
            admin_user_id=admin_user.id,
            action_type="ACTIVATE_USER",
            target_user_id=user.id,
            resource_type="user",
            resource_id=str(user.id),
            metadata={"target_email": user.email},
        )
        return user

    @staticmethod
    def get_user_resumes(db: Session, user_id: UUID) -> list[schemas.AdminUserResumeItem]:
        resumes = db.query(models.Resume).filter(models.Resume.user_id == user_id).order_by(models.Resume.created_at.desc()).all()
        items = []
        for r in resumes:
            skills_count = db.query(func.count(models.ResumeSkill.id)).filter(models.ResumeSkill.resume_id == r.id).scalar() or 0
            missing_count = db.query(func.count(models.ResumeMissingSkill.id)).filter(models.ResumeMissingSkill.resume_id == r.id).scalar() or 0
            items.append(
                schemas.AdminUserResumeItem(
                    id=r.id,
                    original_filename=r.original_filename or r.file_name or "Resume",
                    file_size=r.file_size,
                    mime_type=r.mime_type,
                    ats_score=r.ats_score,
                    overall_feedback=r.overall_feedback,
                    uploaded_at=r.uploaded_at or r.created_at,
                    skills_count=skills_count,
                    missing_skills_count=missing_count,
                )
            )
        return items

    @staticmethod
    def get_user_interviews(db: Session, user_id: UUID) -> list[schemas.AdminUserInterviewItem]:
        sessions = db.query(models.InterviewSession).filter(models.InterviewSession.user_id == user_id).order_by(models.InterviewSession.created_at.desc()).all()
        items = []
        for s in sessions:
            msg_count = db.query(func.count(models.InterviewMessage.id)).filter(models.InterviewMessage.session_id == s.id).scalar() or 0
            items.append(
                schemas.AdminUserInterviewItem(
                    id=s.id,
                    role=s.role or "Software Engineer",
                    difficulty=s.difficulty or "Medium",
                    mode=s.mode or "voice",
                    status=s.status or "completed",
                    overall_score=s.overall_score,
                    technical_score=s.technical_score,
                    communication_score=s.communication_score,
                    feedback_summary=s.feedback_summary,
                    messages_count=msg_count,
                    started_at=s.started_at or s.created_at,
                    completed_at=s.completed_at,
                )
            )
        return items

    @staticmethod
    def get_user_applications(db: Session, user_id: UUID) -> list[schemas.AdminUserApplicationItem]:
        apps = db.query(models.JobApplication).filter(models.JobApplication.user_id == user_id).order_by(models.JobApplication.created_at.desc()).all()
        items = []
        for a in apps:
            events_count = db.query(func.count(models.ApplicationEvent.id)).filter(models.ApplicationEvent.application_id == a.id).scalar() or 0
            debriefs_count = db.query(func.count(models.InterviewDebrief.id)).filter(models.InterviewDebrief.application_id == a.id).scalar() or 0
            items.append(
                schemas.AdminUserApplicationItem(
                    id=a.id,
                    company_name=a.company_name,
                    job_title=a.job_title,
                    location=a.location,
                    salary_range=a.salary_range,
                    stage=a.stage,
                    status=a.status,
                    applied_date=a.applied_date,
                    match_score_at_application=a.match_score_at_application,
                    notes=a.notes,
                    events_count=events_count,
                    debriefs_count=debriefs_count,
                )
            )
        return items

    @staticmethod
    def get_user_copilot_sessions(db: Session, user_id: UUID) -> list[schemas.AdminUserCopilotItem]:
        convs = db.query(models.CopilotConversation).filter(models.CopilotConversation.user_id == user_id).order_by(models.CopilotConversation.created_at.desc()).all()
        items = []
        for c in convs:
            msg_count = db.query(func.count(models.CopilotMessage.id)).filter(models.CopilotMessage.conversation_id == c.id).scalar() or 0
            last_msg = db.query(models.CopilotMessage).filter(models.CopilotMessage.conversation_id == c.id).order_by(models.CopilotMessage.created_at.desc()).first()
            items.append(
                schemas.AdminUserCopilotItem(
                    id=c.id,
                    title=c.title,
                    messages_count=msg_count,
                    last_message_preview=last_msg.content[:120] if last_msg else None,
                    created_at=c.created_at,
                    updated_at=c.updated_at,
                )
            )
        return items

    @staticmethod
    def get_user_activities(db: Session, user_id: UUID) -> list[schemas.AdminUserActivityItem]:
        acts = db.query(models.CareerActivity).filter(models.CareerActivity.user_id == user_id).order_by(models.CareerActivity.created_at.desc()).limit(100).all()
        return [
            schemas.AdminUserActivityItem(
                id=a.id,
                activity_type=a.activity_type,
                title=a.title,
                description=a.description,
                created_at=a.created_at,
            )
            for a in acts
        ]

    @staticmethod
    def get_user_audit_history(db: Session, user_id: UUID) -> list[schemas.AdminAuditLogResponse]:
        logs = db.query(models.AdminAuditLog).filter(models.AdminAuditLog.target_user_id == user_id).order_by(models.AdminAuditLog.created_at.desc()).limit(100).all()
        return logs

