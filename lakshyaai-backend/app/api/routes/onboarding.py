import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db import models
from app.db.database import get_db
from app.db.schemas import (
    OnboardingCompleteRequest,
    OnboardingStepSave,
    UserCareerProfileResponse,
)

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])
logger = logging.getLogger("lakshyaai.onboarding")


def _get_or_create_profile(db: Session, user: models.User) -> models.UserCareerProfile:
    profile = (
        db.query(models.UserCareerProfile)
        .filter(models.UserCareerProfile.user_id == user.id)
        .first()
    )
    if not profile:
        profile = models.UserCareerProfile(
            user_id=user.id,
            onboarding_current_step=1,
            onboarding_completed=False,
            primary_goals=[],
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def _sync_user_skills(db: Session, user: models.User, skill_names: List[str], source: str = "onboarding") -> None:
    if not skill_names:
        return

    existing_skills = {
        s.skill_name.strip().lower(): s
        for s in db.query(models.UserSkill).filter(models.UserSkill.user_id == user.id).all()
    }

    for name in skill_names:
        cleaned = name.strip()
        if not cleaned:
            continue
        key = cleaned.lower()
        if key in existing_skills:
            continue

        new_skill = models.UserSkill(
            user_id=user.id,
            skill_name=cleaned,
            skill_category="technical",
            source=source,
            confidence=1.0,
        )
        db.add(new_skill)
        existing_skills[key] = new_skill

    db.commit()


def _build_profile_response(db: Session, profile: models.UserCareerProfile, user: models.User) -> dict:
    skills = [
        s.skill_name
        for s in db.query(models.UserSkill)
        .filter(models.UserSkill.user_id == user.id)
        .order_by(models.UserSkill.created_at)
        .all()
    ]

    return {
        "user_id": profile.user_id,
        "onboarding_current_step": profile.onboarding_current_step,
        "onboarding_completed": profile.onboarding_completed,
        "career_stage": profile.career_stage,
        "primary_goals": profile.primary_goals or [],
        "education_level": profile.education_level,
        "specialization": profile.specialization,
        "graduation_year": profile.graduation_year,
        "college": profile.college,
        "experience_level": profile.experience_level,
        "target_role": profile.target_role,
        "is_exploring_roles": profile.is_exploring_roles,
        "skills": skills,
        "updated_at": profile.updated_at,
    }


# ---------------------------------------------------
# GET CAREER PROFILE
# ---------------------------------------------------

@router.get("/profile", response_model=UserCareerProfileResponse)
def get_onboarding_profile(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    profile = _get_or_create_profile(db, current_user)
    return _build_profile_response(db, profile, current_user)


# ---------------------------------------------------
# SAVE ONBOARDING STEP
# ---------------------------------------------------

@router.post("/save-step", response_model=UserCareerProfileResponse)
def save_onboarding_step(
    payload: OnboardingStepSave,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    profile = _get_or_create_profile(db, current_user)

    profile.onboarding_current_step = payload.step

    if payload.career_stage is not None:
        profile.career_stage = payload.career_stage
    if payload.primary_goals is not None:
        profile.primary_goals = payload.primary_goals
    if payload.education_level is not None:
        profile.education_level = payload.education_level
    if payload.specialization is not None:
        profile.specialization = payload.specialization
    if payload.graduation_year is not None:
        profile.graduation_year = payload.graduation_year
    if payload.college is not None:
        profile.college = payload.college
    if payload.experience_level is not None:
        profile.experience_level = payload.experience_level
    if payload.target_role is not None:
        profile.target_role = payload.target_role
    if payload.is_exploring_roles is not None:
        profile.is_exploring_roles = payload.is_exploring_roles

    if payload.skills is not None:
        _sync_user_skills(db, current_user, payload.skills, source="onboarding")

    db.commit()
    db.refresh(profile)

    logger.info("Saved onboarding step %s for user_id=%s", payload.step, current_user.id)
    return _build_profile_response(db, profile, current_user)


# ---------------------------------------------------
# COMPLETE ONBOARDING
# ---------------------------------------------------

@router.post("/complete", response_model=UserCareerProfileResponse)
def complete_onboarding(
    payload: OnboardingCompleteRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    profile = _get_or_create_profile(db, current_user)

    if payload.career_stage is not None:
        profile.career_stage = payload.career_stage
    if payload.primary_goals is not None:
        profile.primary_goals = payload.primary_goals
    if payload.education_level is not None:
        profile.education_level = payload.education_level
    if payload.specialization is not None:
        profile.specialization = payload.specialization
    if payload.graduation_year is not None:
        profile.graduation_year = payload.graduation_year
    if payload.college is not None:
        profile.college = payload.college
    if payload.experience_level is not None:
        profile.experience_level = payload.experience_level
    if payload.target_role is not None:
        profile.target_role = payload.target_role
    if payload.is_exploring_roles is not None:
        profile.is_exploring_roles = payload.is_exploring_roles

    if payload.skills:
        _sync_user_skills(db, current_user, payload.skills, source="onboarding")

    profile.onboarding_completed = True
    profile.onboarding_current_step = 8

    # Sync target role with UserCareerState if provided
    if profile.target_role:
        career_state = (
            db.query(models.UserCareerState)
            .filter(models.UserCareerState.user_id == current_user.id)
            .first()
        )
        if not career_state:
            career_state = models.UserCareerState(
                user_id=current_user.id,
                best_role=profile.target_role,
                score=70.0,
                confidence="High" if not profile.is_exploring_roles else "Exploring",
            )
            db.add(career_state)
        else:
            career_state.best_role = profile.target_role
            career_state.confidence = "High" if not profile.is_exploring_roles else "Exploring"

    db.commit()
    db.refresh(profile)

    logger.info("Onboarding successfully completed for user_id=%s", current_user.id)
    return _build_profile_response(db, profile, current_user)
