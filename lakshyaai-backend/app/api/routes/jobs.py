import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db import models
from app.db.database import get_db
from app.db.schemas import JobListingResponse, JobRecommendationResponse
from app.services.jobs.job_recommendation_engine import JobRecommendationEngine


logger = logging.getLogger("lakshyaai.api.jobs")

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get("/recommend/{resume_id}", response_model=JobRecommendationResponse)
def recommend_jobs(
    resume_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        logger.info("Job recommendation request resume_id=%s user_id=%s", resume_id, current_user.id)
        return JobRecommendationEngine.recommend_jobs(
            db,
            resume_id=resume_id,
            user_id=current_user.id,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Job recommendation failed resume_id=%s", resume_id)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/live", response_model=list[JobListingResponse])
def get_live_jobs(
    current_user: models.User = Depends(get_current_user),
):
    try:
        logger.info("Live jobs request user_id=%s", current_user.id)
        return JobRecommendationEngine.get_live_jobs()
    except Exception as exc:
        logger.exception("Live jobs fetch failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
