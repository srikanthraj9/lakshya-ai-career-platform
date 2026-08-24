import logging

from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import get_current_user
from app.db import models
from app.db.schemas import RoadmapRequest, RoadmapResponse
from app.services.roadmap.roadmap_engine import RoadmapEngine

from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.schemas import RoadmapProgressCreate, RoadmapProgressResponse

router = APIRouter(prefix="/roadmap", tags=["Roadmap"])
logger = logging.getLogger("lakshyaai.roadmap")


@router.post("/generate", response_model=RoadmapResponse)
def generate_roadmap(
    request: RoadmapRequest,
    current_user: models.User = Depends(get_current_user),
):
    try:
        logger.info(
            "Generating roadmap user_id=%s target_role=%s experience_level=%s",
            current_user.id,
            request.target_role,
            request.experience_level,
        )
        response = RoadmapEngine.generate(
            target_role=request.target_role,
            experience_level=request.experience_level,
        )
        logger.info(
            "Roadmap generated user_id=%s steps=%s",
            current_user.id,
            len(response.get("roadmap", [])),
        )
        return response
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Roadmap generation failed user_id=%s", current_user.id)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/progress", response_model=list[RoadmapProgressResponse])
def get_roadmap_progress(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    records = db.query(models.RoadmapProgress).filter(
        models.RoadmapProgress.user_id == current_user.id
    ).all()
    return records


@router.post("/progress", response_model=RoadmapProgressResponse)
def save_roadmap_progress(
    payload: RoadmapProgressCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Upsert: check if record exists for (user_id, role, experience_level)
    record = db.query(models.RoadmapProgress).filter(
        models.RoadmapProgress.user_id == current_user.id,
        models.RoadmapProgress.role == payload.role.strip(),
        models.RoadmapProgress.experience_level == payload.experience_level.strip(),
    ).first()

    if record:
        record.completed_steps = payload.completed_steps
    else:
        record = models.RoadmapProgress(
            user_id=current_user.id,
            role=payload.role.strip(),
            experience_level=payload.experience_level.strip(),
            completed_steps=payload.completed_steps,
        )
        db.add(record)

    db.commit()
    db.refresh(record)
    return record
