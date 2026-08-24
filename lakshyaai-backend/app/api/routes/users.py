from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_user
from app.db.schemas import UserResponse
from app.db import models

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    onboarding_completed = False
    onboarding_current_step = 1
    if current_user.career_profile:
        onboarding_completed = current_user.career_profile.onboarding_completed
        onboarding_current_step = current_user.career_profile.onboarding_current_step

    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role or "user",
        "is_suspended": bool(current_user.is_suspended),
        "is_email_verified": current_user.is_email_verified,
        "onboarding_completed": onboarding_completed,
        "onboarding_current_step": onboarding_current_step,
        "created_at": current_user.created_at,
    }