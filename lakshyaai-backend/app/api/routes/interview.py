import logging
from uuid import UUID
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db import models
from app.db.database import get_db
from app.db.schemas import (
    InterviewNextRequest,
    InterviewNextResponse,
    InterviewReportResponse,
    InterviewSessionDetailResponse,
    InterviewSessionListItem,
    InterviewStartRequest,
    InterviewStartResponse,
)
from app.services.interview.session_manager import InterviewService

router = APIRouter(prefix="/interview", tags=["Interview"])
logger = logging.getLogger("lakshyaai.interview")


@router.post("/start", response_model=InterviewStartResponse)
def start_interview_session(
    request: InterviewStartRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        logger.info(
            "Interview start user_id=%s role=%s difficulty=%s mode=%s",
            current_user.id,
            request.role,
            request.difficulty,
            request.mode,
        )
        return InterviewService.start_interview(
            db,
            user=current_user,
            role=request.role,
            difficulty=request.difficulty,
            mode=request.mode,
        )
    except Exception as exc:
        logger.exception("Interview start failed user_id=%s", current_user.id)
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/next", response_model=InterviewNextResponse)
def next_interview_question(
    request: InterviewNextRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        logger.info("Interview next user_id=%s session_id=%s", current_user.id, request.session_id)
        return InterviewService.next_interview_step(
            db,
            user=current_user,
            session_id=request.session_id,
            answer=request.answer,
        )
    except Exception as exc:
        logger.exception("Interview next failed user_id=%s session_id=%s", current_user.id, request.session_id)
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/report/{session_id}", response_model=InterviewReportResponse)
def interview_report(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        logger.info("Interview report user_id=%s session_id=%s", current_user.id, session_id)
        return InterviewService.get_interview_report(
            db,
            user=current_user,
            session_id=session_id,
        )
    except Exception as exc:
        logger.exception("Interview report failed user_id=%s session_id=%s", current_user.id, session_id)
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/sessions", response_model=List[InterviewSessionListItem])
def list_interview_sessions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        logger.info("List interview sessions user_id=%s", current_user.id)
        return InterviewService.list_user_interviews(db, current_user)
    except Exception as exc:
        logger.exception("List interview sessions failed user_id=%s", current_user.id)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/session/{session_id}", response_model=InterviewSessionDetailResponse)
def get_interview_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        logger.info("Get interview session user_id=%s session_id=%s", current_user.id, session_id)
        return InterviewService.get_interview_session(
            db,
            user=current_user,
            session_id=session_id,
        )
    except Exception as exc:
        logger.exception("Get interview session failed user_id=%s session_id=%s", current_user.id, session_id)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
