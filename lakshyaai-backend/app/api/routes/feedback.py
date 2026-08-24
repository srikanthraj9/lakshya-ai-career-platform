from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import UserFeedback, User
from app.db.schemas import UserFeedbackCreate, UserFeedbackResponse
from app.core.dependencies import get_optional_current_user
from app.core.permissions import require_admin

router = APIRouter(prefix="/feedback", tags=["Feedback"])


@router.post("", response_model=UserFeedbackResponse, status_code=status.HTTP_201_CREATED)
def submit_feedback(
    payload: UserFeedbackCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    feedback = UserFeedback(
        user_id=current_user.id if current_user else None,
        feedback_type=payload.feedback_type,
        module=payload.module,
        message=payload.message,
        metadata_json=payload.metadata_json or {},
        status="new",
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback


@router.get("", response_model=List[UserFeedbackResponse])
def get_all_feedback(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    return db.query(UserFeedback).order_by(UserFeedback.created_at.desc()).limit(100).all()
