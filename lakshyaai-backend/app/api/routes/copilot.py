import logging
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db import models
from app.db.database import get_db
from app.db.schemas import (
    CopilotChatRequest,
    CopilotConversationDetailResponse,
    CopilotConversationResponse,
    CopilotResponse,
)
from app.services.copilot import CareerCopilotService

logger = logging.getLogger("lakshyaai.api.copilot")
router = APIRouter(prefix="/copilot", tags=["Copilot"])


@router.get("/conversations", response_model=List[CopilotConversationResponse])
def list_conversations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        conversations = (
            db.query(models.CopilotConversation)
            .filter(models.CopilotConversation.user_id == current_user.id)
            .order_by(models.CopilotConversation.updated_at.desc())
            .all()
        )
        return conversations
    except Exception as exc:
        logger.exception("Failed to list copilot conversations user_id=%s", current_user.id)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/conversations", response_model=CopilotConversationResponse)
def create_conversation(
    title: str = "Career Advice",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        conversation = models.CopilotConversation(
            user_id=current_user.id,
            title=title.strip() or "Career Advice",
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        return conversation
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to create copilot conversation user_id=%s", current_user.id)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/conversations/{conversation_id}", response_model=CopilotConversationDetailResponse)
def get_conversation(
    conversation_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    conversation = (
        db.query(models.CopilotConversation)
        .filter(
            models.CopilotConversation.id == conversation_id,
            models.CopilotConversation.user_id == current_user.id,
        )
        .first()
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return conversation


@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    conversation = (
        db.query(models.CopilotConversation)
        .filter(
            models.CopilotConversation.id == conversation_id,
            models.CopilotConversation.user_id == current_user.id,
        )
        .first()
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    try:
        db.delete(conversation)
        db.commit()
        return {"message": "Conversation deleted successfully"}
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to delete conversation id=%s", conversation_id)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/chat", response_model=CopilotResponse)
def copilot_chat(
    request: CopilotChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    logger.info("Copilot chat message received user_id=%s turns=%s", current_user.id, len(request.messages))

    # Find or create conversation
    conversation = None
    if request.conversation_id:
        conversation = (
            db.query(models.CopilotConversation)
            .filter(
                models.CopilotConversation.id == request.conversation_id,
                models.CopilotConversation.user_id == current_user.id,
            )
            .first()
        )
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

    if not conversation:
        # Generate initial title from first message
        first_user_msg = next((m.content for m in request.messages if m.role == "user"), "Career Advice")
        title = (first_user_msg[:40] + "...") if len(first_user_msg) > 40 else first_user_msg
        conversation = models.CopilotConversation(
            user_id=current_user.id,
            title=title or "Career Advice",
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # Get latest user message to persist
    latest_user_msg = next((m.content for m in reversed(request.messages) if m.role == "user"), "")
    if latest_user_msg:
        user_db_msg = models.CopilotMessage(
            conversation_id=conversation.id,
            role="user",
            content=latest_user_msg,
        )
        db.add(user_db_msg)

    # Get AI response
    try:
        reply_dict = CareerCopilotService.chat(messages=request.messages)
        reply = reply_dict.get("reply", "")
    except Exception as exc:
        logger.warning("Copilot chat using fallback due to: %s", exc)
        reply = (
            "I am LakshyaAI Career Copilot. I'm here to help you optimize your resume, "
            "prepare for technical interviews, and benchmark your skills for your target role."
        )

    # Persist assistant reply
    assistant_db_msg = models.CopilotMessage(
        conversation_id=conversation.id,
        role="assistant",
        content=reply,
    )
    db.add(assistant_db_msg)
    db.commit()

    return {
        "reply": reply,
        "conversation_id": conversation.id,
    }
