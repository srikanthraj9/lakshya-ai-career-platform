from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.db import models, schemas

router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("", response_model=List[schemas.CareerActivityResponse])
def get_activities(
    limit: int = Query(default=50, ge=1, le=100),
    activity_type: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(models.CareerActivity).filter(
        models.CareerActivity.user_id == current_user.id
    )

    if activity_type:
        query = query.filter(models.CareerActivity.activity_type == activity_type)

    activities = query.order_by(models.CareerActivity.created_at.desc()).limit(limit).all()
    return activities


@router.post("", response_model=schemas.CareerActivityResponse)
def record_activity(
    payload: schemas.CareerActivityCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # If client_event_id provided, check if already recorded (idempotency)
    if payload.client_event_id:
        existing = db.query(models.CareerActivity).filter(
            models.CareerActivity.user_id == current_user.id,
            models.CareerActivity.client_event_id == payload.client_event_id,
        ).first()
        if existing:
            return existing

    activity = models.CareerActivity(
        user_id=current_user.id,
        client_event_id=payload.client_event_id,
        activity_type=payload.activity_type,
        title=payload.title,
        description=payload.description,
        activity_metadata=payload.activity_metadata,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


@router.delete("")
def clear_activities(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(models.CareerActivity).filter(
        models.CareerActivity.user_id == current_user.id
    ).delete(synchronize_session=False)
    db.commit()
    return {"message": "Activities cleared successfully"}
