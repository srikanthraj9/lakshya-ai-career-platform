import logging

from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user
from app.db import models
from app.db.schemas import CopilotChatRequest, CopilotResponse
from app.services.copilot import CareerCopilotService


logger = logging.getLogger("lakshyaai.api.copilot")

router = APIRouter(prefix="/copilot", tags=["Copilot"])


@router.post("/chat", response_model=CopilotResponse)
def copilot_chat(
    request: CopilotChatRequest,
    current_user: models.User = Depends(get_current_user),
):
    logger.info("Copilot chat message received user_id=%s turns=%s", current_user.id, len(request.messages))
    print("[Copilot Route] turns:", len(request.messages))
    return CareerCopilotService.chat(messages=request.messages)
