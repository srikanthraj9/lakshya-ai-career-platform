from datetime import datetime, timezone, timedelta
import hashlib
import hmac
import logging
import secrets
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.core.dependencies import get_current_user
from app.core.security import verify_password
from app.db import models, schemas
from app.db.database import get_db
from app.services.storage.file_storage import FileStorageService
from app.services.resume.rewrite_storage import ResumeRewriteStorage

router = APIRouter(prefix="/users", tags=["Users"])
logger = logging.getLogger("lakshyaai.users")


def _extract_meta(profile: Optional[models.UserCareerProfile]) -> Dict[str, Any]:
    if not profile or profile.primary_goals is None:
        return {}
    if isinstance(profile.primary_goals, dict):
        return profile.primary_goals
    if isinstance(profile.primary_goals, list):
        return {"goals": profile.primary_goals}
    return {}


def _get_auth_provider(user: models.User, profile: Optional[models.UserCareerProfile] = None) -> str:
    """
    Returns trusted authentication provider from server-side user/profile data.
    Supports standard ('auth_provider') and legacy metadata keys ('provider', 'authProvider', 'oauth_provider'),
    pre-existing Google OAuth accounts whose metadata was not initially backfilled,
    and falls back strictly to 'password'.
    """
    # 1. Check in-memory user attribute or property (e.g. for testing / explicit overrides)
    if hasattr(user, "auth_provider") and getattr(user, "auth_provider"):
        prov = getattr(user, "auth_provider")
        if prov and prov != "password":
            return prov

    prof = profile or (user.career_profile if hasattr(user, "career_profile") else None)
    if prof:
        meta = _extract_meta(prof)
        # Check standard and legacy metadata keys
        for key in ("auth_provider", "provider", "authProvider", "oauth_provider", "oauth", "identity_provider"):
            val = meta.get(key)
            if val and isinstance(val, str):
                return val.lower().strip()

    # 2. Pre-existing Google OAuth accounts that predate metadata tracking
    KNOWN_OAUTH_EMAILS = {"srikanthrajuppalapati999@gmail.com"}
    if user and user.email and user.email.strip().lower() in KNOWN_OAUTH_EMAILS:
        if prof:
            meta = _extract_meta(prof)
            if meta.get("auth_provider") != "google":
                meta["auth_provider"] = "google"
                prof.primary_goals = dict(meta)
                flag_modified(prof, "primary_goals")
        return "google"

    # 3. Check private in-memory attribute
    if hasattr(user, "_auth_provider") and getattr(user, "_auth_provider"):
        return getattr(user, "_auth_provider")

    return "password"



def _calculate_completeness(user: models.User, profile: Optional[models.UserCareerProfile], skills_count: int) -> int:
    score = 0
    if user.full_name:
        score += 15
    if user.email:
        score += 10
    if user.is_email_verified:
        score += 10
    if profile:
        if profile.target_role:
            score += 15
        if profile.experience_level:
            score += 10
        if profile.education_level or profile.college:
            score += 10
        meta = _extract_meta(profile)
        if meta.get("headline") or meta.get("bio"):
            score += 10
        if meta.get("portfolio_url") or meta.get("linkedin_url") or meta.get("github_url"):
            score += 10
    if skills_count > 0:
        score += 10
    if skills_count >= 5:
        score += 10
    return min(100, score)


# ---------------------------------------------------
# GET CURRENT USER BASIC
# ---------------------------------------------------

@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    onboarding_completed = False
    onboarding_current_step = 1
    meta = {}
    if current_user.career_profile:
        onboarding_completed = current_user.career_profile.onboarding_completed
        onboarding_current_step = current_user.career_profile.onboarding_current_step
        meta = _extract_meta(current_user.career_profile)

    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role or "user",
        "is_suspended": bool(current_user.is_suspended),
        "is_email_verified": current_user.is_email_verified,
        "onboarding_completed": onboarding_completed,
        "onboarding_current_step": onboarding_current_step,
        "auth_provider": _get_auth_provider(current_user, current_user.career_profile),
        "created_at": current_user.created_at,
    }


# ---------------------------------------------------
# GET FULL PROFESSIONAL PROFILE
# ---------------------------------------------------

@router.get("/profile")
def get_profile(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = (
        db.query(models.UserCareerProfile)
        .filter(models.UserCareerProfile.user_id == current_user.id)
        .first()
    )
    skills = (
        db.query(models.UserSkill)
        .filter(models.UserSkill.user_id == current_user.id)
        .order_by(models.UserSkill.created_at)
        .all()
    )

    meta = _extract_meta(profile)
    goals = meta.get("goals", [])
    if profile and isinstance(profile.primary_goals, list) and not goals:
        goals = profile.primary_goals

    skills_data = [
        {
            "id": s.id,
            "user_id": s.user_id,
            "skill_name": s.skill_name,
            "skill_category": s.skill_category or "technical",
            "source": s.source or "manual",
            "confidence": s.confidence if s.confidence is not None else 1.0,
            "created_at": s.created_at,
            "updated_at": s.updated_at,
        }
        for s in skills
    ]

    completeness = _calculate_completeness(current_user, profile, len(skills))

    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role or "user",
        "is_email_verified": current_user.is_email_verified,
        "created_at": current_user.created_at,
        "headline": meta.get("headline", ""),
        "bio": meta.get("bio", ""),
        "location": meta.get("location", ""),
        "target_role": profile.target_role if profile else "",
        "career_stage": profile.career_stage if profile else "",
        "experience_level": profile.experience_level if profile else "",
        "education_level": profile.education_level if profile else "",
        "college": profile.college if profile else "",
        "graduation_year": profile.graduation_year if profile else "",
        "specialization": profile.specialization if profile else "",
        "work_preference": meta.get("work_preference", "Remote / Hybrid"),
        "employment_type": meta.get("employment_type", "Full-time"),
        "portfolio_url": meta.get("portfolio_url", ""),
        "linkedin_url": meta.get("linkedin_url", ""),
        "github_url": meta.get("github_url", ""),
        "primary_goals": goals,
        "skills": skills_data,
        "profile_completeness": completeness,
        "share_token": meta.get("share_token"),
        "is_public_passport": bool(meta.get("is_public_passport", False)),
        "auth_provider": _get_auth_provider(current_user, profile),
    }


# ---------------------------------------------------
# UPDATE PROFESSIONAL PROFILE
# ---------------------------------------------------

@router.patch("/profile")
def update_profile(
    payload: schemas.UserProfileUpdateRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.full_name is not None:
        cleaned_name = payload.full_name.strip()
        if cleaned_name:
            current_user.full_name = cleaned_name

    profile = (
        db.query(models.UserCareerProfile)
        .filter(models.UserCareerProfile.user_id == current_user.id)
        .first()
    )
    if not profile:
        profile = models.UserCareerProfile(
            user_id=current_user.id,
            onboarding_current_step=1,
            onboarding_completed=False,
            primary_goals={},
        )
        db.add(profile)
        db.flush()

    meta = _extract_meta(profile)

    if payload.target_role is not None:
        profile.target_role = payload.target_role.strip()
    if payload.experience_level is not None:
        profile.experience_level = payload.experience_level.strip()
    if payload.education_level is not None:
        profile.education_level = payload.education_level.strip()
    if payload.college is not None:
        profile.college = payload.college.strip()
    if payload.graduation_year is not None:
        profile.graduation_year = str(payload.graduation_year).strip()
    if payload.career_stage is not None:
        profile.career_stage = payload.career_stage.strip()

    if payload.primary_goals is not None:
        meta["goals"] = payload.primary_goals
    if payload.headline is not None:
        meta["headline"] = payload.headline.strip()
    if payload.bio is not None:
        meta["bio"] = payload.bio.strip()
    if payload.location is not None:
        meta["location"] = payload.location.strip()
    if payload.work_preference is not None:
        meta["work_preference"] = payload.work_preference.strip()
    if payload.employment_type is not None:
        meta["employment_type"] = payload.employment_type.strip()
    if payload.portfolio_url is not None:
        meta["portfolio_url"] = payload.portfolio_url.strip()
    if payload.linkedin_url is not None:
        meta["linkedin_url"] = payload.linkedin_url.strip()
    if payload.github_url is not None:
        meta["github_url"] = payload.github_url.strip()

    profile.primary_goals = dict(meta)
    flag_modified(profile, "primary_goals")
    db.commit()
    db.refresh(profile)
    db.refresh(current_user)

    return get_profile(current_user=current_user, db=db)


# ---------------------------------------------------
# USER SKILLS CRUD (SKILL PASSPORT)
# ---------------------------------------------------

@router.get("/skills", response_model=List[schemas.UserSkillResponse])
def get_user_skills(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    skills = (
        db.query(models.UserSkill)
        .filter(models.UserSkill.user_id == current_user.id)
        .order_by(models.UserSkill.created_at.desc())
        .all()
    )
    return skills


@router.post("/skills", response_model=schemas.UserSkillResponse)
def add_user_skill(
    payload: schemas.UserSkillCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cleaned_name = payload.skill_name.strip()
    if not cleaned_name:
        raise HTTPException(status_code=400, detail="Skill name cannot be empty")

    existing = (
        db.query(models.UserSkill)
        .filter(
            models.UserSkill.user_id == current_user.id,
            models.UserSkill.skill_name.ilike(cleaned_name),
        )
        .first()
    )
    if existing:
        if payload.skill_category:
            existing.skill_category = payload.skill_category
        if payload.source:
            existing.source = payload.source
        if payload.confidence is not None:
            existing.confidence = payload.confidence
        db.commit()
        db.refresh(existing)
        return existing

    new_skill = models.UserSkill(
        user_id=current_user.id,
        skill_name=cleaned_name,
        skill_category=payload.skill_category or "technical",
        source=payload.source or "manual",
        confidence=payload.confidence if payload.confidence is not None else 1.0,
    )
    db.add(new_skill)
    db.commit()
    db.refresh(new_skill)
    return new_skill


@router.delete("/skills/{skill_id}")
def delete_user_skill(
    skill_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    skill = (
        db.query(models.UserSkill)
        .filter(
            models.UserSkill.id == skill_id,
            models.UserSkill.user_id == current_user.id,
        )
        .first()
    )
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    db.delete(skill)
    db.commit()
    return {"message": "Skill deleted successfully"}


# ---------------------------------------------------
# USER SETTINGS (PERSISTENCE)
# ---------------------------------------------------

DEFAULT_SETTINGS = {
    "notification_preferences": {
        "in_app_enabled": True,
        "email_enabled": False,
        "job_matches": True,
        "interview_reminders": True,
        "roadmap_reminders": True,
        "career_insights": True,
        "weekly_summary": False,
    },
    "privacy_settings": {
        "passport_public": False,
        "analytics_opt_in": True,
        "personalized_recommendations": True,
    },
    "appearance_settings": {
        "theme": "dark",
        "reduced_motion": False,
        "compact_mode": False,
    },
    "career_preferences": {
        "target_role": "",
        "work_location": "Remote",
        "employment_type": "Full-time",
        "actively_looking": True,
    },
}


@router.get("/settings", response_model=schemas.UserSettingsResponse)
def get_user_settings(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = (
        db.query(models.UserCareerProfile)
        .filter(models.UserCareerProfile.user_id == current_user.id)
        .first()
    )
    meta = _extract_meta(profile)
    saved_settings = meta.get("settings", {})

    merged = {
        "notification_preferences": {
            **DEFAULT_SETTINGS["notification_preferences"],
            **saved_settings.get("notification_preferences", {}),
        },
        "privacy_settings": {
            **DEFAULT_SETTINGS["privacy_settings"],
            **saved_settings.get("privacy_settings", {}),
        },
        "appearance_settings": {
            **DEFAULT_SETTINGS["appearance_settings"],
            **saved_settings.get("appearance_settings", {}),
        },
        "career_preferences": {
            **DEFAULT_SETTINGS["career_preferences"],
            "target_role": profile.target_role if profile and profile.target_role else "",
            **saved_settings.get("career_preferences", {}),
        },
    }
    return merged


@router.patch("/settings", response_model=schemas.UserSettingsResponse)
def update_user_settings(
    payload: schemas.UserSettingsUpdateRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = (
        db.query(models.UserCareerProfile)
        .filter(models.UserCareerProfile.user_id == current_user.id)
        .first()
    )
    if not profile:
        profile = models.UserCareerProfile(
            user_id=current_user.id,
            onboarding_current_step=1,
            onboarding_completed=False,
            primary_goals={},
        )
        db.add(profile)
        db.flush()

    meta = _extract_meta(profile)
    settings = meta.get("settings", {})

    if payload.notification_preferences is not None:
        settings["notification_preferences"] = {
            **settings.get("notification_preferences", {}),
            **payload.notification_preferences,
        }
    if payload.privacy_settings is not None:
        settings["privacy_settings"] = {
            **settings.get("privacy_settings", {}),
            **payload.privacy_settings,
        }
    if payload.appearance_settings is not None:
        settings["appearance_settings"] = {
            **settings.get("appearance_settings", {}),
            **payload.appearance_settings,
        }
    if payload.career_preferences is not None:
        settings["career_preferences"] = {
            **settings.get("career_preferences", {}),
            **payload.career_preferences,
        }
        if "target_role" in payload.career_preferences and payload.career_preferences["target_role"]:
            profile.target_role = str(payload.career_preferences["target_role"]).strip()

    meta["settings"] = settings
    profile.primary_goals = dict(meta)
    flag_modified(profile, "primary_goals")
    db.commit()
    db.refresh(profile)

    return get_user_settings(current_user=current_user, db=db)


# ---------------------------------------------------
# SKILL PASSPORT SHARING
# ---------------------------------------------------

@router.post("/passport/share", response_model=schemas.PassportShareResponse)
def create_passport_share_token(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = (
        db.query(models.UserCareerProfile)
        .filter(models.UserCareerProfile.user_id == current_user.id)
        .first()
    )
    if not profile:
        profile = models.UserCareerProfile(
            user_id=current_user.id,
            onboarding_current_step=1,
            onboarding_completed=False,
            primary_goals={},
        )
        db.add(profile)
        db.flush()

    meta = _extract_meta(profile)
    token = meta.get("share_token")
    if not token:
        token = secrets.token_urlsafe(24)
        meta["share_token"] = token

    meta["is_public_passport"] = True
    profile.primary_goals = dict(meta)
    flag_modified(profile, "primary_goals")
    db.commit()

    return {
        "is_public": True,
        "share_token": token,
        "share_url": f"/passport/shared/{token}",
    }


@router.delete("/passport/share", response_model=schemas.PassportShareResponse)
def revoke_passport_share_token(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = (
        db.query(models.UserCareerProfile)
        .filter(models.UserCareerProfile.user_id == current_user.id)
        .first()
    )
    if profile:
        meta = _extract_meta(profile)
        meta["is_public_passport"] = False
        meta["share_token"] = None
        profile.primary_goals = dict(meta)
        flag_modified(profile, "primary_goals")
        db.commit()

    return {
        "is_public": False,
        "share_token": None,
        "share_url": None,
    }


@router.get("/passport/shared/{token}", response_model=schemas.SharedSkillPassportResponse)
def get_shared_passport(
    token: str,
    db: Session = Depends(get_db),
):
    # Find profile with matching share_token and is_public_passport == True
    profiles = db.query(models.UserCareerProfile).all()
    matched_profile = None
    for p in profiles:
        meta = _extract_meta(p)
        if meta.get("share_token") == token and meta.get("is_public_passport") is True:
            matched_profile = p
            break

    if not matched_profile:
        raise HTTPException(
            status_code=404,
            detail="Shared Skill Passport not found or sharing has been disabled",
        )

    user = db.query(models.User).filter(models.User.id == matched_profile.user_id).first()
    if not user or user.is_suspended:
        raise HTTPException(
            status_code=404,
            detail="Shared Skill Passport is currently unavailable",
        )

    skills = (
        db.query(models.UserSkill)
        .filter(models.UserSkill.user_id == user.id)
        .all()
    )
    meta = _extract_meta(matched_profile)

    skills_projection = [
        {
            "skill_name": s.skill_name,
            "skill_category": s.skill_category or "technical",
            "source": s.source or "manual",
            "confidence": s.confidence if s.confidence is not None else 1.0,
        }
        for s in skills
    ]

    career_state = (
        db.query(models.UserCareerState)
        .filter(models.UserCareerState.user_id == user.id)
        .first()
    )
    alignment_score = career_state.score if career_state else 75.0

    return {
        "full_name": user.full_name or "Lakshya Professional",
        "headline": meta.get("headline", f"Aspiring {matched_profile.target_role or 'Engineer'}"),
        "target_role": matched_profile.target_role,
        "experience_level": matched_profile.experience_level,
        "skills": skills_projection,
        "alignment_score": alignment_score,
        "shared_at": datetime.now(timezone.utc),
    }


# ---------------------------------------------------
# SELF-SERVICE ACCOUNT DELETION
# ---------------------------------------------------

@router.post("/me/deletion-token", response_model=schemas.DeletionTokenResponse)
def create_deletion_token(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Issues a cryptographically secure, short-lived (5 min), single-use deletion
    authorization token for OAuth-authenticated users (e.g. Google OAuth) who
    do not possess a local account password.
    """
    profile = (
        db.query(models.UserCareerProfile)
        .filter(models.UserCareerProfile.user_id == current_user.id)
        .first()
    )
    if not profile:
        profile = models.UserCareerProfile(
            user_id=current_user.id,
            onboarding_current_step=1,
            onboarding_completed=False,
            primary_goals={},
        )
        db.add(profile)
        db.flush()

    auth_provider = _get_auth_provider(current_user, profile)
    if auth_provider == "password":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Deletion authorization tokens are only applicable to OAuth-authenticated accounts. Password-authenticated accounts must provide their current password.",
        )

    # Generate cryptographically secure single-use token and store sha256 hash
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

    meta = _extract_meta(profile)
    meta["deletion_challenge"] = {
        "token_hash": token_hash,
        "expires_at": expires_at.isoformat(),
        "issued_at": datetime.now(timezone.utc).isoformat(),
        "used": False,
    }
    profile.primary_goals = dict(meta)
    flag_modified(profile, "primary_goals")
    db.commit()

    logger.info("Issued short-lived deletion token for OAuth user_id=%s expires_at=%s", current_user.id, expires_at.isoformat())

    return schemas.DeletionTokenResponse(
        deletion_token=raw_token,
        expires_in_seconds=300,
        auth_provider=auth_provider,
    )


def _perform_account_deletion(
    payload: schemas.AccountDeletionRequest,
    current_user: models.User,
    db: Session,
) -> schemas.AccountDeletionResponse:
    # 1. Enforce strict confirmation keyword
    if not payload.confirmation or payload.confirmation.strip() != "DELETE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="To delete your account permanently, you must explicitly confirm by typing 'DELETE'.",
        )

    profile = (
        db.query(models.UserCareerProfile)
        .filter(models.UserCareerProfile.user_id == current_user.id)
        .first()
    )
    meta = _extract_meta(profile) if profile else {}

    # 2. Identify authenticated user's actual auth provider using trusted server data
    auth_provider = _get_auth_provider(current_user, profile)

    if auth_provider == "password":
        # Password-authenticated accounts MUST provide their current password.
        # Deletion tokens cannot bypass password verification for password accounts.
        if not payload.password or not payload.password.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Your current account password is required to verify account ownership before deletion.",
            )
        if not verify_password(payload.password, current_user.password_hash):
            logger.warning("Account deletion rejected: incorrect password for user_id=%s", current_user.id)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password. Account deletion aborted.",
            )
    else:
        # OAuth account (e.g. Google OAuth)
        # Require secure, short-lived, single-use deletion authorization token
        if not payload.deletion_token or not payload.deletion_token.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A valid deletion authorization token is required for Google OAuth accounts. Please request a deletion token before confirming.",
            )

        challenge = meta.get("deletion_challenge")
        if not challenge or not isinstance(challenge, dict):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No active deletion authorization challenge found. Please request a new deletion token.",
            )

        if challenge.get("used"):
            logger.warning("Account deletion rejected: deletion token already used for user_id=%s", current_user.id)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This deletion authorization token has already been used. Please request a new token.",
            )

        raw_expires_at = challenge.get("expires_at")
        try:
            expires_at = datetime.fromisoformat(raw_expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid deletion authorization challenge. Please request a new token.",
            )

        if datetime.now(timezone.utc) > expires_at:
            logger.warning("Account deletion rejected: deletion token expired for user_id=%s", current_user.id)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Deletion authorization token has expired. Please request a new token.",
            )

        expected_hash = challenge.get("token_hash", "")
        actual_hash = hashlib.sha256(payload.deletion_token.strip().encode("utf-8")).hexdigest()
        if not hmac.compare_digest(expected_hash, actual_hash):
            logger.warning("Account deletion rejected: invalid token hash for user_id=%s", current_user.id)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid deletion authorization token.",
            )

        # Invalidate token immediately to prevent replay attacks
        challenge["used"] = True
        if profile:
            profile.primary_goals = dict(meta)
            flag_modified(profile, "primary_goals")
            db.flush()

    user_id = current_user.id
    logger.info("Initiating self-service account deletion for user_id=%s (auth_provider=%s)", user_id, auth_provider)

    try:
        # 3. Invalidate and revoke Skill Passport sharing immediately
        if profile:
            meta["is_public_passport"] = False
            meta["share_token"] = None
            profile.primary_goals = dict(meta)
            flag_modified(profile, "primary_goals")
            db.flush()

        # 4. Clean up any active admin simulation sessions
        db.query(models.AdminSimulationSession).filter(
            (models.AdminSimulationSession.admin_user_id == user_id) |
            (models.AdminSimulationSession.target_user_id == user_id)
        ).delete(synchronize_session=False)

        # 5. Anonymize user feedback records to preserve analytics without PII
        db.query(models.UserFeedback).filter(
            models.UserFeedback.user_id == user_id
        ).update({"user_id": None}, synchronize_session=False)

        # 6. Physical file cleanup: remove stored resumes and compiled rewrites
        deleted_resumes = FileStorageService.delete_user_files(user_id)
        deleted_rewrites = ResumeRewriteStorage.delete_user_rewrites(user_id)
        logger.info(
            "Cleaned up storage assets for user_id=%s (resumes=%d, rewrites=%d)",
            user_id,
            deleted_resumes,
            deleted_rewrites,
        )

        # 7. Record an immutable audit log entry for compliance (retains only target UUID and action)
        audit_entry = models.AdminAuditLog(
            admin_user_id=None,
            action_type="SELF_SERVICE_ACCOUNT_DELETION",
            target_user_id=user_id,
            resource_type="User",
            resource_id=str(user_id),
            action_metadata={
                "action": "user_self_deletion",
                "role": current_user.role,
                "auth_provider": auth_provider,
                "deleted_at": datetime.now(timezone.utc).isoformat(),
            },
            reason="User self-service account deletion requested and verified",
            severity="critical",
            confirmation_value="DELETE",
        )
        db.add(audit_entry)
        db.flush()

        # 8. Delete user entity from database (cascades delete across all related records)
        db.delete(current_user)
        db.commit()

        logger.info("Successfully completed account deletion for user_id=%s", user_id)
        return schemas.AccountDeletionResponse(
            success=True,
            message="Your account and all associated personal data have been permanently deleted.",
            deleted_at=datetime.now(timezone.utc),
        )

    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        logger.error("Failed to delete account for user_id=%s: %s", user_id, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete account due to a server error. Your account has not been deleted.",
        )


@router.delete("/me", response_model=schemas.AccountDeletionResponse)
def delete_account_delete(
    payload: schemas.AccountDeletionRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _perform_account_deletion(payload, current_user, db)


@router.post("/me/delete", response_model=schemas.AccountDeletionResponse)
def delete_account_post(
    payload: schemas.AccountDeletionRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _perform_account_deletion(payload, current_user, db)