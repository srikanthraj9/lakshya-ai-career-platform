from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.db import models, schemas

router = APIRouter(prefix="/notifications", tags=["notifications"])

VALID_NOTIFICATION_TYPES = {
    "ats_score",
    "job_match",
    "roadmap_reminder",
    "interview_practice",
    "career_insight",
    "system",
}


@router.get("", response_model=List[schemas.NotificationResponse])
def get_notifications(
    limit: int = Query(default=30, ge=1, le=100),
    unread_only: bool = False,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    )

    if unread_only:
        query = query.filter(models.Notification.is_read == False)

    notifications = query.order_by(models.Notification.created_at.desc()).limit(limit).all()
    return notifications


@router.post("", response_model=schemas.NotificationResponse)
def create_notification(
    payload: schemas.NotificationCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.type not in VALID_NOTIFICATION_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid notification type. Must be one of: {', '.join(VALID_NOTIFICATION_TYPES)}",
        )

    # If client_event_id provided, check idempotency
    if payload.client_event_id:
        existing = db.query(models.Notification).filter(
            models.Notification.user_id == current_user.id,
            models.Notification.client_event_id == payload.client_event_id,
        ).first()
        if existing:
            return existing

    notification = models.Notification(
        user_id=current_user.id,
        client_event_id=payload.client_event_id,
        type=payload.type,
        title=payload.title,
        message=payload.message,
        action_url=payload.action_url,
        action_text=payload.action_text,
        is_read=False,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


@router.patch("/{notification_id}/read", response_model=schemas.NotificationResponse)
def mark_notification_read(
    notification_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == current_user.id,
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification


@router.post("/read-all")
def mark_all_notifications_read(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False,
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"message": "All notifications marked as read"}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deleted = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == current_user.id,
    ).delete(synchronize_session=False)

    if not deleted:
        raise HTTPException(status_code=404, detail="Notification not found")

    db.commit()
    return {"message": "Notification deleted successfully"}


@router.delete("")
def clear_all_notifications(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    ).delete(synchronize_session=False)
    db.commit()
    return {"message": "All notifications cleared successfully"}
