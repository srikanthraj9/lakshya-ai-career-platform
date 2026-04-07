import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db import models
from app.db.database import get_db
from app.db.schemas import CopilotChatRequest, CopilotResponse
from app.services.copilot import CareerCopilotService


logger = logging.getLogger("lakshyaai.api.copilot")

router = APIRouter(prefix="/copilot", tags=["Copilot"])


@router.post("/chat", response_model=CopilotResponse)
def copilot_chat(
    request: CopilotChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        if request.user_id and request.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="user_id does not match authenticated user")

        logger.info("Copilot chat message received user_id=%s resume_id=%s", current_user.id, request.resume_id)
        return CareerCopilotService.chat(
            db,
            user_id=current_user.id,
            resume_id=request.resume_id,
            message=request.message,
            context_profile=request.context_profile,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Copilot chat failed resume_id=%s", request.resume_id)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
