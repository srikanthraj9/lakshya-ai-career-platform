from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.core.permissions import require_authenticated_user
from app.db.database import get_db
from app.db import models, schemas
from app.services.application_tracker_service import ApplicationTrackerService
from app.services.company_intelligence_service import CompanyIntelligenceService
from app.services.outcome_learning_service import OutcomeLearningService

router = APIRouter(prefix="/applications", tags=["applications"])


@router.get("", response_model=List[schemas.JobApplicationResponse])
def get_applications(
    stage: Optional[str] = None,
    status: Optional[str] = None,
    current_user: models.User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    apps = ApplicationTrackerService.get_applications(db, current_user.id, stage, status)
    return apps


@router.post("", response_model=schemas.JobApplicationResponse)
def create_application(
    payload: schemas.JobApplicationCreate,
    current_user: models.User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    return ApplicationTrackerService.create_application(db, current_user.id, payload)


@router.get("/stats", response_model=schemas.JobApplicationStats)
def get_application_stats(
    current_user: models.User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    return ApplicationTrackerService.calculate_stats(db, current_user.id)


@router.get("/company/{company_name}", response_model=schemas.CompanyIntelligenceResponse)
def get_company_intelligence(
    company_name: str,
    current_user: models.User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    return CompanyIntelligenceService.get_company_intelligence(db, company_name)


@router.get("/outcome-insights", response_model=List[schemas.OutcomeLearningInsightResponse])
def get_outcome_insights(
    current_user: models.User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    return OutcomeLearningService.analyze_and_generate_insights(db, current_user.id)


@router.get("/{application_id}", response_model=schemas.JobApplicationResponse)
def get_application_detail(
    application_id: UUID,
    current_user: models.User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    app = db.query(models.JobApplication).filter(
        models.JobApplication.id == application_id,
        models.JobApplication.user_id == current_user.id,
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


@router.patch("/{application_id}", response_model=schemas.JobApplicationResponse)
def update_application(
    application_id: UUID,
    payload: schemas.JobApplicationUpdate,
    current_user: models.User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    app = db.query(models.JobApplication).filter(
        models.JobApplication.id == application_id,
        models.JobApplication.user_id == current_user.id,
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    for field, val in payload.dict(exclude_unset=True).items():
        setattr(app, field, val)

    db.commit()
    db.refresh(app)
    return app


@router.post("/{application_id}/transition", response_model=schemas.JobApplicationResponse)
def transition_stage(
    application_id: UUID,
    payload: schemas.JobApplicationTransition,
    current_user: models.User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    app = ApplicationTrackerService.transition_stage(db, application_id, current_user.id, payload)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


@router.delete("/{application_id}")
def delete_application(
    application_id: UUID,
    current_user: models.User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    deleted = db.query(models.JobApplication).filter(
        models.JobApplication.id == application_id,
        models.JobApplication.user_id == current_user.id,
    ).delete(synchronize_session=False)

    if not deleted:
        raise HTTPException(status_code=404, detail="Application not found")

    db.commit()
    return {"message": "Application deleted successfully"}


@router.post("/{application_id}/debrief", response_model=schemas.InterviewDebriefResponse)
def create_interview_debrief(
    application_id: UUID,
    payload: schemas.InterviewDebriefCreate,
    current_user: models.User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    return OutcomeLearningService.create_debrief(db, current_user.id, application_id, payload)


@router.get("/{application_id}/debriefs", response_model=List[schemas.InterviewDebriefResponse])
def get_application_debriefs(
    application_id: UUID,
    current_user: models.User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
):
    app = db.query(models.JobApplication).filter(
        models.JobApplication.id == application_id,
        models.JobApplication.user_id == current_user.id,
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    debriefs = db.query(models.InterviewDebrief).filter(
        models.InterviewDebrief.application_id == application_id,
        models.InterviewDebrief.user_id == current_user.id,
    ).order_by(models.InterviewDebrief.created_at.desc()).all()
    return debriefs
