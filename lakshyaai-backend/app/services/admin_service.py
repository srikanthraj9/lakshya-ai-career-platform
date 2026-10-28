import logging
import os
import math
import threading
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone
from fastapi import HTTPException
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

# Process-level concurrency coordinator for last-super-admin critical sections
_SUPER_ADMIN_MUTATION_LOCK = threading.Lock()


def is_bootstrap_admin(email: Optional[str]) -> bool:
    """Consistently normalize and evaluate whether an email belongs to a bootstrap administrator."""
    if not email:
        return False
    return email.strip().lower() in BOOTSTRAP_ADMIN_EMAILS


def get_active_super_admins_locked(db: Session) -> List[models.User]:
    """
    Query all active, non-suspended super administrators ordered deterministically by ID.
    Uses with_for_update() to acquire row-level locks on PostgreSQL/Supabase,
    which safely degrades to standard rows on SQLite.
    """
    return (
        db.query(models.User)
        .filter(
            models.User.role == "super_admin",
            models.User.is_active == True,
            models.User.is_suspended == False,
        )
        .order_by(models.User.id.asc())
        .with_for_update()
        .all()
    )


class AdminService:
    @staticmethod
    def bootstrap_admin_users(db: Session):
        """Idempotently elevate configured bootstrap emails to super_admin only if email is verified."""
        for email in BOOTSTRAP_ADMIN_EMAILS:
            user = db.query(models.User).filter(func.lower(models.User.email) == email).first()
            if user and getattr(user, "is_email_verified", False):
                if user.role != "super_admin":
                    user.role = "super_admin"
                    db.commit()
                    logger.info(f"[AdminBootstrap] Bootstrapped verified {email} to super_admin role.")

    @staticmethod
    def backfill_oauth_providers(db: Session):
        """Idempotently ensure known Google OAuth accounts have auth_provider set in primary_goals."""
        from sqlalchemy.orm.attributes import flag_modified
        known_oauth_emails = [
            "srikanthrajuppalapati999@gmail.com",
        ]
        for email in known_oauth_emails:
            user = db.query(models.User).filter(func.lower(models.User.email) == email.lower()).first()
            if user:
                profile = db.query(models.UserCareerProfile).filter(models.UserCareerProfile.user_id == user.id).first()
                if profile:
                    meta = {}
                    if isinstance(profile.primary_goals, dict):
                        meta = dict(profile.primary_goals)
                    elif isinstance(profile.primary_goals, list):
                        meta = {"goals": profile.primary_goals}
                    if meta.get("auth_provider") != "google":
                        meta["auth_provider"] = "google"
                        profile.primary_goals = meta
                        flag_modified(profile, "primary_goals")
                        db.commit()
                        logger.info(f"[OAuthBackfill] Backfilled auth_provider='google' for user {email}")


    @staticmethod
    def list_users(
        db: Session,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        role: Optional[str] = None,
        is_suspended: Optional[bool] = None,
        sort_by: Optional[str] = "created_at",
        sort_order: Optional[str] = "desc",
    ) -> schemas.AdminUserListResponse:
        from app.services.readiness_service import CandidateReadinessService

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

        # Allowlisted deterministic sorting
        sort_field_map = {
            "created_at": models.User.created_at,
            "name": models.User.full_name,
            "full_name": models.User.full_name,
            "email": models.User.email,
            "role": models.User.role,
            "status": models.User.is_suspended,
            "is_suspended": models.User.is_suspended,
            "last_activity_at": models.User.last_activity_at,
        }
        col = sort_field_map.get((sort_by or "created_at").lower(), models.User.created_at)
        if (sort_order or "desc").lower() == "asc":
            query = query.order_by(col.asc(), models.User.id.asc())
        else:
            query = query.order_by(col.desc(), models.User.id.desc())

        users = query.offset(offset).limit(page_size).all()

        total_pages = max(1, math.ceil(total / page_size))
        if not users:
            return schemas.AdminUserListResponse(
                users=[],
                total=total,
                page=page,
                page_size=page_size,
                total_pages=total_pages,
            )

        user_ids = [u.id for u in users]

        # Batched query 1: Career profiles
        career_profiles = (
            db.query(models.UserCareerProfile)
            .filter(models.UserCareerProfile.user_id.in_(user_ids))
            .all()
        )
        cp_map = {cp.user_id: cp for cp in career_profiles}

        # Batched query 2: Job applications count
        apps_counts = (
            db.query(models.JobApplication.user_id, func.count(models.JobApplication.id))
            .filter(models.JobApplication.user_id.in_(user_ids))
            .group_by(models.JobApplication.user_id)
            .all()
        )
        apps_count_map = {uid: count for uid, count in apps_counts}

        # Batched query 3: Interview sessions (yields both count and latest score)
        interview_rows = (
            db.query(models.InterviewSession.user_id, models.InterviewSession.overall_score, models.InterviewSession.created_at)
            .filter(models.InterviewSession.user_id.in_(user_ids))
            .order_by(models.InterviewSession.created_at.desc())
            .all()
        )
        interviews_count_map = {}
        latest_interview_score_map = {}
        for uid, ovr_score, _ in interview_rows:
            interviews_count_map[uid] = interviews_count_map.get(uid, 0) + 1
            if uid not in latest_interview_score_map:
                latest_interview_score_map[uid] = ovr_score

        # Batched query 4: Latest resume per user
        resume_rows = (
            db.query(models.Resume.user_id, models.Resume.ats_score, models.Resume.created_at)
            .filter(models.Resume.user_id.in_(user_ids))
            .order_by(models.Resume.created_at.desc())
            .all()
        )
        latest_resume_map = {}
        for uid, ats_score, _ in resume_rows:
            if uid not in latest_resume_map:
                latest_resume_map[uid] = ats_score

        user_items = []
        for u in users:
            cp = cp_map.get(u.id)
            apps_count = apps_count_map.get(u.id, 0)
            int_count = interviews_count_map.get(u.id, 0)
            has_resume = u.id in latest_resume_map
            ats_score = latest_resume_map.get(u.id)

            readiness_score = CandidateReadinessService.calculate_readiness(
                ats_score=ats_score,
                latest_interview_score=latest_interview_score_map.get(u.id),
                interviews_count=int_count,
                onboarding_completed=cp.onboarding_completed if cp else False,
                applications_count=apps_count,
                has_resume=has_resume,
            )

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
                    ats_score=ats_score,
                    readiness_score=readiness_score,
                    applications_count=apps_count,
                    interviews_count=int_count,
                    last_activity_at=u.last_activity_at or u.created_at,
                    created_at=u.created_at,
                )
            )

        return schemas.AdminUserListResponse(
            users=user_items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    @staticmethod
    def get_user_detail(db: Session, user_id: UUID) -> Optional[schemas.AdminUserDetailResponse]:
        from app.services.readiness_service import CandidateReadinessService

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
        readiness_score = CandidateReadinessService.calculate_readiness(
            ats_score=ats_score,
            latest_interview_score=latest_interview.overall_score if latest_interview else None,
            interviews_count=interviews_count,
            onboarding_completed=cp.onboarding_completed if cp else False,
            applications_count=apps_count,
            has_resume=resumes_count > 0,
        )

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

        # Double-check bootstrap admin protection in service layer
        if is_bootstrap_admin(user.email):
            raise HTTPException(
                status_code=400,
                detail="Protected bootstrap administrator accounts cannot be suspended."
            )

        user.is_suspended = True
        user.suspended_reason = reason
        AuditService.log_action(
            db=db,
            admin_user_id=admin_user.id,
            action_type="SUSPEND_USER",
            target_user_id=user.id,
            resource_type="user",
            resource_id=str(user.id),
            metadata={"reason": reason, "target_email": user.email},
            commit=False,
        )
        db.commit()
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
        AuditService.log_action(
            db=db,
            admin_user_id=admin_user.id,
            action_type="ACTIVATE_USER",
            target_user_id=user.id,
            resource_type="user",
            resource_id=str(user.id),
            metadata={"target_email": user.email},
            commit=False,
        )
        db.commit()
        return user

    @staticmethod
    def bulk_update_user_status(
        db: Session,
        admin_user: models.User,
        user_ids: list[UUID],
        action: str,
        reason: Optional[str] = None,
    ) -> schemas.AdminUserBulkStatusResponse:
        results = []
        successful_count = 0
        failed_count = 0

        for uid in user_ids:
            user = db.query(models.User).filter(models.User.id == uid).first()
            if not user:
                results.append(schemas.AdminUserBulkStatusItem(
                    user_id=str(uid),
                    email="unknown",
                    status="not_found",
                    success=False,
                    error="User not found",
                ))
                failed_count += 1
                continue

            # Protection guard: Bootstrap administrator accounts are protected
            if is_bootstrap_admin(user.email):
                results.append(schemas.AdminUserBulkStatusItem(
                    user_id=str(uid),
                    email=user.email,
                    status=user.role,
                    success=False,
                    error="Protected bootstrap administrator account.",
                ))
                failed_count += 1
                continue

            # Protection guard: Super administrator accounts cannot be suspended or bulk-modified
            if user.role == "super_admin":
                results.append(schemas.AdminUserBulkStatusItem(
                    user_id=str(uid),
                    email=user.email,
                    status=user.role,
                    success=False,
                    error="Super administrator accounts are protected and cannot be modified via bulk operations.",
                ))
                failed_count += 1
                continue

            # Protection guard: Administrators cannot modify their own status via bulk operations
            if user.id == admin_user.id:
                results.append(schemas.AdminUserBulkStatusItem(
                    user_id=str(uid),
                    email=user.email,
                    status=user.role,
                    success=False,
                    error="Administrators cannot modify their own account status via bulk operations.",
                ))
                failed_count += 1
                continue

            if action == "suspend":
                user.is_suspended = True
                user.suspended_reason = reason or "Bulk suspended by administrator"
                AuditService.log_action(
                    db=db,
                    admin_user_id=admin_user.id,
                    action_type="BULK_SUSPEND_USER",
                    target_user_id=user.id,
                    resource_type="user",
                    resource_id=str(user.id),
                    metadata={"reason": reason, "target_email": user.email},
                    commit=False,
                )
                db.commit()
                results.append(schemas.AdminUserBulkStatusItem(
                    user_id=str(uid),
                    email=user.email,
                    status="suspended",
                    success=True,
                ))
                successful_count += 1
            elif action == "activate":
                user.is_suspended = False
                user.suspended_reason = None
                AuditService.log_action(
                    db=db,
                    admin_user_id=admin_user.id,
                    action_type="BULK_ACTIVATE_USER",
                    target_user_id=user.id,
                    resource_type="user",
                    resource_id=str(user.id),
                    metadata={"target_email": user.email},
                    commit=False,
                )
                db.commit()
                results.append(schemas.AdminUserBulkStatusItem(
                    user_id=str(uid),
                    email=user.email,
                    status="active",
                    success=True,
                ))
                successful_count += 1

        return schemas.AdminUserBulkStatusResponse(
            action=action,
            total_requested=len(user_ids),
            successful_count=successful_count,
            failed_count=failed_count,
            results=results,
        )

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

