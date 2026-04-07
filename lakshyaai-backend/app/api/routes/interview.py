import logging

from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import get_current_user
from app.db import models
from app.db.schemas import (
    InterviewNextRequest,
    InterviewNextResponse,
    InterviewReportResponse,
    InterviewStartRequest,
    InterviewStartResponse,
)
from app.services.interview.session_manager import (
    get_interview_report,
    next_interview_step,
    start_interview,
)

router = APIRouter(prefix="/interview", tags=["Interview"])
logger = logging.getLogger("lakshyaai.interview")


@router.post("/start", response_model=InterviewStartResponse)
def start_interview_session(
    request: InterviewStartRequest,
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
        return start_interview(
            role=request.role,
            difficulty=request.difficulty,
            mode=request.mode,
            user_id=str(current_user.id),
        )
    except Exception as exc:
        logger.exception("Interview start failed user_id=%s", current_user.id)
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/next", response_model=InterviewNextResponse)
def next_interview_question(
    request: InterviewNextRequest,
    current_user: models.User = Depends(get_current_user),
):
    try:
        logger.info("Interview next user_id=%s session_id=%s", current_user.id, request.session_id)
        return next_interview_step(
            session_id=request.session_id,
            answer=request.answer,
        )
    except Exception as exc:
        logger.exception("Interview next failed user_id=%s session_id=%s", current_user.id, request.session_id)
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/report/{session_id}", response_model=InterviewReportResponse)
def interview_report(
    session_id: str,
    current_user: models.User = Depends(get_current_user),
):
    try:
        logger.info("Interview report user_id=%s session_id=%s", current_user.id, session_id)
        return get_interview_report(session_id)
    except Exception as exc:
        logger.exception("Interview report failed user_id=%s session_id=%s", current_user.id, session_id)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
